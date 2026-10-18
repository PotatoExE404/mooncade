import { Action } from "./input";

export const SUB = 256;

export interface TuningInput {
  tilePx: number;
  jumpHeightPx: number;
  apexTicks: number;
  fallMultiplier: number;
  maxFallMultiplier: number;
  runPxPerTick: number;
  accelTicks: number;
  decelTicks: number;
  airControl: number;
  coyoteTicks: number;
  bufferTicks: number;
  releaseCut: number;
  apexHangFraction: number;
  cornerPx: number;
}

export const DEFAULT_TUNING: TuningInput = {
  tilePx: 16,
  jumpHeightPx: 52,
  apexTicks: 24,
  fallMultiplier: 2,
  maxFallMultiplier: 1.5,
  runPxPerTick: 2,
  accelTicks: 5,
  decelTicks: 3,
  airControl: 0.7,
  coyoteTicks: 6,
  bufferTicks: 8,
  releaseCut: 0.45,
  apexHangFraction: 0.12,
  cornerPx: 3,
};

export type Tuning = ReturnType<typeof compileTuning>;

export function compileTuning(t: TuningInput = DEFAULT_TUNING) {
  const h = t.jumpHeightPx * SUB;
  const gravity = Math.round((2 * h) / (t.apexTicks * t.apexTicks));
  const jumpSpeed = Math.round((2 * h) / t.apexTicks);
  const run = Math.round(t.runPxPerTick * SUB);
  return {
    tile: t.tilePx,
    gravity,
    fallGravity: Math.round(gravity * t.fallMultiplier),
    jumpSpeed,
    maxFall: Math.round(jumpSpeed * t.maxFallMultiplier),
    run,
    accel: Math.max(1, Math.round(run / t.accelTicks)),
    decel: Math.max(1, Math.round(run / t.decelTicks)),
    airAccel: Math.max(1, Math.round((run / t.accelTicks) * t.airControl)),
    airDecel: Math.max(1, Math.round((run / t.decelTicks) * t.airControl)),
    coyote: t.coyoteTicks,
    buffer: t.bufferTicks,
    releaseCut: Math.round(t.releaseCut * 256),
    apexBand: Math.round(jumpSpeed * t.apexHangFraction),
    corner: t.cornerPx,
  };
}

export interface Level {
  widthTiles: number;
  heightTiles: number;

  tileAt(tx: number, ty: number): number;
}

export interface Body {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  grounded: boolean;
  coyote: number;
  buffer: number;
  jumping: boolean;
  facing: 1 | -1;
}

export interface StepEvents {
  jumped: boolean;
  landed: boolean;
  landingSpeed: number;
  bonked: boolean;
  fellOut: boolean;
}

export function createBody(xPx: number, yPx: number, w = 10, h = 14): Body {
  return { x: xPx * SUB, y: yPx * SUB, prevX: xPx * SUB, prevY: yPx * SUB, vx: 0, vy: 0, w, h, grounded: false, coyote: 0, buffer: 0, jumping: false, facing: 1 };
}

const px = (sub: number) => sub >> 8;

function overlaps(level: Level, t: number, x: number, y: number, w: number, h: number, movingDown: boolean, prevBottom: number, dropThrough: boolean) {
  const x0 = Math.floor(x / t), x1 = Math.floor((x + w - 1) / t);
  const y0 = Math.floor(y / t), y1 = Math.floor((y + h - 1) / t);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (ty >= level.heightTiles) continue;
      const kind = tx < 0 || ty < 0 || tx >= level.widthTiles ? 1 : level.tileAt(tx, ty);
      if (kind === 1) return true;

      if (kind === 2 && movingDown && !dropThrough && prevBottom === ty * t) return true;
    }
  }
  return false;
}

function moveX(b: Body, level: Level, t: number, amount: number): boolean {
  const target = b.x + amount;
  let p = px(b.x);
  const goal = px(target);
  const dir = Math.sign(goal - p);
  const y = px(b.y);
  while (p !== goal) {
    if (overlaps(level, t, p + dir, y, b.w, b.h, false, 0, false)) {
      b.x = dir > 0 ? p * SUB + (SUB - 1) : p * SUB;
      return true;
    }
    p += dir;
  }
  b.x = target;
  return false;
}

function moveY(b: Body, level: Level, t: number, amount: number, dropThrough: boolean, corner: number): boolean {
  const target = b.y + amount;
  let p = px(b.y);
  const goal = px(target);
  const dir = Math.sign(goal - p);
  while (p !== goal) {
    const x = px(b.x);
    if (overlaps(level, t, x, p + dir, b.w, b.h, dir > 0, p + b.h, dropThrough)) {
      if (dir < 0) {
        let nudged = false;
        for (let i = 1; i <= corner && !nudged; i++) {
          for (const s of [i, -i]) {
            if (!overlaps(level, t, x + s, p - 1, b.w, b.h, false, 0, false) && !overlaps(level, t, x + s, p, b.w, b.h, false, 0, false)) {
              b.x += s * SUB;
              nudged = true;
              break;
            }
          }
        }
        if (nudged) {
          p += dir;
          continue;
        }
      }
      b.y = dir > 0 ? p * SUB + (SUB - 1) : p * SUB;
      return true;
    }
    p += dir;
  }
  b.y = target;
  return false;
}

export function stepPlayer(b: Body, input: number, prev: number, level: Level, k: Tuning): StepEvents {
  const events: StepEvents = { jumped: false, landed: false, landingSpeed: 0, bonked: false, fellOut: false };
  b.prevX = b.x;
  b.prevY = b.y;
  const left = (input & Action.Left) !== 0;
  const right = (input & Action.Right) !== 0;

  const JUMP = Action.Jump | Action.Up;
  const held = (input & JUMP) !== 0;
  const pressed = held && (prev & JUMP) === 0;
  const down = (input & Action.Down) !== 0;
  const dropThrough = down;

  const dir = (right ? 1 : 0) - (left ? 1 : 0);
  if (dir !== 0) b.facing = dir as 1 | -1;
  const target = dir * k.run;
  const rate = b.grounded ? (dir !== 0 ? k.accel : k.decel) : dir !== 0 ? k.airAccel : k.airDecel;
  if (b.vx < target) b.vx = Math.min(b.vx + rate, target);
  else if (b.vx > target) b.vx = Math.max(b.vx - rate, target);

  if (dropThrough && b.grounded && !overlaps(level, k.tile, px(b.x), px(b.y) + 1, b.w, b.h, false, 0, false)) {
    b.y += SUB;
    b.grounded = false;
    b.coyote = 0;
    b.buffer = 0;
    return events;
  }

  b.coyote = b.grounded ? k.coyote : Math.max(0, b.coyote - 1);
  b.buffer = pressed ? k.buffer : Math.max(0, b.buffer - 1);
  if (b.buffer > 0 && b.coyote > 0) {
    b.vy = -k.jumpSpeed;
    b.buffer = 0;
    b.coyote = 0;
    b.jumping = true;
    b.grounded = false;
    events.jumped = true;
  }

  if (b.jumping && !held && b.vy < 0) {
    b.vy = (b.vy * k.releaseCut) >> 8;
    b.jumping = false;
  }
  if (b.vy >= 0) b.jumping = false;

  let g = b.vy > 0 ? k.fallGravity : k.gravity;
  if (held && Math.abs(b.vy) < k.apexBand) g = k.gravity >> 1;
  if (down && b.vy > 0) g += g >> 1;
  b.vy = Math.min(b.vy + g, down ? k.maxFall + (k.maxFall >> 1) : k.maxFall);

  const wasGrounded = b.grounded;
  const fallSpeed = b.vy;
  if (moveX(b, level, k.tile, b.vx)) b.vx = 0;
  if (moveY(b, level, k.tile, b.vy, dropThrough, k.corner)) {
    if (b.vy < 0) events.bonked = true;
    b.vy = 0;
  }

  const x = px(b.x), y = px(b.y);
  b.grounded = b.vy >= 0 && overlaps(level, k.tile, x, y + 1, b.w, b.h, true, y + b.h, dropThrough);
  events.fellOut = y > level.heightTiles * k.tile;
  if (b.grounded && !wasGrounded) {
    events.landed = true;
    events.landingSpeed = fallSpeed;
  }
  return events;
}
