import { Action } from "../sim/input";
import { FLAP, type FlapState } from "../sim/flap";
import type { RunState } from "../sim/run";
import { decodeInputs } from "../sim/replay";
import { DIAMOND_DEMO } from "./demo-diamond";

export function flapBot() {
  let prev = 0;
  return (s: FlapState) => {
    const next = s.candles.find((c) => (c.x >> 8) + FLAP.CANDLE_W >= FLAP.X) ?? s.candles[0];

    const pk = s.pickups.find((p) => !p.taken && p.x >> 8 > FLAP.X - 4 && p.x < next.x);
    const target = pk && (pk.x >> 8) - FLAP.X < 40 ? pk.y : next.gapY;
    const y = (s.y >> 8) + FLAP.HIT_H / 2;
    const want = !s.started || (y > target + 6 && s.vy > -200) ? Action.Jump : 0;
    const bit = want && !prev ? Action.Jump : 0;
    prev = bit;
    return bit;
  };
}

export function runBot() {
  let prev = 0;
  return (s: RunState) => {
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
    prev = bit;
    return bit;
  };
}

export function diamondDemo() {
  const inputs = decodeInputs(DIAMOND_DEMO);
  let i = 0;
  return () => (i < inputs.length ? inputs[i++] : 0);
}
