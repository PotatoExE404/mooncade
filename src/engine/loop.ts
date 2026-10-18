export interface LoopHooks {
  step(tick: number): void;

  render(alpha: number): void;
}

export function createStepper(hooks: LoopHooks, hz = 60) {
  const dt = 1000 / hz;
  let acc = 0;
  let tick = 0;
  let userPaused = false;
  let hidden = false;
  return {
    get tick() {
      return tick;
    },
    get paused() {
      return userPaused || hidden;
    },

    advance(deltaMs: number) {
      if (userPaused || hidden) {
        acc = 0;
      } else {
        acc += Math.min(deltaMs, 250);
        while (acc >= dt) {
          hooks.step(tick++);
          acc -= dt;
        }
      }
      hooks.render(userPaused || hidden ? 0 : acc / dt);
    },
    setPaused(value: boolean) {
      userPaused = value;
      acc = 0;
    },
    setHidden(value: boolean) {
      hidden = value;
      acc = 0;
    },

    stepN(n: number) {
      for (let i = 0; i < n; i++) hooks.step(tick++);
      hooks.render(0);
    },
  };
}

export function startLoop(hooks: LoopHooks, hz = 60) {
  const stepper = createStepper(hooks, hz);
  let last = performance.now();
  let frame = 0;
  const onFrame = (now: number) => {
    stepper.advance(now - last);
    last = now;
    frame = requestAnimationFrame(onFrame);
  };
  const onVisibility = () => {
    stepper.setHidden(document.hidden);
    last = performance.now();
  };
  document.addEventListener("visibilitychange", onVisibility);
  frame = requestAnimationFrame(onFrame);
  return Object.assign(stepper, {
    stop() {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  });
}

