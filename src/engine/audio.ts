import type { GameId } from "../sim";
import type { Theme } from "../themes/themes";

type Wave = OscillatorType;
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfxBus!: GainNode;
  musicBus!: GainNode;
  private noise: AudioBuffer | null = null;
  private musicTimer = 0;
  private musicTheme: Theme | null = null;
  private musicKey = "";
  private song: Song | null = null;
  private level = 1;
  private nextNoteTime = 0;
  private step = 0;
  settings = { muted: false, music: 0.5, sfx: 0.8, site: true };

  constructor() {
    try {
      localStorage.removeItem("mc:audio");
      const saved = JSON.parse(localStorage.getItem("mc:audio:v2") ?? "null");
      if (saved) this.settings = { ...this.settings, ...saved };
    } catch {  }
  }

  unlock() {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

      const nav = navigator as Navigator & { audioSession?: { type: string } };
      if (nav.audioSession) nav.audioSession.type = "playback";
      this.apply();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  apply() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : 1, t, 0.02);
    this.sfxBus.gain.setTargetAtTime(this.settings.sfx * 0.5, t, 0.02);
    this.musicBus.gain.setTargetAtTime(this.settings.music * 0.22, t, 0.05);
    try { localStorage.setItem("mc:audio:v2", JSON.stringify(this.settings)); } catch {  }
  }

  private listeners = new Set<() => void>();

  subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  set(patch: Partial<AudioEngine["settings"]>) {
    this.settings = { ...this.settings, ...patch };
    this.apply();
    this.listeners.forEach((l) => l());
  }

  private tone(freq: number, dur: number, wave: Wave, vol: number, slide = 0, at = 0, bus?: GainNode) {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime + at;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus ?? this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private hiss(dur: number, vol: number, from: number, to: number, at = 0) {
    const c = this.ctx;
    if (!c || !this.noise) return;
    const t = c.currentTime + at;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfxBus);
    src.start(t);
    src.stop(t + dur);
  }

  flap() { this.hiss(0.12, 0.35, 900, 3000); this.tone(220 * (0.96 + Math.random() * 0.08), 0.09, "square", 0.08, 1.8); }
  jump() { this.tone(330 * (0.97 + Math.random() * 0.06), 0.12, "square", 0.1, 2.1); }
  land(strength: number) { this.hiss(0.06 + strength * 0.06, 0.12 + strength * 0.25, 500, 120); }

  chime(step: number) {
    const ladder = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    const n = 76 + ladder[Math.min(step, ladder.length - 1)];
    this.tone(midi(n), 0.09, "square", 0.09);
    this.tone(midi(n + 12), 0.14, "triangle", 0.06, 1, 0.04);
  }
  gem() { [0, 4, 7, 12].forEach((s, i) => this.tone(midi(84 + s), 0.12, "triangle", 0.08, 1, i * 0.035)); }
  pickup() { [0, 7, 12, 19].forEach((s, i) => this.tone(midi(76 + s), 0.1, "square", 0.08, 1, i * 0.04)); }
  shieldPop() { this.tone(520, 0.18, "triangle", 0.12, 0.5); this.hiss(0.2, 0.25, 3000, 600); }
  bonus() { this.tone(midi(91), 0.06, "triangle", 0.05, 1); }
  stomp() { this.tone(160, 0.12, "square", 0.14, 0.4); this.hiss(0.08, 0.2, 2000, 400); }
  lane() { this.hiss(0.07, 0.12, 1800, 4000); }
  slide() { this.hiss(0.22, 0.18, 600, 200); }
  stumble() { this.tone(140, 0.2, "sawtooth", 0.12, 0.6); this.hiss(0.15, 0.25, 900, 200); }
  checkpoint() { [0, 7, 12].forEach((s, i) => this.tone(midi(72 + s), 0.12, "square", 0.08, 1, i * 0.06)); }
  die() { this.hiss(0.45, 0.5, 2400, 80); this.tone(180, 0.4, "sawtooth", 0.16, 0.25); this.tone(90, 0.5, "square", 0.12, 0.5, 0.05); }
  fanfare() { [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => this.tone(midi(67 + s), 0.16, "square", 0.09, 1, i * 0.09)); }
  record() { [0, 4, 7, 11, 12, 16, 19, 24].forEach((s, i) => this.tone(midi(72 + s), 0.18, i % 2 ? "triangle" : "square", 0.08, 1, i * 0.07)); }
  click() { this.tone(1200, 0.03, "square", 0.04); }

  startMusic(game: GameId | "site", theme: Theme) {
    if (!this.ctx) return;
    const key = `${game}:${theme.id}`;
    if (this.musicKey === key && this.musicTimer) return;
    this.stopMusic();
    this.musicKey = key;
    this.level = 1;
    this.song = SONGS[game];
    this.musicTheme = theme;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.step = 0;
    this.musicTimer = window.setInterval(() => this.schedule(), 50);
  }

  setLevel(level: number) {
    this.level = Math.max(1, Math.min(9, level));
  }

  levelUp() {
    [0, 4, 7, 12, 16].forEach((s, i) => this.tone(midi(72 + s), 0.14, "square", 0.09, 1, i * 0.06));
    this.hiss(0.3, 0.2, 800, 6000);
  }

  timeUp() {
    this.tone(880, 0.18, "square", 0.12);
    this.tone(660, 0.18, "square", 0.12, 1, 0.2);
    this.tone(440, 0.5, "square", 0.12, 1, 0.4);
  }

  tick() {
    this.tone(1500, 0.04, "square", 0.05);
  }

  launch() {
    this.hiss(1.4, 0.4, 200, 2400);
    this.tone(60, 1.2, "sawtooth", 0.18, 3);
  }

  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = 0;
    this.musicTheme = null;
    this.musicKey = "";
  }

  private drum(kind: "kick" | "snare" | "hat", at: number) {
    const c = this.ctx;
    if (!c || !this.noise) return;
    const t = c.currentTime + at;
    if (kind === "kick") {
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g).connect(this.musicBus);
      o.start(t);
      o.stop(t + 0.18);
      return;
    }
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = kind === "hat" ? "highpass" : "bandpass";
    f.frequency.value = kind === "hat" ? 7000 : 1800;
    const g = c.createGain();
    const dur = kind === "hat" ? 0.035 : 0.12;
    g.gain.setValueAtTime(kind === "hat" ? 0.18 : 0.45, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.musicBus);
    src.start(t);
    src.stop(t + dur);
  }

  private schedule() {
    const c = this.ctx, th = this.musicTheme, song = this.song;
    if (!c || !th || !song) return;
    const sixteenth = 60 / (song.bpm * (1 + Math.min(0.4, (this.level - 1) * 0.05))) / 4;
    const root = song.root + th.music.transpose + Math.floor((this.level - 1) / 3);
    const deg = (d: number) => root + song.scale[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
    while (this.nextNoteTime < c.currentTime + 0.15) {
      const s = this.step;
      const bar = Math.floor(s / 16) % song.prog.length;
      const i = s % 16;
      const chord = song.prog[bar];

      const at = this.nextNoteTime - c.currentTime + (i % 2 ? th.music.swing * sixteenth : 0);
      const m = song.melody[bar][i];
      if (m !== null) this.tone(midi(deg(m + 7)), sixteenth * (song.legato ? 1.8 : 0.95), (song.timbre?.lead ?? th.music.lead), 0.2, 1, at, this.musicBus);
      const b = song.bass[i];
      if (b !== null) this.tone(midi(deg(chord + b) - 12), sixteenth * (song.bassLen ?? 1.6), (song.timbre?.bass ?? th.music.bass), 0.5, 1, at, this.musicBus);
      if (i === 0) for (const k of [0, 2, 4]) this.tone(midi(deg(chord + k)), sixteenth * 15, (song.timbre?.pad ?? th.music.pad), 0.05, 1, at, this.musicBus);
      if (song.kick[i]) this.drum("kick", at);
      if (song.snare[i]) this.drum("snare", at);
      if (song.hat[i] || (this.level >= 3 && i % 2 === 1) || (this.level >= 6 && i % 4 === 2)) this.drum("hat", at);
      if (this.level >= 4 && i === 12) this.drum("snare", at);
      this.nextNoteTime += sixteenth;
      this.step++;
    }
  }
}

type Note = number | null;
interface Song {
  bpm: number;
  root: number;
  scale: number[];
  prog: number[];
  melody: Note[][];
  bass: Note[];
  bassLen?: number;
  kick: number[];
  snare: number[];
  hat: number[];
  legato?: boolean;

  timbre?: { lead: OscillatorType; bass: OscillatorType; pad: OscillatorType };
}

const _ = null;
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const MIXO = [0, 2, 4, 5, 7, 9, 10];
const bits = (str: string) => [...str].map((ch) => (ch === "x" ? 1 : 0));

const SONGS: Record<GameId | "site", Song> = {
  site: {
    bpm: 84,
    root: 60,
    scale: MAJOR,
    prog: [0, 5, 3, 4, 0, 3, 1, 4],
    melody: [
      [4, _, _, _, 2, _, 4, _, 7, _, _, _, _, _, _, _],
      [5, _, _, _, 4, _, 2, _, 0, _, _, _, _, _, _, _],
      [3, _, _, _, 5, _, 7, _, 8, _, _, _, 7, _, _, _],
      [6, _, _, _, 4, _, _, _, 1, _, _, _, _, _, _, _],
      [4, _, _, _, 7, _, 9, _, 7, _, _, _, 4, _, _, _],
      [5, _, _, _, 3, _, 5, _, 7, _, _, _, _, _, _, _],
      [8, _, _, _, 7, _, 5, _, 3, _, _, _, 1, _, _, _],
      [2, _, _, _, _, _, 1, _, 0, _, _, _, _, _, _, _],
    ],
    bass: [0, _, _, _, _, _, _, _, 4, _, _, _, _, _, _, _],
    bassLen: 5,
    kick: bits("x..............."),
    snare: bits("................"),
    hat: bits("........x......."),
    legato: true,
    timbre: { lead: "triangle", bass: "sine", pad: "sine" },
  },

  flap: {
    bpm: 138,
    root: 60,
    scale: MAJOR,
    prog: [0, 4, 5, 3],
    melody: [
      [0, _, 0, 2, 4, _, 2, _, 0, _, -3, _, -2, _, -3, _],
      [-1, _, -1, 1, 2, _, 1, _, -1, _, -3, _, -6, _, -3, _],
      [-2, _, 0, 2, 5, _, 4, _, 2, _, 0, _, -2, _, 0, _],
      [-4, _, -2, 0, 3, _, 2, _, 0, _, -2, _, -3, _, _, _],
    ],
    bass: [0, _, _, _, _, _, _, _, 4, _, _, _, _, _, 4, _],
    kick: bits("x.......x......."),
    snare: bits("....x.......x..."),
    hat: bits("x.x.x.x.x.x.x.x."),
  },

  run: {
    bpm: 164,
    root: 57,
    scale: MINOR,
    prog: [0, 5, 2, 6],
    melody: [
      [0, _, 0, _, 2, _, 3, _, 2, _, 0, _, -3, _, 0, _],
      [-2, _, -2, _, 0, _, 2, _, 0, _, -2, _, -5, _, -2, _],
      [2, _, 2, _, 4, _, 5, _, 4, _, 2, _, 0, _, 2, _],
      [1, _, 1, _, 3, _, 4, _, 3, _, 1, _, -1, _, 1, _],
    ],
    bass: [0, _, 7, _, 0, _, 7, _, 0, _, 7, _, 0, _, 7, _],
    bassLen: 0.9,
    kick: bits("x...x...x...x..."),
    snare: bits("....x.......x..x"),
    hat: bits("..x...x...x...x."),
  },

  diamond: {
    bpm: 120,
    root: 62,
    scale: MIXO,
    prog: [0, 3, 0, 4],
    melody: [
      [-7, _, -5, _, -3, _, 0, _, 2, _, 0, _, -3, _, -5, _],
      [-4, _, -2, _, 0, _, 3, _, 2, _, _, _, 0, _, _, _],
      [-3, _, 0, _, 4, _, 2, _, 0, _, -3, _, 0, _, 2, _],
      [1, _, -1, _, -3, _, -1, _, 1, _, _, _, _, _, _, _],
    ],
    bass: [0, _, _, _, 2, _, _, _, 4, _, _, _, 2, _, _, _],
    bassLen: 3,
    kick: bits("x.......x......."),
    snare: bits("........x......."),
    hat: bits("x...x...x...x..x"),
    legato: true,
  },
};

export const audio = new AudioEngine();

if (import.meta.hot)
  import.meta.hot.dispose(() => {
    audio.stopMusic();
    void audio.ctx?.close();
  });

export const silent = new Proxy({} as AudioEngine, { get: () => () => undefined });
