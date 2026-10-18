import { describe, expect, test } from "vitest";
import { Action } from "../../src/sim/input";
import { candleBonus, createFlap, FLAP, levelBonus, stepFlap } from "../../src/sim/flap";
import { createRun, M, RUN, stepRun } from "../../src/sim/run";
import { createDiamond, GEM_TOTAL, STAGES, stepDiamond } from "../../src/sim/diamond";
import { decodeInputs, encodeInputs } from "../../src/sim/replay";
import { simulate } from "../../src/sim";
import { LADDERS } from "../../src/shared/rules";
import { solveGem, solveRun } from "./solver";

function flapBot(seed: number, skill = 6) {
  const s = createFlap(seed);
  const inputs: number[] = [];
  let prev = 0;
  while (!s.dead && inputs.length < 80000) {
    const next = s.candles.find((c) => (c.x >> 8) + FLAP.CANDLE_W >= FLAP.X) ?? s.candles[0];
    const pk = s.pickups.find((p) => !p.taken && p.x >> 8 > FLAP.X - 4 && p.x < next.x);
    const target = pk && (pk.x >> 8) - FLAP.X < 40 ? pk.y : next.gapY;
    const y = (s.y >> 8) + FLAP.HIT_H / 2;
    const want = !s.started || (y > target + skill && s.vy > -200) ? Action.Jump : 0;
    const bit = want && !prev ? Action.Jump : 0;
    inputs.push(bit);
    prev = bit;
    stepFlap(s, bit);
  }
  return { s, inputs: Uint8Array.from(inputs) };
}

function runBot(seed: number) {
  const s = createRun(seed);
  const inputs: number[] = [];
  let prev = 0;
  while (!s.dead && inputs.length < 80000) {
    let want = s.started ? 0 : Action.Up;
    const near = s.obstacles.filter((o) => !o.resolved && o.kind !== "coin" && o.kind !== "power" && o.z + o.len >= s.z - 128 && o.z - s.z < s.speed * 14);
    const here = near.filter((o) => o.lane === s.lane);
    if (here.some((o) => o.kind === "wall")) {
      const blocked = new Set(s.obstacles.filter((o) => o.kind === "wall" && Math.abs(o.z - s.z) < s.speed * 30).map((o) => o.lane));
      const target = [0, 1, 2].filter((l) => !blocked.has(l)).sort((a, b) => Math.abs(a - s.lane) - Math.abs(b - s.lane))[0];
      if (target !== undefined) want = target < s.lane ? Action.Left : Action.Right;
    } else if (here.some((o) => (o.kind === "low" || o.kind === "hole") && o.z - s.z < s.speed * 6)) want = Action.Up;
    else if (here.some((o) => o.kind === "high" && o.z - s.z < s.speed * 8)) want = Action.Down;
    else {
      const coin = s.obstacles.find((o) => (o.kind === "coin" || o.kind === "power") && !o.resolved && o.z > s.z && o.z - s.z < s.speed * 30);
      if (coin && coin.lane !== s.lane && !near.some((o) => o.kind === "wall")) want = coin.lane < s.lane ? Action.Left : Action.Right;
    }
    const bit = want && want !== prev ? want : 0;
    inputs.push(bit);
    prev = bit;
    stepRun(s, bit);
  }
  return { s, inputs: Uint8Array.from(inputs) };
}

describe("replay codec", () => {
  test("round-trips arbitrary inputs", () => {
    const raw = Uint8Array.from({ length: 5000 }, (_, i) => ((i * 2654435761) >>> 27) & 63);
    expect(decodeInputs(encodeInputs(raw))).toEqual(raw);
  });
  test("long idle stretches stay tiny", () => {
    expect(encodeInputs(new Uint8Array(36000)).length).toBeLessThan(40);
  });
  test("rejects junk and bad bits", () => {
    expect(() => decodeInputs("!!!")).toThrow();
    expect(() => decodeInputs(encodeInputs(Uint8Array.from([64])))).toThrow();
  });
});

describe("Moonshot (60 s clock, time back for scoring)", () => {
  test("waits for the first tap; the clock doesn't run before it", () => {
    const s = createFlap(1);
    for (let i = 0; i < 600; i++) stepFlap(s, 0);
    expect(s.started).toBe(false);
    expect(s.timeLeft).toBe(FLAP.TIME);
  });
  test("a crash costs 3 s and respawns instead of ending the run", () => {
    const s = createFlap(1);
    stepFlap(s, Action.Jump);
    while (s.crashes === 0) stepFlap(s, 0);
    expect(s.dead).toBe(false);
    expect(s.timeLeft).toBeLessThanOrEqual(FLAP.TIME - FLAP.CRASH_PENALTY);
    for (let i = 0; i < FLAP.CRASH_TICKS + 2; i++) stepFlap(s, 0);
    expect(s.invuln).toBeGreaterThan(0);
  });
  test("the run ends when time is up, even if you never crash", () => {
    const { s } = flapBot(3);
    expect(s.dead).toBe(true);
    expect(s.timeLeft).toBe(0);
  });
  test("scoring earns time back, so a good run lasts well past 60 s but still ends", () => {
    const runs = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => flapBot(seed).s);
    console.log("moonshot bot:", runs.map((r) => `${r.score} pts, ${r.cleared} candles, ${r.crashes} crashes, L${r.level}, ${(r.tick / 60) | 0} s, +${(r.bonusTotal / 60) | 0} s`).join(" | "));
    for (const r of runs) {
      expect(r.bonusTotal).toBeGreaterThan(0);
      expect(r.tick).toBeGreaterThan(FLAP.TIME + 30 * 60);
      expect(r.tick).toBeLessThan(FLAP.RUN_CAP);
    }
    expect(Math.max(...runs.map((r) => r.level))).toBeGreaterThanOrEqual(10);
  });
  test("bonuses shrink with level: early candles give time, late ones don't", () => {
    expect(candleBonus(1)).toBeGreaterThan(0);
    expect(candleBonus(10)).toBe(0);
    expect(levelBonus(2)).toBe(6 * 60);
    expect(levelBonus(20)).toBe(2 * 60);
  });
  test("pickups are deterministic per seed and appear in every run", () => {
    const kinds = (seed: number) => {
      const s = createFlap(seed);
      stepFlap(s, Action.Jump);
      const seen: string[] = [];
      for (let i = 0; i < 3000; i++) {
        stepFlap(s, i % 16 === 0 ? Action.Jump : 0);
        for (const p of s.pickups) if (!seen.includes(`${p.x}:${p.kind}`)) seen.push(`${p.x}:${p.kind}`);
      }
      return seen;
    };
    expect(kinds(11)).toEqual(kinds(11));
    expect(kinds(11).length).toBeGreaterThan(0);
    expect(kinds(11)).not.toEqual(kinds(12));
  });
  test("a shield absorbs a crash: no time lost, no crash counted", () => {
    const s = createFlap(1);
    stepFlap(s, Action.Jump);
    s.shield = true;
    let before = s.timeLeft;
    while (!s.events.shieldPop && s.tick < 2000) {
      before = s.timeLeft;
      stepFlap(s, 0);
    }
    expect(s.events.shieldPop).toBe(true);
    expect(s.shield).toBe(false);
    expect(s.crashes).toBe(0);
    expect(s.timeLeft).toBe(before - 1);
  });
  test("the card ladder is reachable but the top tier is hard", () => {
    const runs = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => simulate("flap", seed, flapBot(seed).inputs));
    const legendary = LADDERS.flap.find((t) => t.rarity === "legendary")!;
    expect(runs.every((r) => legendary.earned(r.stats, r.score))).toBe(true);
    const mythic = LADDERS.flap.find((t) => t.rarity === "mythic")!;
    expect(runs.some((r) => mythic.earned(r.stats, r.score))).toBe(true);
  });
  test("deterministic: the server replays it to the same outcome", () => {
    const { s, inputs } = flapBot(7);
    const a = simulate("flap", 7, inputs);
    expect(a.over).toBe(true);
    expect(a.score).toBe(s.score);
    expect(simulate("flap", 7, decodeInputs(encodeInputs(inputs)))).toEqual(a);
  });
  test("padding or truncating the replay is detected", () => {
    const { inputs } = flapBot(9);
    expect(simulate("flap", 9, Uint8Array.from([...inputs, 0, 0, 0])).over).toBe(false);
    expect(simulate("flap", 9, inputs.slice(0, -5)).over).toBe(false);
  });
});

describe("Bear Escape (90 s clock, time back every level)", () => {
  test("a look-ahead bot runs far, levels up and earns time (calibrates the card ladder)", () => {
    const runs = [1, 2, 3, 4].map((seed) => runBot(seed).s);
    console.log("bear escape bot:", runs.map((r) => `${Math.floor(r.z / 256)} m, ${r.coins} coins, ${r.crashes} crashes, L${r.level}, ${(r.tick / 60) | 0} s, +${(r.bonusTotal / 60) | 0} s`).join(" | "));
    expect(Math.max(...runs.map((r) => r.level))).toBeGreaterThanOrEqual(5);
    for (const r of runs) {
      expect(r.dead).toBe(true);
      expect(r.bonusTotal).toBeGreaterThan(0);
      expect(r.tick).toBeGreaterThan(RUN.TIME);
    }
  });
  test("the card ladder: a strong bot earns mythic, the top tier stays out of easy reach", () => {
    const runs = [1, 2, 3, 4].map((seed) => simulate("run", seed, runBot(seed).inputs));
    const tier = (r: string) => LADDERS.run.find((t) => t.rarity === r)!;
    expect(runs.every((r) => tier("legendary").earned(r.stats, r.score))).toBe(true);
    expect(runs.some((r) => tier("mythic").earned(r.stats, r.score))).toBe(true);
  });
  test("pickups show up in the free lane and a shield absorbs a crash", () => {
    const t = createRun(4);
    stepRun(t, Action.Up);
    t.shield = true;
    while (!t.events.shieldPop && !t.events.die && t.tick < 3000) stepRun(t, 0);
    expect(t.events.shieldPop).toBe(true);
    expect(t.crashes).toBe(0);
    const u = createRun(4);
    for (let i = 0; i < 400 && u.obstacles.every((o) => o.kind !== "power"); i++) stepRun(u, i === 0 ? Action.Up : 0);
    expect(u.obstacles.some((o) => o.kind === "power")).toBe(true);
  });
  test("the magnet pulls coins from other lanes", () => {
    const s = createRun(2);
    stepRun(s, Action.Up);
    s.magnet = RUN.MAGNET_TICKS;
    s.obstacles.push({ z: s.z + 2 * M, len: M >> 1, lane: (s.lane + 1) % 3, kind: "coin", resolved: false });
    const before = s.coins;
    stepRun(s, 0);
    expect(s.coins).toBe(before + 1);
  });
  test("doing nothing crashes repeatedly, losing time, until the clock runs out", () => {
    const s = createRun(3);
    stepRun(s, Action.Up);
    let n = 0;
    while (!s.dead && n++ < 20000) stepRun(s, 0);
    expect(s.dead).toBe(true);
    expect(s.crashes).toBeGreaterThan(1);
    expect(n).toBeLessThan(RUN.TIME);
  });
  test("deterministic and verifiable", () => {
    const { s, inputs } = runBot(5);
    const out = simulate("run", 5, inputs);
    expect(out.over).toBe(true);
    expect(out.stats.metres).toBe(Math.floor(s.z / 256));
  });
});

describe("HODL Quest (10 levels, fastest time)", () => {
  test("there are ten levels and thirty diamonds", () => {
    expect(STAGES.length).toBe(10);
    expect(GEM_TOTAL).toBe(30);
  });
  test("all ten levels are beatable (solver finds a full run)", () => {
    const res = solveRun();
    expect(res).toHaveProperty("inputs");
    if (!("inputs" in res)) return;
    const out = simulate("diamond", 0, Uint8Array.from(res.inputs));
    expect(out.over).toBe(true);
    console.log(`solver run: ${(out.stats.ticks / 60).toFixed(2)} s, deaths ${out.stats.deaths}, gems ${out.stats.gems}/${GEM_TOTAL}`);
  });
  test("every diamond is reachable", () => {
    const missing: string[] = [];
    STAGES.forEach((st, si) => st.diamonds.forEach((_, gi) => !solveGem(si, gi) && missing.push(`${st.name}#${gi}`)));
    expect(missing).toEqual([]);
  });
  test("falling in the first pit counts a death and respawns", () => {
    const s = createDiamond();
    for (let i = 0; i < 400; i++) stepDiamond(s, Action.Right);
    expect(s.deaths).toBeGreaterThan(0);
  });
  test("↑ jumps like Space", () => {
    const s = createDiamond();
    for (let i = 0; i < 30; i++) stepDiamond(s, 0);
    stepDiamond(s, Action.Up);
    stepDiamond(s, Action.Up);
    expect(s.body.vy).toBeLessThan(0);
  });
});
