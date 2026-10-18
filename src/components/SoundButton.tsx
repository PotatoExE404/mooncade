import { useEffect, useRef, useState } from "react";
import { audio } from "../engine/audio";
import { useAudioSettings } from "../engine/useAudioSettings";

export function SoundButton() {
  const snd = useAudioSettings();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const playing = snd.site && !snd.muted;

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  const toggle = () => {
    audio.unlock();
    audio.set(playing ? { site: false } : { site: true, muted: false, music: snd.music || 0.5 });
  };

  return (
    <div ref={box} className="relative">
      <button
        className="glass-btn grid h-11 w-11 place-items-center rounded-xl text-white"
        aria-label="Music"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
      >
        <Speaker on={playing} />
        {playing && <span className="eq absolute right-1.5 bottom-1.5" aria-hidden="true"><i /><i /><i /></span>}
      </button>
      {open && (
        <div className="glass-pop absolute top-[calc(100%+10px)] right-0 z-40 w-64 p-4 text-white" role="dialog" aria-label="Music">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-pixel text-lg leading-none">Arcade music</p>
              <p className="mt-1 text-xs text-white/75">{playing ? "Playing while you browse" : "Off"}</p>
            </div>
            <button
              role="switch"
              aria-checked={playing}
              aria-label="Arcade music"
              onClick={toggle}
              className={`relative h-7 w-12 shrink-0 rounded-full border border-white/40 transition-colors duration-150 ${playing ? "bg-accent" : "bg-white/15"}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5.5 w-5.5 rounded-full bg-white shadow transition-transform duration-150 ${playing ? "translate-x-5" : ""}`} />
            </button>
          </div>
          <label className="mt-4 grid gap-2">
            <span className="flex items-center justify-between text-xs text-white/75">
              <span>Volume</span>
              <span className="tabular-nums">{Math.round(snd.music * 100)}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={snd.music}
              onChange={(e) => {
                audio.unlock();
                audio.set({ music: Number(e.target.value) });
              }}
              className="vol w-full"
              style={{ ["--v" as string]: `${snd.music * 100}%` }}
              aria-label="Music volume"
            />
          </label>
          <p className="mt-3 text-xs text-white/75">Each game plays its own track. M mutes in game.</p>
        </div>
      )}
    </div>
  );
}

function Speaker({ on }: { on: boolean }) {
  return (
    <svg width="20" height="18" viewBox="0 0 18 16" aria-hidden="true" shapeRendering="crispEdges">
      <path d="M1 5h4l5-4v14l-5-4H1z" fill="currentColor" />
      {on ? <path d="M12 5c1.5 1.5 1.5 4.5 0 6M14.5 3c3 3 3 7 0 10" stroke="currentColor" strokeWidth="1.6" fill="none" /> : <path d="M12 5l5 6M17 5l-5 6" stroke="currentColor" strokeWidth="2" />}
    </svg>
  );
}
