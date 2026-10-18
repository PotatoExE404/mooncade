import { expect, test } from "@playwright/test";
import { botPlay, collectErrors, diamondReplay, openGame } from "./helpers";

test.setTimeout(240_000);

test("Moonshot: a full run saves a best and earns a card", async ({ page }) => {
  const errors = collectErrors(page);
  await openGame(page, "flap");
  await botPlay(page, "flap");
  await expect(page.getByTestId("results")).toBeVisible({ timeout: 30_000 });
  const score = Number(await page.getByTestId("final-score").textContent());
  expect(score).toBeGreaterThan(0);
  await expect(page.getByText("New card")).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("mc:state:v2")!) as { bests: Record<string, number>; cards: unknown[] });
  expect(saved.bests.flap).toBe(score);
  expect(saved.cards.length).toBeGreaterThan(0);

  await page.goto("/cards");
  await page.getByRole("button", { name: /^Open your/ }).first().click();
  await expect(page.getByTestId("card-studio")).toBeVisible();
  await page.getByPlaceholder("gm. diamond hands only.").fill("to the moon");
  const download = page.waitForEvent("download");
  await page.getByTestId("download-card").click();
  expect((await download).suggestedFilename()).toMatch(/^mooncade-flap-\w+\.png$/);
  const custom = await page.evaluate(() => (JSON.parse(localStorage.getItem("mc:state:v2")!) as { cards: { custom: { caption?: string } | null }[] }).cards[0].custom);
  expect(custom?.caption).toBe("to the moon");
  expect(errors).toEqual([]);
});

test("instant restart: R mid-run brings a fresh run in under half a second", async ({ page }) => {
  await openGame(page, "flap");
  await page.evaluate(() => {
    const g = window.__game!;
    g.press(16);
    g.step(1);
    g.release(16);
  });
  await page.waitForFunction(() => window.__game!.phase === "playing");
  const t0 = Date.now();
  await page.keyboard.press("KeyR");
  await page.waitForFunction(() => window.__game!.phase === "ready");
  expect(Date.now() - t0).toBeLessThan(500);
});

test("Bear Escape: a full run ends with results", async ({ page }) => {
  const errors = collectErrors(page);
  await openGame(page, "run");
  await botPlay(page, "run");
  await page.waitForFunction(() => window.__game!.phase === "over", null, { timeout: 30_000 });
  await expect(page.getByTestId("results")).toBeVisible({ timeout: 30_000 });
  expect(errors).toEqual([]);
});

test("HODL Quest: the solver's ten-level run finishes", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "landscape run covered on desktop");
  const errors = collectErrors(page);
  await openGame(page, "diamond");
  await diamondReplay(page);
  await expect(page.getByTestId("results")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("final-score")).toHaveText(/^\d:\d\d\.\d\d$/);
  expect(errors).toEqual([]);
});

test("arrows: ↑ jumps in HODL Quest", async ({ page }, info) => {
  test.skip(info.project.name === "mobile");
  await openGame(page, "diamond");
  await page.evaluate(() => window.__game!.pause(true));
  await page.evaluate(() => {
    const g = window.__game!;
    g.press(4);
    g.step(10);
    g.release(4);
  });
  const vy = await page.evaluate(() => (window.__game!.state() as { body: { vy: number } }).body.vy);
  expect(vy).toBeLessThan(0);
});

test("touch controls appear for HODL Quest on phones", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile");
  await openGame(page, "diamond");
  const jump = page.getByRole("button", { name: "Jump" });
  await expect(jump).toBeVisible();

  const x0 = await page.evaluate(() => (window.__game!.state() as { body: { x: number } }).body.x);
  const right = page.getByRole("button", { name: "Right" });
  const box = (await right.boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.up();
  const x1 = await page.evaluate(() => (window.__game!.state() as { body: { x: number } }).body.x);
  expect(x1).toBeGreaterThan(x0);
});
