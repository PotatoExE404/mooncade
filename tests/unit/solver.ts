import { Action } from "../../src/sim/input";
import { cloneDiamond, createDiamond, STAGES, stepDiamond, TILE, type DiamondState } from "../../src/sim/diamond";

const R = Action.Right, L = Action.Left, J = Action.Jump;
const MACROS: [number, number][] = [
  [R, 6], [R | J, 6], [R | J, 14], [R | J, 24], [J, 10], [J, 24], [L, 6], [L | J, 14], [0, 6], [R, 2], [0, 2],
];

interface Node { s: DiamondState; inputs: number[]; score: number }

const keyOf = (s: DiamondState) =>
  `${s.stage}:${s.body.x >> 11}:${s.body.y >> 11}:${Math.sign(s.body.vy)}:${s.body.grounded ? 1 : 0}:${s.enemies.map((e) => (e.alive ? 1 : 0)).join("")}:${s.checkpointIndex}`;

export function solveStage(start: DiamondState, budget = 60000): number[] | null {
  const stage = start.stage;
  const goalX = STAGES[stage].goal[0] * TILE * 256;
  const open: Node[] = [{ s: start, inputs: [], score: 0 }];
  const seen = new Set<string>();
  let expanded = 0;
  while (open.length && expanded < budget) {
    open.sort((a, b) => b.score - a.score);
    const node = open.shift()!;
    expanded++;
    for (const [bits, n] of MACROS) {
      const s = cloneDiamond(node.s);
      const inputs = node.inputs.slice();
      let died = false;
      for (let i = 0; i < n; i++) {
        stepDiamond(s, bits);
        inputs.push(bits);
        if (s.events.die) { died = true; break; }
        if (s.finished || s.stage !== stage || s.transition > 0) {
          while (s.transition > 0) { stepDiamond(s, 0); inputs.push(0); }
          return inputs;
        }
      }
      if (died) continue;
      const k = keyOf(s);
      if (seen.has(k)) continue;
      seen.add(k);
      const progress = s.body.x / Math.max(goalX, 1);
      open.push({ s, inputs, score: progress * 1000 - inputs.length * 0.02 - (s.body.y >> 8) * 0.01 });
    }
  }
  return null;
}

export function solveRun(): { inputs: number[] } | { failedStage: number } {
  let s = createDiamond();
  const all: number[] = [];
  for (let stage = 0; stage < STAGES.length; stage++) {
    const part = solveStage(s);
    if (!part) return { failedStage: stage };
    for (const b of part) { all.push(b); }

    s = createDiamond();
    for (const b of all) stepDiamond(s, b);
  }
  return { inputs: all };
}

export function solveGem(stageIndex: number, gi: number, budget = 80000): boolean {
  const s = createDiamond();

  for (let k = 0; k < stageIndex; k++) {
    const part = solveStage(s);
    if (!part) return false;
    for (const b of part) stepDiamond(s, b);
  }
  const [gx, gy] = STAGES[stageIndex].diamonds[gi];
  const tx = gx * TILE * 256, ty = gy * TILE * 256;
  const open: { s: DiamondState; score: number; n: number }[] = [{ s, score: 0, n: 0 }];
  const seen = new Set<string>();
  let expanded = 0;
  while (open.length && expanded < budget) {
    open.sort((a, b) => b.score - a.score);
    const node = open.shift()!;
    expanded++;
    for (const [bits, n] of MACROS) {
      const c = cloneDiamond(node.s);
      let died = false;
      for (let i = 0; i < n; i++) {
        stepDiamond(c, bits);
        if (c.events.die) { died = true; break; }
        if (c.gems[stageIndex][gi]) return true;
      }
      if (died || c.stage !== stageIndex) continue;
      const k = keyOf(c);
      if (seen.has(k)) continue;
      seen.add(k);
      const d = Math.abs(c.body.x - tx) + Math.abs(c.body.y - ty) * 1.5;
      open.push({ s: c, score: -d / 256 - (node.n + n) * 0.01, n: node.n + n });
    }
  }
  return false;
}
