import { canvas } from "../art/bake";
import { fighterSheet, type FighterId } from "../art/fighters";
import { coinFrames, gemFrames, rocketFrames, headOf } from "../art/props";
import { gameHead, headCanvas, headKey } from "../art/heads";
import { scenery, sky, sun } from "../games/common";
import type { CardDto } from "./types";
import { formatScore, GAME_NAMES, type Rarity } from "../shared/rules";
import { GEM_TOTAL } from "../sim/diamond";
import { THEMES } from "../themes/themes";

const CARD_INK = "#f6f2ff";

export const CARD_W = 120;
export const CARD_H = 168;
const S = 4;

export const RARITY_COLOR: Record<Rarity, string> = { common: "#c9cbd6", rare: "#6fd3ff", epic: "#c06bff", legendary: "#ffd23f", mythic: "#ff5fd2", cosmic: "#7dfff0" };
export const RARITY_LABEL: Record<Rarity, string> = { common: "COMMON", rare: "RARE", epic: "EPIC", legendary: "LEGENDARY", mythic: "MYTHIC", cosmic: "COSMIC" };

const UNIT: Record<string, string> = { flap: "CANDLES", run: "POINTS", diamond: "RUN TIME" };

async function fonts() {
  try {
    await Promise.all([document.fonts.load("700 40px 'Pixelify Sans'"), document.fonts.load("400 24px 'Geist Mono Variable'")]);
  } catch {  }
}

export async function drawCard(card: CardDto, opts: { head?: string | null } = {}): Promise<HTMLCanvasElement> {
  await fonts();
  const theme = THEMES[card.custom?.frame ?? card.theme];
  const art = THEMES[card.theme];
  const rc = RARITY_COLOR[card.rarity];
  const c = canvas(CARD_W * S, CARD_H * S);
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  const px = (x: number, y: number, w: number, h: number, color: string) => {
    g.fillStyle = color;
    g.fillRect(x * S, y * S, w * S, h * S);
  };

  px(0, 0, CARD_W, CARD_H, theme.outline);
  px(1, 1, CARD_W - 2, CARD_H - 2, rc);
  px(3, 3, CARD_W - 6, CARD_H - 6, theme.outline);
  px(4, 4, CARD_W - 8, CARD_H - 8, theme.surface);

  for (const [x, y] of [[1, 1], [CARD_W - 3, 1], [1, CARD_H - 3], [CARD_W - 3, CARD_H - 3]]) px(x, y, 2, 2, theme.outline);

  g.fillStyle = CARD_INK;
  g.font = `700 ${9 * S}px 'Pixelify Sans', monospace`;
  g.textBaseline = "top";
  g.fillText(GAME_NAMES[card.game].toUpperCase(), 8 * S, 7 * S);
  g.font = `500 ${5 * S}px 'Geist Mono Variable', monospace`;
  g.fillStyle = theme.muted;
  g.textAlign = "right";
  g.fillText(`#${String(card.serial).padStart(4, "0")}`, (CARD_W - 8) * S, 9 * S);
  g.textAlign = "left";

  const ax = 8, ay = 20, aw = CARD_W - 16, ah = 82;
  px(ax - 1, ay - 1, aw + 2, ah + 2, theme.outline);
  g.save();
  g.beginPath();
  g.rect(ax * S, ay * S, aw * S, ah * S);
  g.clip();
  const backdrop = card.custom?.backdrop ?? "sky";
  if (backdrop === "void") px(ax, ay, aw, ah, art.bg);
  else {
    g.drawImage(sky(art, aw, ah), ax * S, ay * S, aw * S, ah * S);
    const sn = sun(art, 12);
    g.drawImage(sn, (ax + aw - sn.width - 2) * S, (ay + 2) * S, sn.width * S, sn.height * S);
    const far = scenery(art, "far", 120, 50);
    g.drawImage(far, 0, 0, aw, 50, ax * S, (ay + ah - 50) * S, aw * S, 50 * S);
    if (backdrop === "chart") {
      const mid = scenery(art, "mid", 120, 40);
      g.drawImage(mid, 0, 0, aw, 40, ax * S, (ay + ah - 40) * S, aw * S, 40 * S);
    }
  }

  if (card.rarity !== "common" && card.rarity !== "rare") {
    for (let i = 0; i < 18; i++) {
      const sx = ax + ((i * 37 + card.serial * 13) % aw), sy = ay + ((i * 23 + card.serial * 7) % (ah - 20));
      px(sx, sy, 1, 1, rc);
      if (i % 3 === 0) {
        px(sx - 1, sy, 3, 1, rc);
        px(sx, sy - 1, 1, 3, rc);
      }
    }
  }

  let headC: HTMLCanvasElement | null = null;
  const headUrl = opts.head ?? card.player.avatar;
  let portraitC: HTMLCanvasElement | null = null;
  if (headUrl) {
    headC = await gameHead(headUrl).catch(() => null);
    portraitC = await headCanvas(headUrl).catch(() => null);
  }
  const sheet = fighterSheet(card.player.fighter as FighterId, headC ? { key: headKey(headUrl!), canvas: headC } : null);
  const spr = sheet.right.cheer;
  if (portraitC) {
    const ps = portraitC.width >= 40 ? 1 : 1.5;
    const pw = portraitC.width * ps;
    px(ax + 5, ay + 7, pw + 2, pw + 2, theme.outline);
    g.drawImage(portraitC, (ax + 6) * S, (ay + 8) * S, pw * S, pw * S);
    g.drawImage(spr, (ax + aw - spr.width * 2 - 4) * S, (ay + ah - spr.height * 2 - 2) * S, spr.width * 2 * S, spr.height * 2 * S);
  } else {
    const fs = 3;
    g.drawImage(spr, (ax + aw / 2 - (spr.width * fs) / 2 - 10) * S, (ay + ah - spr.height * fs - 2) * S, spr.width * fs * S, spr.height * fs * S);

    if (card.game === "flap") {
      const r = rocketFrames(art, headOf(sheet), `card:${card.player.fighter}:house`)[1];
      g.drawImage(r, (ax + aw - 46) * S, (ay + 36) * S, r.width * 2 * S, r.height * 2 * S);
    } else if (card.game === "run") {
      const coin = coinFrames(art)[0];
      for (let i = 0; i < 3; i++) g.drawImage(coin, (ax + aw - 30 + i * 6) * S, (ay + 30 + i * 12) * S, coin.width * 2 * S, coin.height * 2 * S);
    } else {
      const gem = gemFrames()[0];
      g.drawImage(gem, (ax + aw - 34) * S, (ay + 34) * S, gem.width * 2 * S, gem.height * 2 * S);
    }
  }
  if (card.custom?.caption) {
    g.font = `700 ${6 * S}px 'Pixelify Sans', monospace`;
    let text = card.custom.caption;
    const max = (aw - 10) * S;
    while (text.length > 1 && g.measureText(text).width > max) text = text.slice(0, -1);
    if (text !== card.custom.caption) text = text.slice(0, -1) + "…";
    const w = Math.ceil(g.measureText(text).width / S) + 8;
    const rx = ax + Math.round((aw - w) / 2), ry = ay + ah - 13;
    px(rx - 1, ry - 1, w + 2, 11, theme.outline);
    px(rx, ry, w, 9, CARD_INK);
    g.fillStyle = theme.bg;
    g.textAlign = "center";
    g.fillText(text, (rx + w / 2) * S, (ry + 1.5) * S);
    g.textAlign = "left";
  }
  g.restore();

  g.fillStyle = CARD_INK;
  g.font = `700 ${20 * S}px 'Pixelify Sans', monospace`;
  const label = card.game === "run" ? `${card.stats.metres?.toLocaleString("en-US") ?? card.score} M` : formatScore(card.game, card.score);
  g.fillText(label, 8 * S, 106 * S);
  g.font = `500 ${4.5 * S}px 'Geist Mono Variable', monospace`;
  g.fillStyle = theme.muted;
  const sub =
    card.game === "flap" ? `${UNIT.flap} · LEVEL ${card.stats.level ?? 1}` : card.game === "run" ? `${card.stats.coins ?? 0} COINS · ${card.score.toLocaleString("en-US")} PTS` : `${card.stats.gems ?? 0}/${GEM_TOTAL} GEMS · ${card.stats.deaths ?? 0} DEATHS`;
  g.fillText(sub.toUpperCase(), 8 * S, 129 * S);
  g.fillStyle = rc;
  g.font = `700 ${6 * S}px 'Pixelify Sans', monospace`;
  g.fillText(card.reason.toUpperCase(), 8 * S, 137 * S);

  px(4, 148, CARD_W - 8, 1, theme.outline);
  g.fillStyle = CARD_INK;
  g.font = `600 ${5 * S}px 'Geist Mono Variable', monospace`;
  g.fillText(card.custom?.name || card.player.display, 8 * S, 153 * S);
  g.textAlign = "right";
  g.fillStyle = rc;
  g.font = `700 ${6 * S}px 'Pixelify Sans', monospace`;
  g.fillText(RARITY_LABEL[card.rarity], (CARD_W - 8) * S, 152 * S);
  g.textAlign = "left";
  return c;
}

export async function exportCard(card: CardDto, head?: string | null): Promise<Blob> {
  await fonts();
  const art = await drawCard(card, { head });
  const theme = THEMES[card.custom?.frame ?? card.theme];
  const out = canvas(1080, 1350);
  const g = out.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  const bg = g.createLinearGradient(0, 0, 0, 1350);
  theme.sky.forEach((c, i) => bg.addColorStop(i / Math.max(1, theme.sky.length - 1), c));
  g.fillStyle = bg;
  g.fillRect(0, 0, 1080, 1350);
  const glow = g.createRadialGradient(540, 620, 80, 540, 620, 700);
  glow.addColorStop(0, "rgba(255,255,255,0.28)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, 1080, 1350);
  const w = 720, h = 1008;
  g.fillStyle = "rgba(0, 0, 0, 0.35)";
  g.fillRect((1080 - w) / 2 + 18, 138, w, h);
  g.drawImage(art, (1080 - w) / 2, 120, w, h);
  g.textAlign = "center";
  g.fillStyle = "#ffffff";
  g.shadowColor = "rgba(0,0,0,0.6)";
  g.shadowOffsetY = 4;
  g.font = "700 56px 'Pixelify Sans', monospace";
  g.fillText("MOONCADE", 540, 1236);
  g.shadowColor = "transparent";
  g.font = "600 24px 'Geist Mono Variable', monospace";
  g.fillStyle = "rgba(255,255,255,0.85)";
  g.fillText("COMMUNITY ARCADE", 540, 1284);
  return new Promise((resolve) => out.toBlob((b) => resolve(b!), "image/png"));
}
