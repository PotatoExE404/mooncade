import { Action, pressed } from "./input";
import { createRng, hashInts, type Rng } from "./rng";

export const FLAP = {
  W: 180,
  H: 320,
  GROUND: 296,
  X: 52,
  HIT_W: 12,
  HIT_H: 9,
  GRAVITY: 54,
  THRUST: 880,
  MAX_FALL: 1400,
  CANDLE_W: 22,
  WICK_W: 4,
  WICK_LEN: 10,
  FIRST_X: 230,
  TIME: 60 * 60,
  CRASH_PENALTY: 3 * 60,
  CRASH_TICKS: 36,
  INVULN_TICKS: 90,
  PER_LEVEL: 10,
  MAX_LEVEL: 20,
  MAX_CLOCK: 99 * 60,
  RUN_CAP: 10 * 60 * 60,
  PICKUP_R: 7,
  TIME_PICKUP: 5 * 60,
  SLOW_TICKS: 4 * 60,
  DOUBLE_TICKS: 6 * 60,
  SHIELD_SAFE: 50,
} as const;

export type FlapPickup = "time" | "shield" | "slow" | "double";
export const FLAP_PICKUPS: FlapPickup[] = ["time", "shield", "slow", "double"];

export interface Pickup {
  x: number;
  y: number;
  kind: FlapPickup;
  taken: boolean;
}

export const candleBonus = (level: number) => Math.max(0, 40 - level * 4);

export const levelBonus = (level: number) => Math.max(120, 360 - (level - 2) * 30);

const SUB = 256;

export interface Candle {
  x: number;
  gapY: number;
  gap: number;
  bobAmp: number;
  bobPhase: number;
  green: boolean;
  passed: boolean;
}

export interface FlapState {
  tick: number;
  started: boolean;
  dead: boolean;
  timeLeft: number;
  crash: number;
  invuln: number;
  crashes: number;
  level: number;
  cleared: number;
  pickups: Pickup[];
  shield: boolean;
  safe: number;
  slow: number;
  double: number;
  bonusTotal: number;
  y: number;
  vy: number;
  prevY: number;
  scroll: number;
  speed: number;
  candles: Candle[];
  spawned: number;
  score: number;
  prevInput: number;
  rng: Rng;

  events: {
    flap: boolean;
    pass: boolean;
    die: boolean;
    respawn: boolean;
    level: boolean;
    timeUp: boolean;
    pickup: FlapPickup | null;
    shieldPop: boolean;

    bonus: number;
  };
}

const levelOf = (candles: number) => Math.min(FLAP.MAX_LEVEL, Math.floor(candles / FLAP.PER_LEVEL) + 1);
const speedFor = (level: number) => Math.min(500, 300 + (level - 1) * 16);

export function createFlap(seed: number): FlapState {
  const s: FlapState = {
    tick: 0,
    started: false,
    dead: false,
    timeLeft: FLAP.TIME,
    crash: 0,
    invuln: 0,
    crashes: 0,
    level: 1,
    cleared: 0,
    pickups: [],
    shield: false,
    safe: 0,
    slow: 0,
    double: 0,
    bonusTotal: 0,
    y: 140 * SUB,
    vy: 0,
    prevY: 140 * SUB,
    scroll: 0,
    speed: speedFor(1),
    candles: [],
    spawned: 0,
    score: 0,
    prevInput: 0,
    rng: createRng(seed),
    events: { flap: false, pass: false, die: false, respawn: false, level: false, timeUp: false, pickup: null, shieldPop: false, bonus: 0 },
  };
  for (let i = 0; i < 4; i++) spawnCandle(s);
  return s;
}

function spawnCandle(s: FlapState) {
  const n = s.spawned++;
  const lvl = levelOf(n);
  const breather = n % FLAP.PER_LEVEL === FLAP.PER_LEVEL - 1;
  const gap = Math.max(54, 86 - (lvl - 1) * 3) + (breather ? 8 : 0);
  const spacing = Math.max(78, 108 - (lvl - 1) * 3) + (breather ? 10 : 0);
  const lastX = s.candles.length ? s.candles[s.candles.length - 1].x : FLAP.FIRST_X * SUB - spacing * SUB;
  const lastGapY = s.candles.length ? s.candles[s.candles.length - 1].gapY : 150;

  const maxShift = 46 + lvl * 3;
  const minY = 40 + (gap >> 1);
  const maxY = FLAP.GROUND - 24 - (gap >> 1);
  const lo = Math.max(minY, lastGapY - maxShift);
  const hi = Math.min(maxY, lastGapY + maxShift);
  const gapY = s.rng.int(lo, hi);
  const bobAmp = !breather && lvl >= 3 && s.rng.chance(Math.min(lvl - 2, 4), 8) ? s.rng.int(5, 6 + lvl) : 0;
  const x = lastX + spacing * SUB;
  s.candles.push({ x, gapY, gap, bobAmp, bobPhase: s.rng.int(0, 255), green: s.rng.chance(1, 2), passed: false });

  if (n >= 2 && n % 5 === 2 && s.rng.chance(4, 5)) {
    const kind = FLAP_PICKUPS[s.rng.int(0, FLAP_PICKUPS.length - 1)];
    const py = Math.max(50, Math.min(FLAP.GROUND - 40, gapY + s.rng.int(-30, 30)));
    s.pickups.push({ x: x + ((FLAP.CANDLE_W + spacing) >> 1) * SUB, y: py, kind, taken: false });
  }
}

const SIN: number[] = [];
for (let i = 0; i < 256; i++) SIN.push(Math.round(Math.sin((i / 256) * Math.PI * 2) * 1024));

export function candleGapY(c: Candle, tick: number): number {
  if (!c.bobAmp) return c.gapY;
  return c.gapY + ((c.bobAmp * SIN[(c.bobPhase + (tick >> 1)) & 255]) >> 10);
}

function overlaps(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function addTime(s: FlapState, ticks: number) {
  if (ticks <= 0) return;
  const before = s.timeLeft;
  s.timeLeft = Math.min(FLAP.MAX_CLOCK, s.timeLeft + ticks);
  s.bonusTotal += s.timeLeft - before;
  s.events.bonus += s.timeLeft - before;
}

function crash(s: FlapState) {
  if (s.shield) {
    s.shield = false;
    s.safe = FLAP.SHIELD_SAFE;
    s.vy = -FLAP.THRUST >> 1;
    s.events.shieldPop = true;
    return;
  }
  s.crash = FLAP.CRASH_TICKS;
  s.crashes++;
  s.timeLeft = Math.max(0, s.timeLeft - FLAP.CRASH_PENALTY);
  s.events.die = true;
}

function respawn(s: FlapState) {
  const next = s.candles.find((c) => (c.x >> 8) + FLAP.CANDLE_W >= FLAP.X) ?? s.candles[0];
  const gy = next ? candleGapY(next, s.tick) : 150;
  s.y = (gy - (FLAP.HIT_H >> 1)) * SUB;
  s.prevY = s.y;
  s.vy = -FLAP.THRUST >> 1;
  s.invuln = FLAP.INVULN_TICKS;
  s.events.respawn = true;
}

export function stepFlap(s: FlapState, input: number): void {
  const ev = s.events;
  ev.flap = ev.pass = ev.die = ev.respawn = ev.level = ev.timeUp = ev.shieldPop = false;
  ev.pickup = null;
  ev.bonus = 0;
  const tap = pressed(input, s.prevInput, Action.Jump) || pressed(input, s.prevInput, Action.Up) || pressed(input, s.prevInput, Action.Act);
  s.prevInput = input;
  s.prevY = s.y;
  if (s.dead) return;
  s.tick++;

  if (!s.started) {
    if (!tap) return;
    s.started = true;
  }

  if (--s.timeLeft <= 0 || s.tick >= FLAP.RUN_CAP) {
    s.timeLeft = 0;
    s.dead = true;
    ev.timeUp = true;
    return;
  }

  if (s.crash > 0) {
    if (--s.crash === 0) respawn(s);
    return;
  }
  if (s.invuln > 0) s.invuln--;
  if (s.safe > 0) s.safe--;
  if (s.slow > 0) s.slow--;
  if (s.double > 0) s.double--;

  if (tap) {
    s.vy = -FLAP.THRUST;
    ev.flap = true;
  }
  s.vy = Math.min(s.vy + FLAP.GRAVITY, FLAP.MAX_FALL);
  s.y += s.vy;
  if (s.y < 0) {
    s.y = 0;
    s.vy = 0;
  }

  s.speed = s.slow > 0 ? (speedFor(s.level) * 5) >> 3 : speedFor(s.level);
  s.scroll += s.speed;
  for (const c of s.candles) c.x -= s.speed;
  for (const p of s.pickups) p.x -= s.speed;
  while (s.candles.length && s.candles[0].x + FLAP.CANDLE_W * SUB < 0) s.candles.shift();
  while (s.pickups.length && s.pickups[0].x < -8 * SUB) s.pickups.shift();
  while (s.candles.length < 5) spawnCandle(s);

  const px = FLAP.X;
  const py = s.y >> 8;
  const cx0 = px + (FLAP.HIT_W >> 1), cy0 = py + (FLAP.HIT_H >> 1);
  for (const p of s.pickups) {
    if (p.taken) continue;
    const dx = (p.x >> 8) - cx0, dy = p.y - cy0;
    if (Math.abs(dx) > FLAP.PICKUP_R + 6 || Math.abs(dy) > FLAP.PICKUP_R + 4) continue;
    p.taken = true;
    ev.pickup = p.kind;
    if (p.kind === "time") addTime(s, FLAP.TIME_PICKUP);
    else if (p.kind === "shield") s.shield = true;
    else if (p.kind === "slow") s.slow = FLAP.SLOW_TICKS;
    else s.double = FLAP.DOUBLE_TICKS;
  }
  for (const c of s.candles) {
    const cx = c.x >> 8;
    if (cx > px + FLAP.HIT_W || cx + FLAP.CANDLE_W < px) {
      if (!c.passed && cx + FLAP.CANDLE_W < px) {
        c.passed = true;
        if (s.invuln > 0) continue;
        s.cleared++;
        s.score += s.double > 0 ? 2 : 1;
        ev.pass = true;
        addTime(s, candleBonus(s.level));
        const lvl = levelOf(s.cleared);
        if (lvl > s.level) {
          s.level = lvl;
          ev.level = true;
          addTime(s, levelBonus(lvl));
        }
      }
      continue;
    }
    if (s.invuln > 0 || s.safe > 0) continue;
    const g = candleGapY(c, s.tick);
    const top = g - (c.gap >> 1);
    const bottom = g + (c.gap >> 1);
    const wx = cx + ((FLAP.CANDLE_W - FLAP.WICK_W) >> 1);
    const hit =
      overlaps(px, py, FLAP.HIT_W, FLAP.HIT_H, cx, 0, FLAP.CANDLE_W, top - FLAP.WICK_LEN) ||
      overlaps(px, py, FLAP.HIT_W, FLAP.HIT_H, wx, top - FLAP.WICK_LEN, FLAP.WICK_W, FLAP.WICK_LEN) ||
      overlaps(px, py, FLAP.HIT_W, FLAP.HIT_H, cx, bottom + FLAP.WICK_LEN, FLAP.CANDLE_W, FLAP.GROUND - bottom - FLAP.WICK_LEN) ||
      overlaps(px, py, FLAP.HIT_W, FLAP.HIT_H, wx, bottom, FLAP.WICK_W, FLAP.WICK_LEN);
    if (hit) return crash(s);
  }
  if (py + FLAP.HIT_H >= FLAP.GROUND) {
    s.y = (FLAP.GROUND - FLAP.HIT_H) * SUB;
    if (s.invuln > 0 || s.safe > 0) s.vy = -FLAP.THRUST;
    else {
      crash(s);
      if (s.safe > 0) s.vy = -FLAP.THRUST;
    }
  }
}

export function hashFlap(s: FlapState): string {
  return hashInts([s.tick, s.y, s.vy, s.score, s.scroll, s.rng.state, s.dead ? 1 : 0, s.timeLeft, s.crashes, s.cleared, s.shield ? 1 : 0, s.slow, s.double]);
}
