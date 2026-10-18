const prefersReducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export const comfort = {
  shake: prefersReducedMotion() ? 0 : 1,
  flashes: !prefersReducedMotion(),
  particles: 1,
};

function noise(seed: number, t: number) {
  const i = Math.floor(t), f = t - i;
  const h = (n: number) => {
    const x = Math.sin((n + seed * 57.1) * 127.1) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
  };
  const u = f * f * (3 - 2 * f);
  return h(i) * (1 - u) + h(i + 1) * u;
}

export function createShake({ maxOffset = 12, maxAngle = 0.05, decay = 1.2, frequency = 18 } = {}) {
  let trauma = 0;
  let time = 0;
  return {
    add(amount: number) {
      trauma = Math.min(1, trauma + amount);
    },

    update(dt: number) {
      time += dt;
      trauma = Math.max(0, trauma - decay * dt);
      const s = trauma * trauma * comfort.shake;
      return {
        x: maxOffset * s * noise(1, time * frequency),
        y: maxOffset * s * noise(2, time * frequency),
        angle: maxAngle * s * noise(3, time * frequency),
      };
    },
  };
}

export function createHitStop() {
  let remaining = 0;
  return {
    request(ms: number, hz = 60) {
      remaining = Math.max(remaining, Math.round((ms / 1000) * hz));
    },

    consume() {
      if (remaining > 0) {
        remaining--;
        return true;
      }
      return false;
    },
  };
}

export function createCamera({ lambda = 8, lookAhead = 0.15, deadZone = 8, viewWidth = 384, viewHeight = 216, bounds = null as null | { minX: number; maxX: number; minY: number; maxY: number } } = {}) {
  const pos = { x: 0, y: 0 };
  let lead = 0;
  return {
    pos,
    snap(x: number, y: number) {
      pos.x = x;
      pos.y = y;
    },

    update(dt: number, targetX: number, targetY: number, facing: number, grounded: boolean) {
      const k = 1 - Math.exp(-lambda * dt);
      lead += (facing * viewWidth * lookAhead - lead) * (1 - Math.exp(-3 * dt));
      const tx = targetX + lead;
      const dx = tx - pos.x;
      pos.x += Math.sign(dx) * Math.max(0, Math.abs(dx) - deadZone) * k;
      const falling = targetY > pos.y + viewHeight * 0.12;
      const climbing = targetY < pos.y - viewHeight * 0.35;
      if (grounded || falling || climbing) pos.y += (targetY - pos.y) * (falling ? Math.min(1, k * 2) : k);
      if (bounds) {
        pos.x = Math.min(bounds.maxX, Math.max(bounds.minX, pos.x));
        pos.y = Math.min(bounds.maxY, Math.max(bounds.minY, pos.y));
      }
      return pos;
    },

    get drawX() {
      return Math.round(pos.x);
    },
    get drawY() {
      return Math.round(pos.y);
    },
  };
}

export function createSquash({ recover = 22 } = {}) {
  let sy = 1;
  let v = 0;
  return {
    jump() {
      sy = 1.25;
    },
    land(impact: number) {
      sy = 1 - Math.min(0.3, 0.12 + impact * 0.18);
    },
    update(dt: number) {
      const a = -recover * recover * (sy - 1) - 2 * recover * 0.55 * v;
      v += a * dt;
      sy += v * dt;
      return { scaleX: 1 / sy, scaleY: sy };
    },
  };
}

export function createParticles(capacity = 512) {
  const x = new Float32Array(capacity), y = new Float32Array(capacity);
  const vx = new Float32Array(capacity), vy = new Float32Array(capacity);
  const life = new Float32Array(capacity), maxLife = new Float32Array(capacity);
  const color = new Uint32Array(capacity);
  let next = 0;
  return {
    capacity,
    x, y, life, maxLife, color,

    burst(px: number, py: number, count: number, dir: number, spread: number, speed: number, lifeS: number, rgba: number) {
      const n = Math.round(count * comfort.particles);
      for (let i = 0; i < n; i++) {
        const j = next;
        next = (next + 1) % capacity;
        const a = dir + (Math.random() - 0.5) * spread;
        const s = speed * (0.5 + Math.random() * 0.5);
        x[j] = px; y[j] = py;
        vx[j] = Math.cos(a) * s; vy[j] = Math.sin(a) * s;
        life[j] = maxLife[j] = lifeS * (0.7 + Math.random() * 0.3);
        color[j] = rgba;
      }
    },
    update(dt: number, gravity = 300, drag = 4) {
      const d = Math.exp(-drag * dt);
      for (let i = 0; i < capacity; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        vx[i] *= d;
        vy[i] = vy[i] * d + gravity * dt;
        x[i] += vx[i] * dt;
        y[i] += vy[i] * dt;
      }
    },

    forEach(draw: (i: number, alpha: number) => void) {
      for (let i = 0; i < capacity; i++) if (life[i] > 0) draw(i, life[i] / maxLife[i]);
    },
  };
}

export function createCombo({ windowMs = 900, scale = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16] } = {}) {
  let count = 0;
  let lastAt = -Infinity;
  return {
    hit(nowMs: number) {
      count = nowMs - lastAt <= windowMs ? count + 1 : 0;
      lastAt = nowMs;
      const semis = scale[Math.min(count, scale.length - 1)];
      return { count, rate: Math.pow(2, semis / 12) * (0.97 + Math.random() * 0.06) };
    },
  };
}
