export type ThemeId = "sol" | "eth" | "robin";
export const THEME_IDS: ThemeId[] = ["sol", "eth", "robin"];
export type Scenery = "synth" | "crystal" | "forest";

export interface Theme {
  id: ThemeId;
  name: string;
  world: string;
  letter: string;
  motto: string;
  story: string;
  scenery: Scenery;

  accent: string;
  accentDeep: string;
  accentInk: string;
  coin: [string, string, string];

  sky: string[];
  sun: string;
  sunGlow: string;
  far: string;
  mid: string;
  near: string;
  ground: string;
  groundTop: string;
  groundDark: string;
  up: string;
  upDark: string;
  down: string;
  downDark: string;
  hazard: string;
  hazardDark: string;
  gold: string;
  goldDark: string;
  star: string;
  ink: string;
  outline: string;
  bg: string;
  surface: string;
  muted: string;
  particle: string;

  music: { lead: OscillatorType; bass: OscillatorType; pad: OscillatorType; transpose: number; swing: number };
}

export const THEMES: Record<ThemeId, Theme> = {
  sol: {
    id: "sol",
    name: "SOL",
    world: "Neon Rush",
    letter: "S",
    motto: "Fast blocks, faster hands.",
    story: "A synthwave sunset that never ends. Neon grid, magenta peaks, a striped sun, everything at 400 transactions a second.",
    scenery: "synth",
    accent: "#6a22c2",
    accentDeep: "#4a1290",
    accentInk: "#ffffff",
    coin: ["#2df5c4", "#9b3cf0", "#3a0f73"],
    sky: ["#14062e", "#2a0b52", "#4d0f6e", "#7d1478", "#b8207a", "#f0496b", "#ff8a4c"],
    sun: "#ffd447",
    sunGlow: "#ff6b8a",
    far: "#3b0f63",
    mid: "#5a1680",
    near: "#1a0636",
    ground: "#1f0a40",
    groundTop: "#2df5c4",
    groundDark: "#12052a",
    up: "#2df5c4",
    upDark: "#0f8a6c",
    down: "#ff4fd8",
    downDark: "#8c1a77",
    hazard: "#ff9a2e",
    hazardDark: "#8a3a00",
    gold: "#ffd447",
    goldDark: "#a8760a",
    star: "#ffd6f6",
    ink: "#fff3ff",
    outline: "#0b0318",
    bg: "#0e0420",
    surface: "#1d0a3b",
    muted: "#c7a6e8",
    particle: "#2df5c4",
    music: { lead: "sawtooth", bass: "square", pad: "triangle", transpose: 0, swing: 0 },
  },
  eth: {
    id: "eth",
    name: "ETH",
    world: "Crystal Sky",
    letter: "E",
    motto: "Calm hands, crystal clear.",
    story: "Daylight above the clouds. Floating crystal shards, lavender peaks, ice-blue light. A slow, deliberate world built to last.",
    scenery: "crystal",
    accent: "#3445b4",
    accentDeep: "#232f85",
    accentInk: "#ffffff",
    coin: ["#e9edff", "#8f9df0", "#3c4aa8"],
    sky: ["#7f8be0", "#97a3ec", "#b2bbf3", "#cbd2f8", "#e0e5fb", "#f1f3ff"],
    sun: "#ffffff",
    sunGlow: "#dfe6ff",
    far: "#c5bdf0",
    mid: "#9f95dc",
    near: "#6d62b8",
    ground: "#5a4fa8",
    groundTop: "#eef1ff",
    groundDark: "#3d3483",
    up: "#7fe3ff",
    upDark: "#2f8fb8",
    down: "#b48cff",
    downDark: "#5d3fb0",
    hazard: "#ff5e57",
    hazardDark: "#8a1c18",
    gold: "#ffc832",
    goldDark: "#9a6c00",
    star: "#ffffff",
    ink: "#1e1b4a",
    outline: "#1a1640",
    bg: "#2c2670",
    surface: "#3a3388",
    muted: "#d6d9ff",
    particle: "#ffffff",
    music: { lead: "triangle", bass: "sine", pad: "sine", transpose: 2, swing: 0 },
  },
  robin: {
    id: "robin",
    name: "ROBIN",
    world: "Sherwood Market",
    letter: "R",
    motto: "Take from the bears. Give to the bulls.",
    story: "Dusk in the outlaws' forest. Pines in three layers, a harvest moon, fireflies, gold in the treetops, and a green ticker that only goes up.",
    scenery: "forest",
    accent: "#0b6e39",
    accentDeep: "#074d27",
    accentInk: "#ffffff",
    coin: ["#d8ff5a", "#13a356", "#0a4a26"],
    sky: ["#081a1c", "#0d2a27", "#153b2f", "#2a5134", "#5a6a35", "#b0842f", "#e2a73e"],
    sun: "#ffcf6b",
    sunGlow: "#ffaa3b",
    far: "#173a2c",
    mid: "#0f2b20",
    near: "#081a13",
    ground: "#3b2a1a",
    groundTop: "#5fd35a",
    groundDark: "#24180e",
    up: "#5fd35a",
    upDark: "#24803a",
    down: "#ff5a4f",
    downDark: "#8a1f18",
    hazard: "#ff7a2e",
    hazardDark: "#7a2a00",
    gold: "#ffd23f",
    goldDark: "#a87a00",
    star: "#fff1b8",
    ink: "#f4ffe8",
    outline: "#050c08",
    bg: "#06120d",
    surface: "#0f241a",
    muted: "#a9d6a0",
    particle: "#e8ff6b",
    music: { lead: "square", bass: "triangle", pad: "triangle", transpose: -2, swing: 0.12 },
  },
};

export function applySiteTheme(t: Theme) {
  const r = document.documentElement.style;
  r.setProperty("--accent", t.accent);
  r.setProperty("--accent-deep", t.accentDeep);
  r.setProperty("--accent-ink", t.accentInk);
  r.setProperty("--gold", "#9a6400");
  document.documentElement.dataset.theme = t.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t.accentDeep);
}

export const normalizeTheme = (id: string | undefined): ThemeId => (id === "sol" || id === "eth" || id === "robin" ? id : "sol");
