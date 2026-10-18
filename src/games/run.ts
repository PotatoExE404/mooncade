import { bearFrames, BEAR_W, coinFrames } from "../art/props";
import type { FighterSheet, PoseName } from "../art/fighters";
import { audio as liveAudio, silent } from "../engine/audio";
import { M, RUN, type Obstacle, type RunState } from "../sim/run";
import type { Theme } from "../themes/themes";
import { ambient, drawBoosts, drawFlash, drawFloaters, drawParticles, drawPickup, drawShield, mood, pack, PICKUP_COLOR, PICKUP_LABEL, scenery, secondsText, sky, sun, tile, type Floater, type PickupKind } from "./common";
import type { Presenter } from "./runtime";

const W = 180, H = 320;
const HOR = 116;
const F = 230;
const CAM_H = 2.6;
const CAM_BACK = 4;
const LANE_W = 0.9;
const ROAD_HALF = 1.45;

const proj = (dz: number, x: number, y: number) => ({ sx: W / 2 + (x * F) / dz, sy: HOR + ((CAM_H - y) * F) / dz, s: F / dz });

function quad(g: CanvasRenderingContext2D, pts: number[], fill: string) {
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(Math.round(pts[0]), Math.round(pts[1]));
  for (let i = 2; i < pts.length; i += 2) g.lineTo(Math.round(pts[i]), Math.round(pts[i + 1]));
  g.closePath();
  g.fill();
}

function box(g: CanvasRenderingContext2D, z0: number, z1: number, x0: number, x1: number, y0: number, y1: number, face: string, top: string, side: string, outline: string) {
  if (z0 < 0.6) z0 = 0.6;
  if (z1 <= z0) return;
  const a = proj(z0, x0, y0), b = proj(z0, x1, y1), c = proj(z1, x0, y1), d = proj(z1, x1, y1);

  const cx = (x0 + x1) / 2;
  if (cx < -0.05) quad(g, [b.sx, a.sy, b.sx, b.sy, d.sx, d.sy, proj(z1, x1, y0).sx, proj(z1, x1, y0).sy], side);
  if (cx > 0.05) quad(g, [a.sx, a.sy, a.sx, b.sy, c.sx, c.sy, proj(z1, x0, y0).sx, proj(z1, x0, y0).sy], side);
  if (y1 < CAM_H) quad(g, [a.sx, b.sy, b.sx, b.sy, d.sx, d.sy, c.sx, c.sy], top);
  g.fillStyle = outline;
  g.fillRect(Math.round(a.sx) - 1, Math.round(b.sy) - 1, Math.round(b.sx - a.sx) + 2, Math.round(a.sy - b.sy) + 2);
  g.fillStyle = face;
  g.fillRect(Math.round(a.sx), Math.round(b.sy), Math.round(b.sx - a.sx), Math.round(a.sy - b.sy));
  return { x: Math.round(a.sx), y: Math.round(b.sy), w: Math.round(b.sx - a.sx), h: Math.round(a.sy - b.sy) };
}

function stripes(g: CanvasRenderingContext2D, r: { x: number; y: number; w: number; h: number } | undefined, color: string) {
  if (!r || r.w < 4) return;
  g.save();
  g.beginPath();
  g.rect(r.x, r.y, r.w, r.h);
  g.clip();
  g.fillStyle = color;
  const step = Math.max(4, Math.round(r.h * 1.2));
  for (let x = r.x - r.h; x < r.x + r.w; x += step) {
    g.beginPath();
    g.moveTo(x, r.y + r.h);
    g.lineTo(x + r.h, r.y);
    g.lineTo(x + r.h + step / 2, r.y);
    g.lineTo(x + step / 2, r.y + r.h);
    g.fill();
  }
  g.restore();
}

export function runPresenter(sheet: FighterSheet, quiet = false): Presenter<RunState> {
  const audio = quiet ? silent : liveAudio;
  let deathTick = -1;
  let introUntil = 150;
  let now = 0;
  const floaters: Floater[] = [];
  const float = (text: string, x: number, y: number, color: string) => floaters.push({ text, x, y, color, born: now });
  return {
    W,
    H,
    onTick(s, fx) {
      const e = s.events;
      const px = W / 2, py = 250;
      if (e.jump) { audio.jump(); fx.particles.burst(px, py + 24, 6, Math.PI / 2, 2, 50, 0.3, pack("#d8d0ff")); }
      if (e.land) { audio.land(0.6); fx.particles.burst(px, py + 26, 8, -Math.PI / 2, 2.6, 60, 0.3, pack("#d8d0ff")); }
      if (e.lane) audio.lane();
      if (e.slide) audio.slide();
      if (e.coin) {
        fx.combo = s.tick - fx.comboAt < 40 ? fx.combo + 1 : 0;
        fx.comboAt = s.tick;
        audio.chime(fx.combo);
        fx.particles.burst(px, py - 6, 6, -Math.PI / 2, 1.6, 80, 0.4, pack("#ffd23f"));
      }
      if (e.stumble) {
        audio.stumble();
        fx.shake.add(0.45);
        fx.hitstop.request(60);
        fx.flash = 4;
      }
      if (s.tick === 1) audio.setLevel(1);
      if (e.level) {
        audio.levelUp();
        audio.setLevel(s.level);
        fx.shake.add(0.2);
        for (const c of ["#ffd23f", "#ffffff"]) fx.particles.burst(W / 2, 90, 18, Math.PI / 2, Math.PI * 2, 110, 0.9, pack(c));
      }
      if (e.pickup) {
        audio.pickup();
        const kind = e.pickup as PickupKind;
        fx.particles.burst(px, py - 10, 16, 0, Math.PI * 2, 90, 0.5, pack(PICKUP_COLOR[kind]));
        if (kind !== "time") float(PICKUP_LABEL[kind], px, py - 40, PICKUP_COLOR[kind]);
      }
      if (e.bonus > 0) float(secondsText(e.bonus), W / 2, e.level ? 120 : py - 40, "#7dffa0");
      if (e.shieldPop) {
        audio.shieldPop();
        fx.shake.add(0.35);
        fx.particles.burst(px, py - 8, 24, 0, Math.PI * 2, 120, 0.6, pack("#bfdbfe"));
      }
      if (e.respawn) audio.checkpoint();
      if (e.timeUp) audio.timeUp();
      if (s.started && !s.dead && s.timeLeft <= 600 && s.timeLeft % 60 === 0) audio.tick();
      if (e.die) {
        audio.die();
        deathTick = s.tick;
        fx.shake.add(0.8);
        fx.hitstop.request(110);
        fx.flash = 6;
        fx.particles.burst(px, py, 36, 0, Math.PI * 2, 150, 0.9, pack("#ff6a3d"));
      }
      if (s.tick === 1) introUntil = 150;
    },
    draw(g, s, f, fx) {
      const t = f.theme;
      now = f.time;
      const z = (s.z + (s.dead ? 0 : s.speed * f.alpha)) / M;
      const camZ = z - CAM_BACK;
      g.save();
      g.translate(f.shakeX, f.shakeY);
      g.drawImage(sky(t, W, H), 0, 0);
      const sn = sun(t, t.scenery === "synth" ? 34 : 14);
      if (t.scenery === "synth") g.drawImage(sn, Math.round(W / 2 - sn.width / 2), HOR - sn.height / 2 - 6);
      else g.drawImage(sn, Math.round(W * 0.74 - sn.width / 2), 34 - sn.height / 2);

      const laneT = Math.min(1, (s.tick - s.laneTick + f.alpha) / 7);
      const ease = 1 - (1 - laneT) * (1 - laneT);
      const lanePos = s.prevLane + (s.lane - s.prevLane) * ease;
      const camX = (lanePos - 1) * LANE_W * 0.55;
      tile(g, scenery(t, "far", 240, 70), camX * 30 + z * 0.4, HOR - 70);
      tile(g, scenery(t, "mid", 200, 50), camX * 60 + z * 1.2, HOR - 50);
      ambient(g, t, f.time, W, HOR, 10 + s.level * 2);
      mood(g, s.level, f.time, W, HOR);

      for (let y = HOR + 1; y < H; y++) {
        const dz = (CAM_H * F) / (y - HOR);
        const wz = camZ + dz;
        const half = (ROAD_HALF * F) / dz;
        const cx = W / 2 - (camX * F) / dz;
        const band = Math.floor(wz / 2) & 1;
        g.fillStyle = band ? t.mid : t.far;
        g.fillRect(0, y, W, 1);
        if (t.scenery === "synth") {
          const prevBand = Math.floor((camZ + (CAM_H * F) / (y - 1 - HOR)) / 2) & 1;
          g.fillStyle = t.down;
          if (prevBand !== band) g.fillRect(0, y, W, 1);
          for (let k = 2; k <= 8; k += 1.5)
            for (const sgn of [-1, 1]) g.fillRect(Math.round(cx + (sgn * k * F) / dz), y, 1, 1);
        }
        g.fillStyle = band ? t.ground : t.groundDark;
        g.fillRect(Math.round(cx - half), y, Math.round(half * 2), 1);

        const ew = Math.max(1, Math.round(0.08 * F / dz));
        g.fillStyle = t.groundTop;
        g.fillRect(Math.round(cx - half), y, ew, 1);
        g.fillRect(Math.round(cx + half) - ew, y, ew, 1);
        if (Math.floor(wz / 1.5) & 1) {
          g.fillStyle = t.upDark;
          const lw = Math.max(1, Math.round(0.05 * F / dz));
          g.fillRect(Math.round(cx - (LANE_W / 2) * F / dz), y, lw, 1);
          g.fillRect(Math.round(cx + (LANE_W / 2) * F / dz), y, lw, 1);
        }
      }

      const items = s.obstacles.filter((o) => !((o.kind === "coin" || o.kind === "power") && o.resolved)).map((o) => ({ o, dz: o.z / M - camZ }));
      items.sort((a, b) => b.dz - a.dz);
      const playerDz = CAM_BACK;
      let playerDrawn = false;
      const drawPlayer = () => {
        playerDrawn = true;
        const lx = (lanePos - 1) * LANE_W - camX;
        const p = proj(playerDz, lx, 0);
        const lift = Math.round((s.h / 162) * 42);
        const run = ["run0", "run1", "run2", "run3"] as PoseName[];
        let pose: PoseName = run[Math.floor(z * 1.6) % 4];
        if (s.h > 0) pose = s.vh > 0 ? "jump" : "fall";
        if (s.slide > 0) pose = "slide";
        if (s.crash > 0) pose = "hurt";
        if (s.dead) pose = "idle0";
        if (!s.started) pose = Math.floor(f.time * 2) % 2 ? "idle0" : "idle1";
        const spr = sheet.right[pose];
        const sc = 2;
        const x = Math.round(p.sx - (spr.width * sc) / 2), y = Math.round(p.sy - spr.height * sc + 2 - lift);

        g.fillStyle = t.outline;
        g.globalAlpha = 0.45;
        g.fillRect(Math.round(p.sx) - 12 + Math.min(4, lift >> 3), Math.round(p.sy) - 1, 24 - Math.min(8, lift >> 2), 3);
        g.globalAlpha = 1;
        if (s.shield) drawShield(g, p.sx, y + spr.height * sc * 0.5, 22, f.time);
        if (s.invuln > 0 && Math.floor(s.invuln / 4) % 2 === 0) return;
        if (fx.flash > 0) {
          g.save();
          g.translate(x, y);
          g.scale(sc, sc);
          drawFlash(g, spr, 0, 0);
          g.restore();
        } else g.drawImage(spr, x, y, spr.width * sc, spr.height * sc);
      };
      const coins = coinFrames(t);
      for (const { o, dz } of items) {
        if (!playerDrawn && dz < playerDz) drawPlayer();
        if (dz + o.len / M < 0.7 || dz > 70) continue;
        drawObstacle(g, o, dz, (o.lane - 1) * LANE_W - camX, t, coins, f.time);
      }
      if (!playerDrawn) drawPlayer();

      const bears = bearFrames();
      let bearUp = 0;
      if (s.stumble > 0) bearUp = Math.min(1, s.stumble / 25) * (1 - Math.max(0, (s.stumble - RUN.STUMBLE_WINDOW + 60) / 60));
      if (!s.started || s.tick < introUntil) bearUp = Math.max(bearUp, s.started ? 1 - s.tick / introUntil : 0.75);
      if (s.crash > 0 && s.death === "caught") bearUp = 1.25;
      if (bearUp > 0.02) {
        const bx = W / 2 - BEAR_W + 2 + Math.round(Math.sin(f.time * 9) * 2);
        const by = Math.round(H - bearUp * 62);
        g.drawImage(bears[Math.floor(f.time * 8) % 2], bx, by, BEAR_W * 2, bears[0].height * 2);
      }

      g.fillStyle = t.hazardDark;
      for (let x = 0; x < W; x += 3) {
        const h = 2 + ((x * 7 + Math.floor(z * 6)) % 5);
        g.fillRect(x, H - h, 2, h);
      }
      drawParticles(g, fx);
      const boosts: { kind: PickupKind; left: number; total: number }[] = [];
      if (s.shield) boosts.push({ kind: "shield", left: 0, total: 0 });
      if (s.magnet > 0) boosts.push({ kind: "magnet", left: s.magnet, total: RUN.MAGNET_TICKS });
      if (s.double > 0) boosts.push({ kind: "double", left: s.double, total: RUN.DOUBLE_TICKS });
      drawBoosts(g, boosts, 4, H - 30);
      drawFloaters(g, floaters, f.time);
      g.restore();
      void deathTick;
    },
  };
}

function drawObstacle(g: CanvasRenderingContext2D, o: Obstacle, dz: number, lx: number, t: Theme, coins: HTMLCanvasElement[], time: number) {
  const z0 = dz, z1 = dz + o.len / M;
  const hw = LANE_W * 0.46;
  switch (o.kind) {
    case "wall": {
      const r = box(g, z0, z1, lx - hw, lx + hw, 0, 1.7, t.down, t.downDark, t.downDark, t.outline);
      if (r && r.w > 3) {
        g.fillStyle = "#ffffff";
        g.globalAlpha = 0.3;
        g.fillRect(r.x + Math.max(1, r.w >> 3), r.y, Math.max(1, r.w >> 4), r.h);
        g.globalAlpha = 1;
        const wick = proj(Math.max(0.6, z0), lx, 2.05);
        g.fillStyle = t.outline;
        g.fillRect(Math.round(wick.sx - wick.s * 0.06), Math.round(wick.sy), Math.max(1, Math.round(wick.s * 0.12)), Math.max(1, r.y - Math.round(wick.sy)));
      }
      break;
    }
    case "low": {
      const r = box(g, z0, z0 + 0.25, lx - hw, lx + hw, 0, 0.48, t.hazard, t.hazardDark, t.hazardDark, t.outline);
      stripes(g, r, t.outline);
      break;
    }
    case "high": {
      box(g, z0, z0 + 0.15, lx - hw, lx - hw + 0.08, 0, 1.45, t.groundDark, t.groundDark, t.groundDark, t.outline);
      box(g, z0, z0 + 0.15, lx + hw - 0.08, lx + hw, 0, 1.45, t.groundDark, t.groundDark, t.groundDark, t.outline);
      const r = box(g, z0, z0 + 0.25, lx - hw, lx + hw, 0.95, 1.45, t.hazard, t.hazardDark, t.hazardDark, t.outline);
      stripes(g, r, t.outline);
      break;
    }
    case "hole": {
      if (z0 < 0.65 && z1 < 0.65) return;
      const a = proj(Math.max(0.65, z0), lx - hw - 0.05, 0), b = proj(Math.max(0.65, z0), lx + hw + 0.05, 0);
      const c = proj(z1, lx - hw - 0.05, 0), d = proj(z1, lx + hw + 0.05, 0);
      quad(g, [a.sx, a.sy, b.sx, b.sy, d.sx, d.sy, c.sx, c.sy], t.hazardDark);
      const inset = (p: { sx: number; sy: number }, q: { sx: number; sy: number }, k: number) => [p.sx + (q.sx - p.sx) * k, p.sy + (q.sy - p.sy) * k];
      const [ax, ay] = inset(a, d, 0.12), [bx, by] = inset(b, c, 0.12), [cx, cy] = inset(c, b, 0.12), [dx, dy] = inset(d, a, 0.12);
      quad(g, [ax, ay, bx, by, dx, dy, cx, cy], t.bg);
      break;
    }
    case "power": {
      if (o.resolved) return;
      const p = proj(z0, lx, 0.6);
      if (p.s < 12) {
        g.fillStyle = PICKUP_COLOR[o.power ?? "time"];
        const r = Math.max(1, Math.round(p.s * 0.12));
        g.fillRect(Math.round(p.sx) - r, Math.round(p.sy) - r, r * 2, r * 2);
      } else drawPickup(g, o.power ?? "time", p.sx, p.sy, time, p.s > 60 ? 2 : 1);
      break;
    }
    case "coin": {
      const p = proj(z0, lx, 0.55);
      const scale = p.s > 60 ? 2 : 1;
      const frame = coins[Math.floor(time * 10 + o.z) % 4];
      if (p.s < 14) {
        g.fillStyle = t.gold;
        const r = Math.max(1, Math.round(p.s * 0.1));
        g.fillRect(Math.round(p.sx) - r, Math.round(p.sy) - r, r * 2, r * 2);
      } else g.drawImage(frame, Math.round(p.sx - 6 * scale), Math.round(p.sy - 6 * scale), 12 * scale, 12 * scale);
      break;
    }
  }
}
