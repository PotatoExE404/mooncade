import { expect, type Page } from "@playwright/test";
import { DIAMOND_DEMO } from "../../src/games/demo-diamond";
import { decodeInputs } from "../../src/sim/replay";

export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/i.test(m.text())) errors.push(m.text());
  });
  return errors;
}

export async function openGame(page: Page, game: string) {
  await page.goto(`/play/${game}`);
  await page.waitForFunction(() => window.__game?.ready);
}

export async function botPlay(page: Page, game: "flap" | "run", maxTicks = 60 * 60 * 12) {
  await page.evaluate(
    async ([game, maxTicks]) => {
      const g = window.__game!;
      g.pause(true);
      let prev = 0;
      let ticks = 0;
      const policy = () => {
        const s = g.state() as any;
        let want = 0;
        if (game === "flap") {
          const next = s.candles.find((c: any) => (c.x >> 8) + 22 >= 52) ?? s.candles[0];
          want = !s.started || ((s.y >> 8) + 4 > next.gapY + 6 && s.vy > -200) ? 16 : 0;
          if (want && prev) want = 0;
          prev = want ? 1 : 0;
          return want;
        }
        want = s.started ? 0 : 4;
        const here = s.obstacles.filter((o: any) => !o.resolved && o.kind !== "coin" && o.kind !== "power" && o.lane === s.lane && o.z + o.len >= s.z - 128 && o.z - s.z < s.speed * 14);
        if (here.some((o: any) => o.kind === "wall")) {
          const blocked = new Set(s.obstacles.filter((o: any) => o.kind === "wall" && Math.abs(o.z - s.z) < s.speed * 30).map((o: any) => o.lane));
          const target = [0, 1, 2].filter((l) => !blocked.has(l)).sort((a, b) => Math.abs(a - s.lane) - Math.abs(b - s.lane))[0];
          if (target !== undefined) want = target < s.lane ? 1 : 2;
        } else if (here.some((o: any) => (o.kind === "low" || o.kind === "hole") && o.z - s.z < s.speed * 6)) want = 4;
        else if (here.some((o: any) => o.kind === "high" && o.z - s.z < s.speed * 8)) want = 8;
        if (want === prev) want = 0;
        else prev = want;
        return want;
      };
      while (g.phase !== "over" && ticks < maxTicks) {
        for (let i = 0; i < 120 && (g.phase as string) !== "over"; i++, ticks++) {
          g.set(policy());
          g.step(1);
        }
        await new Promise((r) => setTimeout(r, 0));
      }
      g.set(null);
      g.pause(false);
    },
    [game, maxTicks] as const,
  );
}

export async function diamondReplay(page: Page) {
  const inputs = Array.from(decodeInputs(DIAMOND_DEMO));
  await page.evaluate(async (inputs) => {
    const g = window.__game!;
    g.pause(true);
    let i = 0;
    await new Promise<void>((resolve) => {
      const t = setInterval(() => {
        if (g.phase === "over" || i >= inputs.length) {
          clearInterval(t);
          g.set(null);
          g.pause(false);
          resolve();
          return;
        }
        g.set(inputs[i++]);
        g.step(1);
      }, 1000 / 60);
    });
  }, inputs);
}
