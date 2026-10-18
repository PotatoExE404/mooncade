import { expect, test } from "@playwright/test";
import { collectErrors } from "./helpers";

for (const path of ["/", "/play", "/cards", "/roadmap", "/me", "/play/run", "/play/flap", "/play/diamond", "/nowhere"]) {
  test(`${path} renders cleanly without sideways scroll`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("home: the three cabinets play themselves", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".crt canvas")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: /MOONCADE/ })).toBeVisible();

  await expect(page.getByRole("heading", { name: /HODL Quest · featured/ })).toBeVisible();
});

test("insert coin: the coin drops into the machine and lands on game select", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Insert coin and choose a game" }).click();
  await expect(page.getByText("CREDIT 01")).toBeVisible();
  await page.waitForURL("**/play");
  await expect(page.getByRole("heading", { name: "SELECT YOUR GAME" })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/play/run");
});

test("skins: switching re-tints the site", async ({ page }) => {
  await page.goto("/me");
  const before = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent"));
  await page.getByRole("radio", { name: /Crystal Sky/ }).filter({ visible: true }).first().click();
  const after = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent"));
  expect(after.trim()).not.toBe(before.trim());
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("eth");
});

test("photo to pixel head: only a tiny PNG is saved", async ({ page }) => {
  await page.goto("/me");

  await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = c.height = 400;
    const g = c.getContext("2d")!;
    g.fillStyle = "#3a7bd5";
    g.fillRect(0, 0, 400, 400);
    g.fillStyle = "#f0c8a0";
    g.beginPath();
    g.arc(200, 210, 120, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#2a1a10";
    g.fillRect(140, 180, 30, 30);
    g.fillRect(230, 180, 30, 30);
    g.fillStyle = "#c0392b";
    g.fillRect(160, 270, 80, 18);
    g.fillStyle = "#4a2a10";
    g.fillRect(80, 80, 240, 60);
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/png"));
    const dt = new DataTransfer();
    dt.items.add(new File([blob], "selfie.png", { type: "image/png" }));
    const input = document.querySelector<HTMLInputElement>("[data-testid=photo-input]")!;
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.getByTestId("save-avatar").click();
  const head = await page.evaluate(() => JSON.parse(localStorage.getItem("mc:state:v2")!).head as string);
  expect(head.startsWith("data:image/png;base64,")).toBe(true);
  expect(head.length).toBeLessThan(14000);
  const size = await page.evaluate((src) => new Promise<number[]>((r) => { const i = new Image(); i.onload = () => r([i.width, i.height]); i.src = src; }), head);
  expect(size).toEqual([48, 48]);
  await expect(page.locator('header img[src^="data:image/png"]').first()).toBeVisible();
});

test("keyboard: the skip link and focus rings work", async ({ page }, info) => {
  test.skip(info.project.name === "mobile");
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
});

test("insert coin plays the same effect with reduced motion on", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Insert coin and choose a game" }).click();
  await expect(page.getByText("CREDIT 01")).toBeVisible();
  expect(page.url()).not.toContain("/play");
  expect(await page.locator(".coin-dropping").evaluate((e) => getComputedStyle(e).animationName)).toBe("coin-drop");
  const zoom = page.locator(".crt-zoom");
  await zoom.waitFor({ state: "attached" });
  expect(await zoom.evaluate((e) => getComputedStyle(e).animationName)).toBe("crt-zoom");
  await page.waitForURL("**/play");
  await ctx.close();
});

test("reduced motion: shake and flashes default off", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/me");
  await expect(page.locator("#shake")).toHaveValue("0");
  await expect(page.getByLabel("Hit flashes")).not.toBeChecked();
  await ctx.close();
});

test("defaults to the SOL skin", async ({ page }) => {
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("sol");
});

test("cards: the game filter changes what's shown", async ({ page }) => {
  await page.goto("/cards");
  await expect(page.locator("section.win")).toHaveCount(3);
  await page.getByRole("button", { name: "Bear Escape" }).click();
  await expect(page.locator("section.win")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Bear Escape" })).toBeVisible();
});

test("music: on by default, the nav button turns it off and remembers", async ({ page }, info) => {
  test.skip(info.project.name === "mobile");
  await page.goto("/");
  await page.getByRole("button", { name: "Music" }).click();
  const sw = page.getByRole("switch", { name: "Arcade music" });
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("slider", { name: "Music volume" })).toBeVisible();
  await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", "false");
  await page.reload();
  await page.getByRole("button", { name: "Music" }).click();
  await expect(page.getByRole("switch", { name: "Arcade music" })).toHaveAttribute("aria-checked", "false");
});

test("music: only one track ever plays (lobby off game pages, the game's own song on them)", async ({ browser }, info) => {
  test.skip(info.project.name === "mobile");
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    localStorage.setItem("mc:audio:v2", JSON.stringify({ muted: false, music: 0.5, sfx: 0.8, site: true }));
    const live = new Set<number>();
    const si = window.setInterval.bind(window), ci = window.clearInterval.bind(window);
    window.setInterval = ((fn: TimerHandler, ms?: number, ...a: unknown[]) => {
      const id = si(fn, ms, ...a);
      if (ms === 50) live.add(id);
      return id;
    }) as typeof window.setInterval;
    window.clearInterval = ((id?: number) => {
      if (id !== undefined) live.delete(id);
      ci(id);
    }) as typeof window.clearInterval;
    (window as unknown as { __tracks: () => number }).__tracks = () => live.size;
  });
  const page = await ctx.newPage();
  const tracks = () => page.evaluate(() => (window as unknown as { __tracks: () => number }).__tracks());
  await page.goto("/");
  await page.waitForTimeout(500);
  await page.mouse.click(10, 300);
  await expect.poll(tracks).toBe(1);
  for (const name of ["Moonshot", "Bear Escape", "Cards", "HODL Quest", "Roadmap"]) {
    await page.getByRole("link", { name }).first().click();
    await page.waitForTimeout(300);
    expect(await tracks()).toBe(1);
  }
  await ctx.close();
});

test("reduced motion keeps the billboard on one line", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  const box = (await page.locator(".billboard").boundingBox())!;
  expect(box.height).toBeLessThan(90);
  await ctx.close();
});

test("how to play fits beside the game with no inner scrolling", async ({ page }, info) => {
  test.skip(info.project.name === "mobile");
  for (const g of ["flap", "run"]) {
    await page.goto(`/play/${g}`);
    const card = page.locator(".htp");
    const [screen, box] = [await page.locator("main .crt").boundingBox(), await card.boundingBox()];
    expect(Math.abs(screen!.height - box!.height)).toBeLessThan(2);
    expect(Math.abs(screen!.width - box!.width)).toBeLessThan(2);
    expect(await card.evaluate((e) => e.scrollHeight <= e.clientHeight + 1)).toBe(true);
  }
});

test("the footer sits flat on the bottom of short pages", async ({ page }) => {
  await page.goto("/nowhere");
  const bottom = await page.evaluate(() => document.querySelector("footer")!.getBoundingClientRect().bottom);
  expect(Math.abs(bottom - page.viewportSize()!.height)).toBeLessThan(1);
});

test("no em dashes anywhere on the page", async ({ page }) => {
  for (const path of ["/", "/play/flap", "/play/diamond", "/cards", "/roadmap", "/me"]) {
    await page.goto(path);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.body.innerText.includes("\u2014"))).toBe(false);
  }
});
