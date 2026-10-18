import { canvas } from "../art/bake";
import { flagFrames, gemFrames, goalSprite, paperFrames } from "../art/props";
import type { FighterSheet, PoseName } from "../art/fighters";
import { audio as liveAudio, silent } from "../engine/audio";
import { createCamera } from "../engine/juice";
import { ROWS, STAGE_TICKS, STAGES, TILE, type DiamondState } from "../sim/diamond";
import type { Theme } from "../themes/themes";
import { ambient, drawFlash, drawParticles, mood, pack, scenery, sky, sun, tile } from "./common";
import type { Presenter } from "./runtime";

const W = 320, H = 180;
const OY = H - ROWS * TILE;

const tileCache = new Map<string, HTMLCanvasElement>();
function stageCanvas(stage: number, t: Theme): HTMLCanvasElement {
  const key = `${stage}:${t.id}`;
  let c = tileCache.get(key);
  if (c) return c;
  const def = STAGES[stage];
  const cols = def.tiles[0].length;
  c = canvas(cols * TILE, ROWS * TILE);
  const g = c.getContext("2d")!;
  const at = (x: number, y: number) => (y < 0 || y >= ROWS || x < 0 || x >= cols ? (y >= ROWS ? "." : "#") : def.tiles[y][x]);
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < cols; x++) {
      const ch = def.tiles[y][x];
      const px = x * TILE, py = y * TILE;
      if (ch === "#") {
        g.fillStyle = t.ground;
        g.fillRect(px, py, TILE, TILE);

        g.fillStyle = t.groundDark;
        const off = y % 2 ? 8 : 0;
        g.fillRect(px, py + 7, TILE, 1);
        g.fillRect(px + ((off + 4) % 16), py, 1, 7);
        g.fillRect(px + ((off + 12) % 16), py + 8, 1, 8);
        if (at(x, y - 1) !== "#") {
          g.fillStyle = t.groundTop;
          g.fillRect(px, py, TILE, 3);
          g.fillStyle = "#ffffff";
          g.globalAlpha = 0.35;
          g.fillRect(px, py, TILE, 1);
          g.globalAlpha = 1;
        }
        g.fillStyle = t.outline;
        if (at(x - 1, y) !== "#") g.fillRect(px, py, 1, TILE);
        if (at(x + 1, y) !== "#") g.fillRect(px + TILE - 1, py, 1, TILE);
      } else if (ch === "-") {
        g.fillStyle = t.outline;
        g.fillRect(px, py, TILE, 6);
        g.fillStyle = t.up;
        g.fillRect(px, py + 1, TILE, 3);
        g.fillStyle = t.upDark;
        g.fillRect(px, py + 4, TILE, 1);
        g.fillRect(px + 3, py + 5, 2, 4);
        g.fillRect(px + 11, py + 5, 2, 4);
      } else if (ch === "^") {
        for (let k = 0; k < 4; k++) {
          const sx = px + k * 4;
          g.fillStyle = t.outline;
          g.beginPath();
          g.moveTo(sx - 0.5, py + TILE);
          g.lineTo(sx + 2, py + 6);
          g.lineTo(sx + 4.5, py + TILE);
          g.fill();
          g.fillStyle = k % 2 ? t.hazard : t.hazardDark;
          g.beginPath();
          g.moveTo(sx + 0.5, py + TILE);
          g.lineTo(sx + 2, py + 8);
          g.lineTo(sx + 3.5, py + TILE);
          g.fill();
        }
      }
    }
  tileCache.set(key, c);
  return c;
}

export function diamondPresenter(sheet: FighterSheet, quiet = false): Presenter<DiamondState> {
  const audio = quiet ? silent : liveAudio;
  const cam = createCamera({ lambda: 7, lookAhead: 0.14, deadZone: 6, viewWidth: W, viewHeight: H });
  let lastStage = -1;
  let audioStage = 0;
  let finishedAt = -1;
  let runFrame = 0;
  let landSquash = 0;
  return {
    W,
    H,
    onTick(s, fx) {
      const e = s.events;
      const b = s.body;
      const cx = (b.x >> 8) + 5, by = (b.y >> 8) + 14 + OY;
      if (e.jump) { audio.jump(); fx.particles.burst(cx, by, 5, Math.PI / 2, 2.2, 40, 0.3, pack("#e8e4ff")); }
      if (e.land) {
        const k = Math.min(1, e.land / 1600);
        audio.land(k);
        landSquash = 6;
        fx.particles.burst(cx, by, 3 + Math.round(k * 8), -Math.PI / 2, 2.8, 30 + k * 50, 0.3, pack("#e8e4ff"));
      }
      if (e.gem) {
        audio.gem();
        fx.particles.burst(cx, by - 10, 14, -Math.PI / 2, Math.PI * 2, 70, 0.6, pack("#6fe9ff"));
        fx.shake.add(0.12);
      }
      if (e.stomp) {
        audio.stomp();
        fx.hitstop.request(50);
        fx.shake.add(0.2);
        fx.particles.burst(cx, by, 10, Math.PI / 2, 2.5, 70, 0.5, pack("#eceae2"));
      }
      if (e.check) audio.checkpoint();
      if (s.tick === 1) {
        audioStage = 0;
        audio.setLevel(1);
      }
      if (e.stage) {
        audio.fanfare();
        audio.launch();
        fx.shake.add(0.35);
      }
      if (s.stage !== audioStage) {
        audioStage = s.stage;
        audio.setLevel(s.stage + 1);
        audio.levelUp();
      }
      if (e.finish) {
        audio.record();
        audio.launch();
        fx.shake.add(0.35);
        for (const c of ["#ffd23f", "#6fe9ff", "#ff6a3d"]) fx.particles.burst(cx, by - 12, 16, -Math.PI / 2, 1.6, 140, 1.2, pack(c));
      }
      if (e.die) {
        audio.die();
        fx.hitstop.request(80);
        fx.shake.add(0.5);
        fx.flash = 5;
        fx.particles.burst(cx, by - 7, 28, 0, Math.PI * 2, 120, 0.7, pack(fx.flash ? "#ff6a3d" : "#ffffff"));
      }
    },
    draw(g, s, f, fx) {
      const t = f.theme;
      const def = STAGES[s.stage];
      const levelW = def.tiles[0].length * TILE;
      const b = s.body;
      const bx = (b.prevX + (b.x - b.prevX) * f.alpha) / 256;
      const byy = (b.prevY + (b.y - b.prevY) * f.alpha) / 256;
      if (lastStage !== s.stage) {
        cam.snap(Math.max(0, bx - W * 0.3), 0);
        lastStage = s.stage;
      }
      cam.update(f.dt, bx + 5 - W / 2, 0, b.facing, true);

      cam.pos.x = Math.min(Math.max(cam.pos.x, 0), levelW - W);
      const cx = cam.drawX;

      g.save();
      g.translate(f.shakeX, f.shakeY);
      g.drawImage(sky(t, W, H), 0, 0);
      const sn = sun(t, t.scenery === "synth" ? 28 : 14);
      if (t.scenery === "synth") g.drawImage(sn, Math.round(W * 0.62 - sn.width / 2 - cx * 0.02), H - 96 - sn.height / 2);
      else g.drawImage(sn, Math.round(W * 0.78 - sn.width / 2 - cx * 0.02), 30 - sn.height / 2);
      tile(g, scenery(t, "far", 320, 120), cx * 0.2, H - 120);
      tile(g, scenery(t, "mid", 260, 84), cx * 0.45, H - 84);
      ambient(g, t, f.time, W, H - 20, 16 + s.stage * 4);
      mood(g, s.stage + 1, f.time, W, H);
      g.drawImage(stageCanvas(s.stage, t), -cx, OY);

      const flags = flagFrames(t);
      def.checkpoints.forEach(([x, y], i) => g.drawImage(flags[i <= s.checkpointIndex ? 1 : 0], x * TILE + 2 - cx, (y + 1) * TILE - 24 + OY));

      const goal = goalSprite(t);
      if (s.finished && finishedAt < 0) finishedAt = f.time;
      if (!s.finished) finishedAt = -1;
      const launchT = s.transition > 0 ? STAGE_TICKS - s.transition : finishedAt >= 0 ? (f.time - finishedAt) * 60 : -1;
      const gx0 = def.goal[0] * TILE - 2 - cx;
      let gy0 = (def.goal[1] + 1) * TILE - 40 + OY;
      if (launchT >= 0) {
        const rumble = launchT < 24 ? Math.round(Math.sin(launchT * 2.1) * 1) : 0;
        const lift = launchT < 24 ? 0 : Math.round((launchT - 24) ** 2 * 0.05);
        gy0 -= lift;

        const fl = 8 + Math.round(Math.sin(f.time * 40) * 3) + Math.min(14, Math.floor(launchT / 6));
        g.fillStyle = t.gold;
        g.fillRect(gx0 + 7 + rumble, gy0 + 36, 6, fl);
        g.fillStyle = t.hazard;
        g.fillRect(gx0 + 8 + rumble, gy0 + 36, 4, Math.round(fl * 0.7));
        g.fillStyle = "#ffffff";
        g.fillRect(gx0 + 9 + rumble, gy0 + 36, 2, Math.round(fl * 0.35));
        if (launchT % 3 === 0) fx.particles.burst(gx0 + 10 + cx, (def.goal[1] + 1) * TILE + OY, 3, -Math.PI / 2, 2.6, 50, 0.7, pack("#c9c5d8"));
        g.drawImage(goal, gx0 + rumble, gy0);
      } else g.drawImage(goal, gx0, gy0);
      const gems = gemFrames();
      def.diamonds.forEach(([x, y], i) => {
        if (s.gems[s.stage][i]) return;
        const bob = Math.round(Math.sin(f.time * 3 + i) * 1.5);
        g.drawImage(gems[Math.floor(f.time * 8 + i) % 4], x * TILE + 2 - cx, y * TILE + 2 + bob + OY);
      });
      const paper = paperFrames();
      for (const e of s.enemies) {
        if (!e.alive && e.squash > 40) continue;
        const frames = e.dir > 0 ? paper.right : paper.left;
        const spr = !e.alive ? frames[2] : frames[Math.floor(f.time * 6) % 2];
        g.drawImage(spr, (e.x >> 8) - 1 - cx, (e.y >> 8) - 2 + OY);
      }

      const boarded = launchT >= 4;
      if (!boarded && (s.dead === 0 || fx.flash > 0)) {
        let pose: PoseName;
        if (s.transition > 0 || s.finished) pose = "cheer";
        else if (s.dead > 0) pose = "hurt";
        else if (!b.grounded) pose = b.vy < 0 ? "jump" : "fall";
        else if (Math.abs(b.vx) > 40) {
          runFrame += Math.abs(b.vx) / 512 / 6;
          pose = (["run0", "run1", "run2", "run3"] as PoseName[])[Math.floor(runFrame) % 4];
        } else pose = Math.floor(f.time * 2) % 2 ? "idle0" : "idle1";
        if (!s.started) pose = "idle0";
        const spr = (b.facing > 0 ? sheet.right : sheet.left)[pose];
        const sx = Math.round(bx) - 4 - cx, sy = Math.round(byy) + 14 - 24 + OY + (landSquash > 3 ? 1 : 0);
        if (landSquash > 0) landSquash--;
        if (fx.flash > 0) drawFlash(g, spr, sx, sy);
        else g.drawImage(spr, sx, sy);
      }
      drawParticles(g, fx, -cx, 0);
      g.restore();
    },
  };
}
