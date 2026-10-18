import { flameFrames, rocketFrames, ROCKET_TILTS } from "../art/props";
import { audio as liveAudio, silent } from "../engine/audio";
import { candleGapY, FLAP, type Candle, type FlapState } from "../sim/flap";
import type { Theme } from "../themes/themes";
import { ambient, drawBoosts, drawFlash, drawFloaters, drawParticles, drawPickup, drawShield, mood, pack, PICKUP_COLOR, PICKUP_LABEL, scenery, secondsText, sky, sun, tile, type Floater, type PickupKind } from "./common";
import type { Presenter } from "./runtime";

const { W, H, GROUND } = FLAP;

function drawCandle(g: CanvasRenderingContext2D, x: number, c: Candle, tick: number, t: Theme) {
  const gy = candleGapY(c, tick);
  const top = gy - (c.gap >> 1);
  const bottom = gy + (c.gap >> 1);
  const body = c.green ? t.up : t.down;
  const dark = c.green ? t.upDark : t.downDark;
  const w = FLAP.CANDLE_W;
  const wx = x + ((w - FLAP.WICK_W) >> 1);
  const seg = (y0: number, y1: number, cap: "top" | "bottom") => {
    if (y1 <= y0) return;
    g.fillStyle = t.outline;
    g.fillRect(x - 1, y0, w + 2, y1 - y0);
    g.fillStyle = body;
    g.fillRect(x, y0, w, y1 - y0);
    g.fillStyle = dark;
    g.fillRect(x + w - 5, y0, 4, y1 - y0);
    g.fillStyle = "#ffffff";
    g.globalAlpha = 0.35;
    g.fillRect(x + 3, y0, 2, y1 - y0);
    g.globalAlpha = 1;

    g.fillStyle = t.outline;
    g.fillRect(x - 1, cap === "top" ? y1 - 1 : y0, w + 2, 1);
  };

  seg(0, top - FLAP.WICK_LEN, "top");
  g.fillStyle = t.outline;
  g.fillRect(wx - 1, top - FLAP.WICK_LEN - 1, FLAP.WICK_W + 2, FLAP.WICK_LEN + 2);
  g.fillStyle = dark;
  g.fillRect(wx, top - FLAP.WICK_LEN, FLAP.WICK_W, FLAP.WICK_LEN);

  g.fillStyle = t.outline;
  g.fillRect(wx - 1, bottom - 1, FLAP.WICK_W + 2, FLAP.WICK_LEN + 2);
  g.fillStyle = dark;
  g.fillRect(wx, bottom, FLAP.WICK_W, FLAP.WICK_LEN);
  seg(bottom + FLAP.WICK_LEN, GROUND, "bottom");
}

export function flapPresenter(head: HTMLCanvasElement, headKey: string, quiet = false): Presenter<FlapState> {
  const audio = quiet ? silent : liveAudio;
  let lastFlapTick = -99;
  let now = 0;
  const floaters: Floater[] = [];
  const float = (text: string, x: number, y: number, color: string) => floaters.push({ text, x, y, color, born: now });
  return {
    W,
    H,
    onTick(s, fx, tick) {
      const e = s.events;
      const px = FLAP.X + 2, py = (s.y >> 8) + 5;
      if (e.flap) {
        audio.flap();
        lastFlapTick = s.tick;
        fx.particles.burst(px - 4, py + 2, 5, Math.PI * 0.85, 0.7, 70, 0.35, pack("#cfd6ff"));
      }
      if (e.pass) {
        const now = tick;
        fx.combo = now - fx.comboAt < 150 ? fx.combo + 1 : 0;
        fx.comboAt = now;
        audio.chime(fx.combo % 5 === 4 ? 10 : fx.combo % 5);
        fx.particles.burst(px + 10, py, 8, -Math.PI / 2, 2.4, 90, 0.5, pack("#ffd23f"));
        if (s.score % 10 === 0) {
          audio.record();
          fx.shake.add(0.15);
        }
      }
      if (s.tick === 1) audio.setLevel(1);
      if (e.level) {
        audio.levelUp();
        audio.setLevel(s.level);
        fx.shake.add(0.2);
        for (const c of ["#ffd23f", "#ffffff"]) fx.particles.burst(W / 2, 60, 18, Math.PI / 2, Math.PI * 2, 110, 0.9, pack(c));
      }
      if (e.pickup) {
        audio.pickup();
        const kind = e.pickup as PickupKind;
        fx.particles.burst(px + 6, py, 14, 0, Math.PI * 2, 90, 0.5, pack(PICKUP_COLOR[kind]));
        if (kind !== "time") float(PICKUP_LABEL[kind], px + 8, py - 12, PICKUP_COLOR[kind]);
      }
      if (e.bonus > 0) {
        if (!e.pickup) audio.bonus();
        if (e.level || e.pickup === "time") float(secondsText(e.bonus), W / 2, 96, "#7dffa0");
        else float(secondsText(e.bonus), px + 18, py - 10, "#7dffa0");
      }
      if (e.shieldPop) {
        audio.shieldPop();
        fx.shake.add(0.3);
        fx.particles.burst(px, py, 24, 0, Math.PI * 2, 120, 0.6, pack("#bfdbfe"));
      }
      if (e.respawn) {
        audio.checkpoint();
        fx.particles.burst(px, py, 14, 0, Math.PI * 2, 60, 0.5, pack("#ffffff"));
      }
      if (e.timeUp) {
        audio.timeUp();
        fx.shake.add(0.3);
      }
      if (s.started && !s.dead && s.timeLeft <= 600 && s.timeLeft % 60 === 0) audio.tick();
      if (e.die) {
        audio.die();
        fx.hitstop.request(90);
        fx.shake.add(0.65);
        fx.flash = 6;
        fx.particles.burst(px, py, 40, 0, Math.PI * 2, 160, 0.9, pack("#ff6a3d"));
        fx.particles.burst(px, py, 24, 0, Math.PI * 2, 110, 0.7, pack("#ffd23f"));
      }
    },
    draw(g, s, f, fx) {
      const t = f.theme;
      now = f.time;
      const rockets = rocketFrames(t, head, headKey);
      const flames = flameFrames(t);
      const scrollPx = (s.scroll + s.speed * f.alpha) / 256;
      g.save();
      g.translate(f.shakeX, f.shakeY);
      g.drawImage(sky(t, W, H), 0, 0);
      const sn = sun(t, t.scenery === "synth" ? 30 : 16);
      if (t.scenery === "synth") g.drawImage(sn, Math.round(W * 0.55 - sn.width / 2), GROUND - 150 - sn.height / 2);
      else g.drawImage(sn, Math.round(W * 0.74 - sn.width / 2), 44 - sn.height / 2);
      tile(g, scenery(t, "far", 240, 140), scrollPx * 0.15, GROUND - 140);
      tile(g, scenery(t, "mid", 200, 110), scrollPx * 0.4, GROUND - 110);
      ambient(g, t, f.time, W, GROUND, 12 + s.level * 3);
      mood(g, s.level, f.time, W, GROUND);

      for (const c of s.candles) {
        const x = Math.round((c.x - s.speed * (1 - f.alpha)) / 256);
        if (x > W || x + FLAP.CANDLE_W < -2) continue;
        drawCandle(g, x, c, s.tick, t);
      }
      for (const p of s.pickups) {
        if (p.taken) continue;
        const x = (p.x - s.speed * (1 - f.alpha)) / 256;
        if (x > W + 10 || x < -10) continue;
        drawPickup(g, p.kind, x, p.y, f.time);
      }

      g.fillStyle = t.ground;
      g.fillRect(0, GROUND, W, H - GROUND);
      g.fillStyle = t.groundTop;
      g.fillRect(0, GROUND, W, 2);
      g.fillStyle = t.groundDark;
      const off = Math.round(scrollPx) % 12;
      for (let x = -off; x < W; x += 12) g.fillRect(x, GROUND + 6, 6, 2);

      const y = s.started ? (s.prevY + (s.y - s.prevY) * f.alpha) / 256 : 140 + Math.sin(f.time * 3) * 3;
      const vy = s.started ? s.vy : -200;
      let ti = 0;
      const tilt = Math.max(-0.45, Math.min(0.95, vy / 1500));
      for (let i = 0; i < ROCKET_TILTS.length; i++) if (Math.abs(ROCKET_TILTS[i] - tilt) < Math.abs(ROCKET_TILTS[ti] - tilt)) ti = i;
      const rx = FLAP.X - 7, ry = Math.round(y) - 5;
      if (!s.dead && s.crash === 0 && !(s.invuln > 0 && Math.floor(s.invuln / 4) % 2 === 0)) {
        const fl = s.tick - lastFlapTick < 10 || !s.started ? flames[Math.floor(f.time * 20) % 3] : flames[2];
        g.drawImage(fl, rx - 8, ry + 6 + Math.round(ti * 1.2));
      }
      const blink = s.invuln > 0 && Math.floor(s.invuln / 4) % 2 === 0;
      if (s.crash === 0 && !blink) {
        if (fx.flash > 0) drawFlash(g, rockets[ti], rx, ry);
        else g.drawImage(rockets[ti], rx, ry);
      }
      if ((s.shield || s.safe > 0) && s.crash === 0) drawShield(g, rx + 13, ry + 7, 14, f.time);
      drawParticles(g, fx);
      const boosts: { kind: PickupKind; left: number; total: number }[] = [];
      if (s.shield) boosts.push({ kind: "shield", left: 0, total: 0 });
      if (s.slow > 0) boosts.push({ kind: "slow", left: s.slow, total: FLAP.SLOW_TICKS });
      if (s.double > 0) boosts.push({ kind: "double", left: s.double, total: FLAP.DOUBLE_TICKS });
      drawBoosts(g, boosts, 4, GROUND - 20);
      drawFloaters(g, floaters, f.time);
      g.restore();
    },
  };
}
