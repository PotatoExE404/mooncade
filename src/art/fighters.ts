import { bake, ellipse, limb, mirror, poly, type Draw } from "./bake";

export type FighterId = "vex" | "oracle" | "rocco";
export const FIGHTER_IDS: FighterId[] = ["vex", "oracle", "rocco"];

export interface FighterSpec {
  id: FighterId;
  name: string;
  blurb: string;
  skin: string; skinShade: string;
  hair: string; hairShade: string; hairLight: string;
  top: string; topShade: string; trim: string;
  bottom: string; bottomShade: string;
  boots: string; hands: string; eye: string; extra: string;
}

export const FIGHTERS: Record<FighterId, FighterSpec> = {
  vex: {
    id: "vex", name: "Vex", blurb: "Commando. Never blinks first.",
    skin: "#f2c4a0", skinShade: "#c98f6c", hair: "#e8262f", hairShade: "#8f1020", hairLight: "#ff6a5a",
    top: "#7d9a2c", topShade: "#4c6118", trim: "#efeee4", bottom: "#6f8a25", bottomShade: "#45591a",
    boots: "#3a3d44", hands: "#1b1b22", eye: "#ffd23f", extra: "#ffffff",
  },
  oracle: {
    id: "oracle", name: "Oracle", blurb: "Reads the chart before it moves.",
    skin: "#f1d0b8", skinShade: "#c9a088", hair: "#d23a86", hairShade: "#7d1550", hairLight: "#ff7fbf",
    top: "#6a3be0", topShade: "#3c1f95", trim: "#f5c531", bottom: "#4f2bb0", bottomShade: "#2c176e",
    boots: "#2a174f", hands: "#f1d0b8", eye: "#3a1030", extra: "#e2462b",
  },
  rocco: {
    id: "rocco", name: "Rocco", blurb: "Loud, loaded, always long.",
    skin: "#eab07a", skinShade: "#b97d4f", hair: "#ffd43b", hairShade: "#c48f0f", hairLight: "#fff08a",
    top: "#d2432b", topShade: "#8a2414", trim: "#f2efe6", bottom: "#cdae67", bottomShade: "#8e7638",
    boots: "#1e1d22", hands: "#eab07a", eye: "#24160e", extra: "#5a3a22",
  },
};

export type PoseName = "idle0" | "idle1" | "run0" | "run1" | "run2" | "run3" | "jump" | "fall" | "slide" | "hurt" | "cheer";
export const POSES: PoseName[] = ["idle0", "idle1", "run0", "run1", "run2", "run3", "jump", "fall", "slide", "hurt", "cheer"];

interface Pose { legs: [number, number]; arms: [number, number]; bob: number; crouch: number }
const P: Record<PoseName, Pose> = {
  idle0: { legs: [0.12, -0.12], arms: [0.3, -0.3], bob: 0, crouch: 0 },
  idle1: { legs: [0.12, -0.12], arms: [0.36, -0.36], bob: 0.7, crouch: 0 },
  run0: { legs: [0.75, -0.65], arms: [-0.8, 0.8], bob: 0, crouch: 0 },
  run1: { legs: [0.25, -0.1], arms: [-0.2, 0.2], bob: -0.8, crouch: 0 },
  run2: { legs: [-0.65, 0.75], arms: [0.8, -0.8], bob: 0, crouch: 0 },
  run3: { legs: [-0.1, 0.25], arms: [0.2, -0.2], bob: -0.8, crouch: 0 },
  jump: { legs: [0.9, -0.2], arms: [-2.0, 2.3], bob: -0.5, crouch: 0 },
  fall: { legs: [-0.35, 0.45], arms: [1.6, -1.6], bob: 0, crouch: 0 },
  slide: { legs: [1.35, 1.2], arms: [-1.9, 2.0], bob: 3.6, crouch: 1 },
  hurt: { legs: [0.5, -0.5], arms: [-2.7, 2.7], bob: -0.4, crouch: 0 },
  cheer: { legs: [0.2, -0.2], arms: [-2.3, 2.5], bob: -0.6, crouch: 0 },
};

export const SPRITE_W = 18;
export const SPRITE_H = 24;

export function headCentre(pose: PoseName): [number, number] {
  const p = P[pose];
  return [9.6 + p.crouch * 1.5, 7 + p.bob];
}

function drawHairBack(g: CanvasRenderingContext2D, f: FighterSpec, hx: number, hy: number) {
  if (f.id === "vex") {
    g.strokeStyle = f.hairShade;
    g.lineWidth = 3.2;
    g.beginPath();
    g.moveTo(hx - 1.5, hy - 4.2);
    g.quadraticCurveTo(hx - 7.5, hy - 7.5, hx - 7.8, hy + 1.5);
    g.stroke();
    g.strokeStyle = f.hair;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(hx - 1.5, hy - 4.4);
    g.quadraticCurveTo(hx - 6.8, hy - 7.2, hx - 7.2, hy + 0.6);
    g.stroke();
    ellipse(g, hx - 1.6, hy - 4.6, 1.1, 1, f.extra);
  } else if (f.id === "oracle") {
    for (const [dx, dy, r] of [[-4.4, -1.6, 2.6], [-5, 1.5, 2.4], [-4.6, 4.4, 2.2], [-2.8, 6.4, 1.9], [-1.4, -4.3, 2.6], [2, -4.8, 2.6], [4.6, -2.6, 2.1]] as const)
      ellipse(g, hx + dx, hy + dy, r, r, f.hairShade);
  } else {
    poly(g, [hx - 4.2, hy - 1.6, hx - 8, hy - 2.8, hx - 7.6, hy - 1.2, hx - 4.2, hy - 0.4], f.trim);
    poly(g, [hx - 4.2, hy - 1, hx - 7.4, hy + 0.6, hx - 6.6, hy + 1.6, hx - 4.2, hy], f.trim);
  }
}

function drawHairFront(g: CanvasRenderingContext2D, f: FighterSpec, hx: number, hy: number) {
  if (f.id === "vex") {
    ellipse(g, hx - 0.4, hy - 2.5, 4.9, 2.7, f.hair);
    ellipse(g, hx - 1.4, hy - 3.3, 2.4, 1.1, f.hairLight);

    poly(g, [hx - 4.7, hy - 2.2, hx + 4.8, hy - 2.4, hx + 4.6, hy + 0.6, hx + 3.4, hy - 0.8, hx + 2.2, hy + 0.2, hx + 1.1, hy - 1, hx - 0.2, hy - 0.1, hx - 1.4, hy - 1, hx - 2.6, hy + 0.4, hx - 4.6, hy + 3.4], f.hair);
  } else if (f.id === "oracle") {
    for (const [dx, dy, r] of [[-3, -3.2, 2.3], [0.4, -3.9, 2.4], [3.4, -3, 2], [-4, -0.4, 1.7]] as const) ellipse(g, hx + dx, hy + dy, r, r, f.hair);
    ellipse(g, hx + 0.6, hy - 4.6, 1.2, 0.8, f.hairLight);
    ellipse(g, hx + 3.6, hy - 4.4, 0.9, 0.9, f.trim);
    poly(g, [hx - 4.2, hy - 1.2, hx + 4.6, hy - 1.6, hx + 4.2, hy + 0.4, hx + 1, hy - 0.4, hx - 2, hy + 0.6], f.hair);
  } else {
    poly(g, [hx - 4.6, hy - 1, hx - 5.4, hy - 4.8, hx - 3, hy - 3.8, hx - 2.4, hy - 6.8, hx - 0.4, hy - 4.6, hx + 1, hy - 7.4, hx + 2.2, hy - 4.6, hx + 4.4, hy - 6.2, hx + 4.2, hy - 3.2, hx + 6, hy - 2.6, hx + 4.8, hy - 0.8], f.hair);
    poly(g, [hx - 2.6, hy - 4.2, hx - 1.4, hy - 5.6, hx - 0.6, hy - 4.2], f.hairLight);
    g.fillStyle = f.trim;
    g.fillRect(hx - 4.8, hy - 1.7, 9.8, 1.5);
  }
}

function drawBody(g: CanvasRenderingContext2D, f: FighterSpec, pose: Pose) {
  const by = 0.6 + pose.bob;
  const c = pose.crouch;
  const hipY = 16.6 + by - c * 2.5;
  const shoulderY = 12 + by + c * 0.5;
  const legLen = 5.6 - c * 1.2;

  limb(g, 7.4, shoulderY, pose.arms[1], 4.2, 1.6, f.topShade, { color: f.hands, r: 1 });
  const [, by1] = limb(g, 8.2, hipY, pose.legs[1], legLen, 2, f.bottomShade, { color: f.boots, r: 1.25 });
  limb(g, 10.2, hipY, pose.legs[0], legLen, 2.1, f.id === "vex" ? f.skin : f.bottom, { color: f.boots, r: 1.3 });
  void by1;
  if (f.id === "vex") {
    g.fillStyle = f.bottom;
    g.fillRect(6.6, hipY - 0.8, 5, 2.4);
  }

  g.fillStyle = f.top;
  g.beginPath();
  g.roundRect(6.2, shoulderY - 1.2, 6, hipY - shoulderY + 1.4, 1.6);
  g.fill();
  g.fillStyle = f.topShade;
  g.fillRect(6.2, shoulderY + 1.4, 1.6, hipY - shoulderY - 1.6);
  if (f.id === "vex") {
    g.fillStyle = f.skin;
    g.fillRect(6.8, hipY - 2.2, 4.8, 1.2);
    g.fillStyle = f.trim;
    g.fillRect(6.4, hipY - 1, 5.6, 0.9);
  } else if (f.id === "oracle") {
    poly(g, [6, hipY - 1, 12.4, hipY - 1, 14.2 - c * 1.5, hipY + 5.6 - c * 2, 4.4, hipY + 5.6 - c * 2], f.bottom);
    poly(g, [4.6, hipY + 4.4 - c * 2, 14, hipY + 4.4 - c * 2, 14.2 - c * 1.5, hipY + 5.6 - c * 2, 4.4, hipY + 5.6 - c * 2], f.trim);
    g.fillStyle = f.extra;
    g.fillRect(6.2, hipY - 1.6, 6, 1.1);
    poly(g, [8.4, shoulderY - 1, 10.6, shoulderY - 1, 9.5, shoulderY + 2.2], f.trim);
  } else {
    g.fillStyle = f.trim;
    g.fillRect(8.4, shoulderY - 1, 1.6, hipY - shoulderY);
    g.strokeStyle = f.extra;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(6.4, shoulderY - 0.6);
    g.lineTo(12, hipY - 1.2);
    g.stroke();
    for (let i = 0; i < 4; i++) ellipse(g, 7 + i * 1.4, shoulderY + 0.2 + i * ((hipY - shoulderY - 1.6) / 4), 0.45, 0.45, "#ffd23f");
  }

  limb(g, 11.6, shoulderY, pose.arms[0], 4.3, 1.7, f.top, { color: f.hands, r: 1.05 });
}

function drawHead(g: CanvasRenderingContext2D, f: FighterSpec, hx: number, hy: number) {
  ellipse(g, hx, hy + 0.3, 4.3, 4.1, f.skin);
  ellipse(g, hx - 2.4, hy + 1.2, 1.6, 2.4, f.skinShade);
  ellipse(g, hx + 3.6, hy + 1.6, 0.8, 0.8, f.skin);
}

function palette(f: FighterSpec): string[] {
  return [f.skin, f.skinShade, f.hair, f.hairShade, f.hairLight, f.top, f.topShade, f.trim, f.bottom, f.bottomShade, f.boots, f.hands, f.extra, "#ffd23f"];
}

function eyes(f: FighterSpec, hx: number, hy: number, pose: PoseName) {
  return (px: (x: number, y: number, c: string) => void) => {
    const ey = hy + 0.9;
    if (pose === "hurt") {
      px(hx + 0.6, ey, f.eye); px(hx + 2.8, ey, f.eye);
      return;
    }
    const col = f.id === "vex" ? "#ffd23f" : f.eye;
    px(hx + 0.6, ey, col); px(hx + 0.6, ey + 1, f.id === "vex" ? "#c98f00" : col);
    px(hx + 2.8, ey, col); px(hx + 2.8, ey + 1, f.id === "vex" ? "#c98f00" : col);
    if (f.id === "rocco") { px(hx + 1.2, hy + 3.2, "#ffffff"); px(hx + 2.2, hy + 3.2, "#ffffff"); }
  };
}

export interface FighterSheet {
  right: Record<PoseName, HTMLCanvasElement>;
  left: Record<PoseName, HTMLCanvasElement>;
}

export function bakeFighter(id: FighterId, photoHead?: HTMLCanvasElement | null): FighterSheet {
  const f = FIGHTERS[id];
  const right = {} as Record<PoseName, HTMLCanvasElement>;
  const left = {} as Record<PoseName, HTMLCanvasElement>;
  for (const name of POSES) {
    const pose = P[name];
    const [hx, hy] = headCentre(name);
    const draw: Draw = (g) => {
      if (!photoHead) drawHairBack(g, f, hx, hy);
      drawBody(g, f, pose);
      if (!photoHead) {
        drawHead(g, f, hx, hy);
        drawHairFront(g, f, hx, hy);
      }
    };
    const sprite = bake(SPRITE_W, SPRITE_H, draw, { palette: palette(f), outline: "#0a0612", details: photoHead ? undefined : eyes(f, hx, hy, name) });
    if (photoHead) {
      const g = sprite.getContext("2d")!;
      g.drawImage(photoHead, Math.round(hx - photoHead.width / 2), Math.round(hy - photoHead.height / 2 + 0.5));
    }
    right[name] = sprite;
    left[name] = mirror(sprite);
  }
  return { right, left };
}

const cache = new Map<string, FighterSheet>();

export function fighterSheet(id: FighterId, head?: { key: string; canvas: HTMLCanvasElement } | null): FighterSheet {
  const key = `${id}:${head?.key ?? "house"}`;
  let s = cache.get(key);
  if (!s) {
    s = bakeFighter(id, head?.canvas);
    cache.set(key, s);
  }
  return s;
}
