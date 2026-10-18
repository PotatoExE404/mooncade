import { Action, pressed } from "./input";
import { createRng, hashInts, type Rng } from "./rng";

export const M = 256;

export const RUN = {
  LANES: 3,
  START_SPEED: 38,
  MAX_SPEED: 86,
  JUMP_V: 18,
  GRAVITY: 1,
  FAST_DROP: 4,
  LOW_CLEAR: 56,
  SLIDE_TICKS: 40,
  BUFFER: 8,
  STUMBLE_WINDOW: 360,
  LOOKAHEAD: 140 * M,
  TIME: 90 * 60,
  CRASH_PENALTY: 4 * 60,
  CAUGHT_PENALTY: 6 * 60,
  CRASH_TICKS: 40,
  INVULN_TICKS: 60,
  LEVEL_M: 300,
  MAX_LEVEL: 20,
  MAX_CLOCK: 99 * 60,
  RUN_CAP: 10 * 60 * 60,
  TIME_PICKUP: 5 * 60,
  MAGNET_TICKS: 6 * 60,
  DOUBLE_TICKS: 6 * 60,
} as const;

export type RunPickup = "time" | "shield" | "magnet" | "double";
export const RUN_PICKUPS: RunPickup[] = ["time", "shield", "magnet", "double"];

export const runLevelBonus = (level: number) => Math.max(240, 480 - (level - 2) * 30);

const levelAt = (z: number) => Math.min(RUN.MAX_LEVEL, Math.floor(z / (RUN.LEVEL_M * M)) + 1);

const speedAt = (z: number) => {
  const lvl = levelAt(z);
  return Math.min(104, 34 + (lvl - 1) * 7 + Math.floor((z % (RUN.LEVEL_M * M)) / (100 * M)));
};

export type ObstacleKind = "wall" | "low" | "high" | "hole" | "coin" | "power";

export interface Obstacle {
  z: number;
  len: number;
  lane: number;
  kind: ObstacleKind;
  power?: RunPickup;
  resolved: boolean;
}

export type RunDeath = "wall" | "hole" | "caught" | null;

export interface RunState {
  tick: number;
  started: boolean;
  dead: boolean;
  death: RunDeath;
  timeLeft: number;
  crash: number;
  invuln: number;
  crashes: number;
  level: number;
  z: number;
  speed: number;
  lane: number;
  prevLane: number;
  laneTick: number;
  h: number;
  vh: number;
  slide: number;
  jumpBuffer: number;
  stumble: number;
  slowdown: number;
  coins: number;
  shield: boolean;
  magnet: number;
  double: number;
  bonusTotal: number;
  obstacles: Obstacle[];
  nextZ: number;
  rows: number;
  prevInput: number;
  rng: Rng;
  events: {
    jump: boolean;
    slide: boolean;
    lane: boolean;
    coin: boolean;
    stumble: boolean;
    die: boolean;
    land: boolean;
    respawn: boolean;
    level: boolean;
    timeUp: boolean;
    pickup: RunPickup | null;
    shieldPop: boolean;

    bonus: number;
  };
}

export function createRun(seed: number): RunState {
  return {
    tick: 0,
    started: false,
    dead: false,
    death: null,
    timeLeft: RUN.TIME,
    crash: 0,
    invuln: 0,
    crashes: 0,
    level: 1,
    z: 0,
    speed: speedAt(0),
    lane: 1,
    prevLane: 1,
    laneTick: -100,
    h: 0,
    vh: 0,
    slide: 0,
    jumpBuffer: 0,
    stumble: 0,
    slowdown: 0,
    coins: 0,
    shield: false,
    magnet: 0,
    double: 0,
    bonusTotal: 0,
    obstacles: [],
    nextZ: 40 * M,
    rows: 0,
    prevInput: 0,
    rng: createRng(seed),
    events: { jump: false, slide: false, lane: false, coin: false, stumble: false, die: false, land: false, respawn: false, level: false, timeUp: false, pickup: null, shieldPop: false, bonus: 0 },
  };
}

export const runScore = (s: RunState) => Math.floor(s.z / M) + s.coins * 10;

function add(s: RunState, z: number, lane: number, kind: ObstacleKind, len = M) {
  s.obstacles.push({ z, len, lane, kind, resolved: false });
}

function coinLine(s: RunState, z: number, lane: number, count: number) {
  for (let i = 0; i < count; i++) add(s, z + i * ((3 * M) >> 1), lane, "coin", M >> 1);
}

function spawnRow(s: RunState) {
  const r = s.rng;
  const lvl = levelAt(s.nextZ);
  const tier = lvl <= 2 ? 0 : lvl <= 4 ? 1 : lvl <= 7 ? 2 : 3;
  const n = s.rows++;
  const z = s.nextZ;
  const free = r.int(0, 2);
  let pattern: number;
  if (n % 8 === 7) pattern = 0;
  else {
    const pool =
      tier === 0 ? [1, 1, 2, 3, 4] : tier === 1 ? [1, 2, 3, 4, 5, 6, 6] : tier === 2 ? [1, 3, 4, 5, 6, 6, 7, 7] : [3, 5, 6, 6, 7, 7, 7, 8];
    pattern = pool[r.int(0, pool.length - 1)];
  }
  if (n % 6 === 4 && pattern !== 0) {
    const power = RUN_PICKUPS[r.int(0, RUN_PICKUPS.length - 1)];
    s.obstacles.push({ z: z - 5 * M, len: M, lane: free, kind: "power", power, resolved: false });
  }
  switch (pattern) {
    case 0:
      coinLine(s, z, free, 10);
      break;
    case 1:
      for (let l = 0; l < 3; l++) if (l !== free) add(s, z, l, "wall", 2 * M);
      coinLine(s, z - 4 * M, free, 4);
      break;
    case 2:
      for (let l = 0; l < 3; l++) add(s, z, l, "low");
      break;
    case 3:
      add(s, z, (free + 1) % 3, "wall", 2 * M);
      add(s, z, (free + 2) % 3, "low");
      coinLine(s, z - 2 * M, free, 3);
      break;
    case 4:
      for (let l = 0; l < 3; l++) add(s, z, l, "high");
      break;
    case 5:
      for (let l = 0; l < 3; l++) add(s, z, l, "hole", (5 * M) >> 1);
      break;
    case 6:
      add(s, z, free, "high");
      for (let l = 0; l < 3; l++) if (l !== free) add(s, z, l, "wall", 2 * M);
      break;
    case 7: {
      for (let l = 0; l < 3; l++) if (l !== free) add(s, z, l, "wall", 2 * M);
      const free2 = (free + r.int(1, 2)) % 3;
      const z2 = z + 9 * M + s.speed * 30;
      for (let l = 0; l < 3; l++) if (l !== free2) add(s, z2, l, "wall", 2 * M);
      s.nextZ = z2;
      break;
    }
    case 8: {
      for (let l = 0; l < 3; l++) if (l !== free) add(s, z, l, "wall", 2 * M);
      add(s, z, free, "low");
      const z2 = z + 8 * M + s.speed * 28;
      for (let l = 0; l < 3; l++) add(s, z2, l, "high");
      s.nextZ = z2;
      break;
    }
  }

  const reactTicks = [64, 56, 48, 46][tier];
  s.nextZ += s.speed * reactTicks + (tier === 0 ? 10 : 7) * M;
}

function addTime(s: RunState, ticks: number) {
  const before = s.timeLeft;
  s.timeLeft = Math.min(RUN.MAX_CLOCK, s.timeLeft + ticks);
  s.bonusTotal += s.timeLeft - before;
  s.events.bonus += s.timeLeft - before;
}

function collectCoin(s: RunState, o: Obstacle) {
  o.resolved = true;
  s.coins += s.double > 0 ? 2 : 1;
  s.events.coin = true;
}

export function stepRun(s: RunState, input: number): void {
  const ev = s.events;
  ev.jump = ev.slide = ev.lane = ev.coin = ev.stumble = ev.die = ev.land = ev.respawn = ev.level = ev.timeUp = ev.shieldPop = false;
  ev.pickup = null;
  ev.bonus = 0;
  const prev = s.prevInput;
  s.prevInput = input;
  if (s.dead) return;
  const left = pressed(input, prev, Action.Left);
  const right = pressed(input, prev, Action.Right);
  const up = pressed(input, prev, Action.Up) || pressed(input, prev, Action.Jump);
  const down = pressed(input, prev, Action.Down);
  if (!s.started) {
    if (!(left || right || up || down)) return;
    s.started = true;
  }
  s.tick++;

  if (--s.timeLeft <= 0 || s.tick >= RUN.RUN_CAP) {
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
  if (s.magnet > 0) s.magnet--;
  if (s.double > 0) s.double--;

  if (left && s.lane > 0) {
    s.prevLane = s.lane;
    s.lane--;
    s.laneTick = s.tick;
    ev.lane = true;
  } else if (right && s.lane < 2) {
    s.prevLane = s.lane;
    s.lane++;
    s.laneTick = s.tick;
    ev.lane = true;
  }

  s.jumpBuffer = up ? RUN.BUFFER : Math.max(0, s.jumpBuffer - 1);
  const grounded = s.h === 0;
  if (s.jumpBuffer > 0 && grounded) {
    s.vh = RUN.JUMP_V;
    s.slide = 0;
    s.jumpBuffer = 0;
    ev.jump = true;
  }
  if (down) {
    if (grounded) {
      s.slide = RUN.SLIDE_TICKS;
      ev.slide = true;
    } else s.vh = Math.min(s.vh, -6);
  }
  if (s.h > 0 || s.vh > 0) {
    s.h += s.vh;
    s.vh -= s.vh < 0 && s.slide === 0 && down ? RUN.FAST_DROP : RUN.GRAVITY;
    if (s.h <= 0) {
      s.h = 0;
      s.vh = 0;
      ev.land = true;
      if (down || (prev & Action.Down && input & Action.Down)) {
        s.slide = RUN.SLIDE_TICKS;
        ev.slide = true;
      }
    }
  }
  if (s.slide > 0) s.slide--;

  const target = speedAt(s.z);
  s.speed = s.slowdown > 0 ? (target * 7) >> 3 : target;
  if (s.slowdown > 0) s.slowdown--;
  s.z += s.speed;
  if (s.stumble > 0 && ++s.stumble > RUN.STUMBLE_WINDOW) s.stumble = 0;
  const lvl = levelAt(s.z);
  if (lvl > s.level) {
    s.level = lvl;
    ev.level = true;
    addTime(s, runLevelBonus(lvl));
  }

  while (s.nextZ < s.z + RUN.LOOKAHEAD) spawnRow(s);

  const back = s.z - (M >> 1);
  for (const o of s.obstacles) {
    if (o.resolved) continue;

    if (s.magnet > 0 && o.kind === "coin" && o.z <= s.z + 12 * M && o.z + o.len >= back) {
      collectCoin(s, o);
      continue;
    }
    if (o.lane !== s.lane) continue;
    if (s.invuln > 0 && o.kind !== "coin" && o.kind !== "power") continue;
    if (o.z > s.z || o.z + o.len < back) continue;
    switch (o.kind) {
      case "coin":
        if (s.h < 90) collectCoin(s, o);
        break;
      case "power":
        if (s.h < 110) {
          o.resolved = true;
          ev.pickup = o.power ?? "time";
          if (o.power === "time") addTime(s, RUN.TIME_PICKUP);
          else if (o.power === "shield") s.shield = true;
          else if (o.power === "magnet") s.magnet = RUN.MAGNET_TICKS;
          else s.double = RUN.DOUBLE_TICKS;
        }
        break;
      case "wall":
        return die(s, "wall");
      case "hole":
        if (s.h === 0 && s.vh <= 0 && o.z <= back && s.z <= o.z + o.len) return die(s, "hole");
        break;
      case "low":
        if (s.h < RUN.LOW_CLEAR) stumbleOn(s, o);
        break;
      case "high":
        if (s.slide === 0 || s.h > 0) stumbleOn(s, o);
        break;
    }
    if (s.dead) return;
  }
  while (s.obstacles.length && s.obstacles[0].z + s.obstacles[0].len < s.z - 4 * M) s.obstacles.shift();
}

function popShield(s: RunState): boolean {
  if (!s.shield) return false;
  s.shield = false;
  s.invuln = RUN.INVULN_TICKS;
  s.events.shieldPop = true;
  return true;
}

function stumbleOn(s: RunState, o: Obstacle) {
  o.resolved = true;
  if (popShield(s)) return;
  if (s.stumble > 0) return die(s, "caught");
  s.stumble = 1;
  s.slowdown = 50;
  s.events.stumble = true;
}

function die(s: RunState, death: RunDeath) {
  if (death !== "caught" && popShield(s)) return;
  s.death = death;
  s.crash = RUN.CRASH_TICKS;
  s.crashes++;
  s.timeLeft = Math.max(0, s.timeLeft - (death === "caught" ? RUN.CAUGHT_PENALTY : RUN.CRASH_PENALTY));
  s.stumble = 0;
  s.h = 0;
  s.vh = 0;
  s.slide = 0;
  s.events.die = true;
}

function respawn(s: RunState) {
  const clearTo = s.z + 14 * M;
  for (const o of s.obstacles) if (o.kind !== "coin" && o.kind !== "power" && o.z < clearTo) o.resolved = true;
  s.invuln = RUN.INVULN_TICKS;
  s.slowdown = 40;
  s.events.respawn = true;
}

export function hashRun(s: RunState): string {
  return hashInts([s.tick, s.z, s.lane, s.h, s.coins, s.rng.state, s.dead ? 1 : 0, s.rows, s.timeLeft, s.crashes, s.shield ? 1 : 0, s.magnet, s.double]);
}
