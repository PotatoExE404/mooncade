import { Action } from "./input";
import { compileTuning, createBody, stepPlayer, SUB, type Body, type Level } from "./platformer";
import { hashInts } from "./rng";

export const TILE = 16;
export const ROWS = 11;
export const TUNING = compileTuning({
  tilePx: TILE,
  jumpHeightPx: 54,
  apexTicks: 24,
  fallMultiplier: 2,
  maxFallMultiplier: 1.5,
  runPxPerTick: 2,
  accelTicks: 5,
  decelTicks: 3,
  airControl: 0.75,
  coyoteTicks: 6,
  bufferTicks: 8,
  releaseCut: 0.45,
  apexHangFraction: 0.12,
  cornerPx: 3,
});

export type Tile = "." | "#" | "-" | "^";
export interface EnemySpawn {
  x: number;
  y: number;
}
export interface StageDef {
  name: string;
  tiles: string[];
  start: [number, number];
  goal: [number, number];
  checkpoints: [number, number][];
  diamonds: [number, number][];
  enemies: [number, number][];
}

function stage(name: string, width: number, build: (b: ReturnType<typeof builder>) => void): StageDef {
  const b = builder(width);
  build(b);
  return { name, tiles: b.grid.map((r) => r.join("")), start: b.start, goal: b.goal, checkpoints: b.checkpoints, diamonds: b.diamonds, enemies: b.enemies };
}

function builder(width: number) {
  const grid: Tile[][] = Array.from({ length: ROWS }, () => Array<Tile>(width).fill("."));
  const set = (x: number, y: number, t: Tile) => {
    if (x >= 0 && x < width && y >= 0 && y < ROWS) grid[y][x] = t;
  };
  const b = {
    grid,
    start: [2, 8] as [number, number],
    goal: [width - 4, 8] as [number, number],
    checkpoints: [] as [number, number][],
    diamonds: [] as [number, number][],
    enemies: [] as [number, number][],

    ground(x0: number, x1: number, top: number) {
      for (let x = x0; x <= x1; x++) for (let y = top; y < ROWS; y++) set(x, y, "#");
    },
    block(x0: number, x1: number, y0: number, y1: number) {
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) set(x, y, "#");
    },
    oneWay(x: number, y: number, len: number) {
      for (let i = 0; i < len; i++) set(x + i, y, "-");
    },
    spikes(x0: number, x1: number, y: number) {
      for (let x = x0; x <= x1; x++) set(x, y, "^");
    },
    start_(x: number, y: number) {
      b.start = [x, y];
    },
    goal_(x: number, y: number) {
      b.goal = [x, y];
    },
    check(x: number, y: number) {
      b.checkpoints.push([x, y]);
    },
    gem(x: number, y: number) {
      b.diamonds.push([x, y]);
    },
    enemy(x: number, y: number) {
      b.enemies.push([x, y]);
    },
  };
  return b;
}

export const STAGES: StageDef[] = [
  stage("Buy the Dip", 100, (b) => {
    b.start_(2, 8);
    b.ground(0, 14, 9);
    b.gem(8, 6);
    b.ground(18, 30, 9);
    b.ground(25, 30, 7);
    b.ground(31, 40, 9);
    b.check(33, 8);
    b.enemy(37, 8);
    b.ground(41, 56, 9);
    b.oneWay(43, 6, 4);
    b.oneWay(48, 3, 3);
    b.gem(49, 2);
    b.ground(61, 75, 9);
    b.check(62, 8);
    b.enemy(68, 8);
    b.gem(77, 5);
    b.ground(79, 99, 9);
    b.ground(84, 85, 8);
    b.ground(86, 87, 7);
    b.ground(88, 99, 6);
    b.goal_(95, 5);
  }),
  stage("Hold", 112, (b) => {
    b.start_(2, 8);
    b.ground(0, 30, 9);
    b.spikes(13, 14, 8);
    b.check(20, 8);
    b.oneWay(24, 7, 2);
    b.ground(28, 45, 6);
    b.enemy(38, 5);
    b.gem(38, 2);
    b.ground(46, 70, 9);
    b.check(46, 8);
    b.spikes(49, 54, 8);
    b.oneWay(49, 6, 6);
    b.gem(51, 4);
    b.enemy(62, 8);
    b.enemy(67, 8);
    b.ground(75, 111, 9);
    b.check(76, 8);
    b.block(80, 88, 0, 6);
    b.gem(84, 8);
    b.spikes(94, 95, 8);
    b.goal_(106, 8);
  }),
  stage("Sideways", 110, (b) => {
    b.start_(2, 8);
    b.ground(0, 12, 9);
    b.ground(16, 30, 9);
    b.check(17, 8);
    b.enemy(22, 8);
    b.enemy(27, 8);
    b.ground(31, 50, 9);
    b.spikes(33, 38, 8);
    b.oneWay(31, 7, 3);
    b.oneWay(35, 5, 3);
    b.oneWay(39, 3, 3);
    b.gem(40, 1);
    b.check(44, 8);
    b.enemy(48, 8);
    b.ground(54, 70, 7);
    b.enemy(62, 6);
    b.gem(66, 3);
    b.ground(71, 90, 9);
    b.check(72, 8);
    b.block(76, 84, 0, 6);
    b.gem(80, 8);
    b.ground(91, 109, 9);
    b.spikes(95, 96, 8);
    b.goal_(104, 8);
  }),
  stage("To the Moon", 120, (b) => {
    b.start_(2, 8);
    b.ground(0, 8, 9);
    b.ground(12, 14, 8);
    b.ground(18, 20, 7);
    b.ground(24, 26, 8);
    b.ground(30, 41, 9);
    b.check(31, 8);
    b.enemy(36, 8);
    b.ground(42, 49, 9);
    b.oneWay(42, 7, 3);
    b.oneWay(46, 4, 3);
    b.ground(50, 60, 4);
    b.gem(55, 1);
    b.ground(61, 76, 9);
    b.check(61, 8);
    b.spikes(64, 66, 8);
    b.gem(70, 5);
    b.enemy(72, 8);
    b.ground(80, 81, 8);
    b.ground(85, 86, 7);
    b.gem(88, 3);
    b.ground(90, 91, 6);
    b.ground(95, 97, 7);
    b.check(96, 6);
    b.ground(98, 119, 9);
    b.goal_(114, 8);
  }),
  stage("Diamond Mine", 110, (b) => {
    b.start_(2, 8);
    b.ground(0, 45, 9);
    b.oneWay(16, 7, 3);
    b.oneWay(20, 5, 3);
    b.oneWay(24, 3, 3);
    b.gem(25, 1);
    b.check(30, 8);
    b.enemy(36, 8);
    b.enemy(42, 8);
    b.ground(50, 70, 9);
    b.check(51, 8);
    b.block(54, 62, 0, 6);
    b.gem(58, 8);
    b.spikes(66, 67, 8);
    b.ground(74, 76, 7);
    b.ground(80, 109, 9);
    b.check(81, 8);
    b.oneWay(86, 6, 4);
    b.oneWay(91, 4, 4);
    b.gem(93, 2);
    b.enemy(98, 8);
    b.goal_(104, 8);
  }),
  stage("Bull Trap", 110, (b) => {
    b.start_(2, 8);
    b.ground(0, 10, 9);
    b.ground(11, 14, 10);
    b.spikes(11, 14, 9);
    b.ground(15, 30, 9);
    b.check(16, 8);
    b.enemy(21, 8);
    b.enemy(27, 8);
    b.ground(31, 33, 7);
    b.ground(36, 38, 5);
    b.ground(41, 50, 7);
    b.gem(45, 3);
    b.ground(51, 70, 9);
    b.check(52, 8);
    b.spikes(55, 58, 8);
    b.oneWay(54, 6, 6);
    b.enemy(65, 8);
    b.ground(74, 80, 9);
    b.gem(82, 5);
    b.ground(84, 86, 8);
    b.ground(90, 109, 9);
    b.check(91, 8);
    b.oneWay(97, 6, 4);
    b.gem(99, 4);
    b.goal_(104, 8);
  }),
  stage("Whale Watch", 120, (b) => {
    b.start_(2, 8);
    b.ground(0, 10, 9);
    b.ground(14, 16, 8);
    b.ground(20, 22, 7);
    b.ground(26, 28, 6);
    b.gem(27, 3);
    b.ground(32, 34, 7);
    b.ground(38, 40, 8);
    b.ground(44, 64, 9);
    b.check(45, 8);
    b.oneWay(50, 6, 4);
    b.gem(52, 3);
    b.enemy(52, 8);
    b.enemy(60, 8);
    b.ground(65, 80, 9);
    b.block(68, 76, 0, 6);
    b.ground(85, 86, 8);
    b.ground(90, 91, 7);
    b.ground(95, 119, 9);
    b.check(96, 8);
    b.spikes(100, 102, 8);
    b.oneWay(99, 6, 5);
    b.gem(101, 4);
    b.goal_(114, 8);
  }),
  stage("Liquidation", 120, (b) => {
    b.start_(2, 8);
    b.ground(0, 8, 9);
    b.ground(12, 13, 9);
    b.ground(17, 18, 8);
    b.ground(22, 23, 7);
    b.ground(27, 28, 8);
    b.ground(32, 33, 9);
    b.ground(37, 52, 9);
    b.check(38, 8);
    b.enemy(45, 8);
    b.enemy(50, 8);
    b.oneWay(41, 6, 3);
    b.gem(42, 4);
    b.ground(53, 70, 9);
    b.block(57, 66, 0, 6);
    b.gem(62, 8);
    b.ground(71, 90, 9);
    b.check(71, 8);
    b.spikes(74, 76, 8);
    b.spikes(81, 83, 8);
    b.oneWay(73, 6, 5);
    b.oneWay(80, 6, 5);
    b.gem(87, 4);
    b.ground(94, 96, 8);
    b.ground(100, 119, 9);
    b.goal_(114, 8);
  }),
  stage("Rug Pull", 120, (b) => {
    b.start_(2, 8);
    b.ground(0, 12, 9);
    b.ground(13, 40, 10);
    b.spikes(13, 40, 9);
    b.oneWay(14, 7, 5);
    b.oneWay(21, 6, 5);
    b.gem(23, 3);
    b.oneWay(28, 7, 5);
    b.oneWay(35, 6, 4);
    b.ground(41, 55, 9);
    b.check(42, 8);
    b.enemy(48, 8);
    b.enemy(53, 8);
    b.ground(59, 61, 8);
    b.ground(65, 67, 6);
    b.gem(66, 3);
    b.ground(71, 73, 7);
    b.ground(77, 100, 9);
    b.check(78, 8);
    b.spikes(83, 85, 8);
    b.spikes(90, 92, 8);
    b.gem(97, 5);
    b.ground(101, 119, 9);
    b.goal_(114, 8);
  }),
  stage("All-Time High", 130, (b) => {
    b.start_(2, 8);
    b.ground(0, 10, 9);
    b.ground(11, 14, 7);
    b.ground(17, 20, 5);
    b.ground(23, 26, 3);
    b.gem(25, 0);
    b.ground(29, 40, 9);
    b.check(30, 8);
    b.enemy(35, 8);
    b.enemy(39, 8);
    b.oneWay(43, 7, 3);
    b.oneWay(48, 6, 3);
    b.gem(49, 3);
    b.oneWay(53, 7, 3);
    b.oneWay(58, 6, 2);
    b.ground(61, 75, 9);
    b.check(62, 8);
    b.spikes(66, 68, 8);
    b.enemy(72, 8);
    b.ground(78, 79, 8);
    b.ground(83, 84, 7);
    b.ground(88, 89, 6);
    b.gem(91, 2);
    b.ground(93, 94, 5);
    b.ground(98, 100, 6);
    b.ground(103, 129, 9);
    b.check(104, 8);
    b.goal_(124, 8);
  }),
];

export interface Enemy {
  x: number;
  y: number;
  dir: 1 | -1;
  alive: boolean;
  squash: number;
}

export interface DiamondState {
  tick: number;
  started: boolean;
  finished: boolean;
  stage: number;
  body: Body;
  enemies: Enemy[];
  gems: boolean[][];
  checkpoint: [number, number];
  checkpointIndex: number;
  dead: number;
  transition: number;
  deaths: number;
  prevInput: number;
  level: Level;
  events: { jump: boolean; land: number; die: boolean; gem: boolean; stomp: boolean; check: boolean; stage: boolean; finish: boolean };
}

export const DEATH_TICKS = 24;
export const STAGE_TICKS = 110;
export const ENEMY_SPEED = 128;
export const PLAYER_W = 10;
export const PLAYER_H = 14;

function levelOf(def: StageDef): Level {
  const map = def.tiles;
  return {
    widthTiles: map[0].length,
    heightTiles: ROWS,
    tileAt: (tx, ty) => {
      const c = map[ty][tx];
      return c === "#" ? 1 : c === "-" ? 2 : 0;
    },
  };
}

function spawnAt(tile: [number, number]): Body {
  const x = tile[0] * TILE + ((TILE - PLAYER_W) >> 1);
  const y = (tile[1] + 1) * TILE - PLAYER_H;
  return createBody(x, y, PLAYER_W, PLAYER_H);
}

function loadStage(s: DiamondState, index: number) {
  const def = STAGES[index];
  s.stage = index;
  s.level = levelOf(def);
  s.body = spawnAt(def.start);
  s.checkpoint = def.start;
  s.checkpointIndex = -1;
  s.enemies = def.enemies.map(([x, y]) => ({ x: (x * TILE + 2) * SUB, y: ((y + 1) * TILE - 12) * SUB, dir: -1, alive: true, squash: 0 }));
}

export function createDiamond(): DiamondState {
  const s = {
    tick: 0,
    started: false,
    finished: false,
    stage: 0,
    gems: STAGES.map((d) => d.diamonds.map(() => false)),
    dead: 0,
    transition: 0,
    deaths: 0,
    prevInput: 0,
    events: { jump: false, land: 0, die: false, gem: false, stomp: false, check: false, stage: false, finish: false },
  } as unknown as DiamondState;
  loadStage(s, 0);
  return s;
}

export const gemCount = (s: DiamondState) => s.gems.reduce((n, g) => n + g.filter(Boolean).length, 0);
export const GEM_TOTAL = STAGES.reduce((n, d) => n + d.diamonds.length, 0);

const solidAt = (s: DiamondState, px: number, py: number) => {
  const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
  if (ty >= ROWS) return false;
  if (tx < 0 || ty < 0 || tx >= s.level.widthTiles) return true;
  return s.level.tileAt(tx, ty) !== 0;
};

const boxHit = (ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) =>
  ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

function kill(s: DiamondState) {
  s.dead = DEATH_TICKS;
  s.deaths++;
  s.events.die = true;
}

export function stepDiamond(s: DiamondState, input: number): void {
  const ev = s.events;
  ev.jump = ev.die = ev.gem = ev.stomp = ev.check = ev.stage = ev.finish = false;
  ev.land = 0;
  const prev = s.prevInput;
  s.prevInput = input;
  if (s.finished) return;
  if (!s.started) {
    if (!input) return;
    s.started = true;
  }
  s.tick++;

  for (const e of s.enemies) {
    if (!e.alive) {
      e.squash++;
      continue;
    }
    const ex = e.x >> 8, ey = e.y >> 8;
    const ahead = e.dir > 0 ? ex + 12 : ex - 1;
    if (solidAt(s, ahead, ey + 6) || !solidAt(s, ahead, ey + 13)) e.dir = (e.dir * -1) as 1 | -1;
    e.x += e.dir * (ENEMY_SPEED + Math.min(s.stage, 6) * 14);
  }

  if (s.transition > 0) {
    if (--s.transition === 0) loadStage(s, s.stage + 1);
    return;
  }
  if (s.dead > 0) {
    if (--s.dead === 0) {
      s.body = spawnAt(s.checkpoint);
      s.prevInput = input;
    }
    return;
  }

  const b = s.body;
  const stepEv = stepPlayer(b, input, prev, s.level, TUNING);
  if (stepEv.jumped) ev.jump = true;
  if (stepEv.landed) ev.land = stepEv.landingSpeed;
  if (stepEv.fellOut) return kill(s);

  const px = b.x >> 8, py = b.y >> 8;
  const def = STAGES[s.stage];

  for (let ty = Math.floor(py / TILE); ty <= Math.floor((py + PLAYER_H - 1) / TILE); ty++) {
    for (let tx = Math.floor(px / TILE); tx <= Math.floor((px + PLAYER_W - 1) / TILE); tx++) {
      if (ty < 0 || ty >= ROWS || tx < 0 || tx >= s.level.widthTiles) continue;
      if (def.tiles[ty][tx] === "^" && boxHit(px, py, PLAYER_W, PLAYER_H, tx * TILE + 3, ty * TILE + 7, TILE - 6, 9)) return kill(s);
    }
  }

  for (const e of s.enemies) {
    if (!e.alive) continue;
    const ex = e.x >> 8, ey = e.y >> 8;
    if (!boxHit(px, py, PLAYER_W, PLAYER_H, ex + 1, ey + 2, 10, 10)) continue;
    if (b.vy > 0 && py + PLAYER_H <= ey + 8) {
      e.alive = false;
      b.vy = -((TUNING.jumpSpeed * 3) >> 2);
      b.jumping = (input & Action.Jump) !== 0;
      ev.stomp = true;
    } else return kill(s);
  }

  def.diamonds.forEach(([gx, gy], i) => {
    if (!s.gems[s.stage][i] && boxHit(px, py, PLAYER_W, PLAYER_H, gx * TILE + 3, gy * TILE + 3, 10, 10)) {
      s.gems[s.stage][i] = true;
      ev.gem = true;
    }
  });
  def.checkpoints.forEach((c, i) => {
    if (i > s.checkpointIndex && boxHit(px, py, PLAYER_W, PLAYER_H, c[0] * TILE, c[1] * TILE - TILE, TILE, TILE * 2)) {
      s.checkpointIndex = i;
      s.checkpoint = c;
      ev.check = true;
    }
  });
  const [gx, gy] = def.goal;
  if (boxHit(px, py, PLAYER_W, PLAYER_H, gx * TILE + 4, gy * TILE - TILE * 2, 8, TILE * 3)) {
    if (s.stage === STAGES.length - 1) {
      s.finished = true;
      ev.finish = true;
    } else {
      s.transition = STAGE_TICKS;
      ev.stage = true;
    }
  }
}

export function cloneDiamond(s: DiamondState): DiamondState {
  return {
    ...s,
    body: { ...s.body },
    enemies: s.enemies.map((e) => ({ ...e })),
    gems: s.gems.map((g) => [...g]),
    checkpoint: [...s.checkpoint] as [number, number],
    events: { ...s.events },
  };
}

export function hashDiamond(s: DiamondState): string {
  return hashInts([s.tick, s.stage, s.body.x, s.body.y, s.deaths, gemCount(s), s.finished ? 1 : 0, ...s.enemies.map((e) => e.x)]);
}
