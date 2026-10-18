import { audio } from "../engine/audio";
import { useAudioSettings } from "../engine/useAudioSettings";
import { setState, useStore } from "../state/store";

function Slider({ id, label, value, onChange }: { id: string; label: string; value: number; onChange(v: number): void }) {
  return (
    <label htmlFor={id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
      <span className="meta text-muted">{label}</span>
      <span className="meta tabular-nums">{Math.round(value * 100)}%</span>
      <input id={id} type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(Number(e.target.value))} className="col-span-2 accent-[var(--accent)]" />
    </label>
  );
}

export function Settings({ compact = false }: { compact?: boolean }) {
  const settings = useStore((s) => s.settings);
  const snd = useAudioSettings();
  const setSound = (patch: Partial<typeof snd>) => {
    audio.unlock();
    audio.set(patch);
  };
  const setFx = (patch: Partial<typeof settings>) => setState((s) => ({ settings: { ...s.settings, ...patch } }));
  return (
    <div className={compact ? "space-y-3" : "grid gap-4 sm:grid-cols-2"}>
      <Slider id="music" label="Music" value={snd.music} onChange={(v) => setSound({ music: v })} />
      <Slider id="sfx" label="Sound effects" value={snd.sfx} onChange={(v) => setSound({ sfx: v })} />
      <Slider id="shake" label="Screen shake" value={settings.shake} onChange={(v) => setFx({ shake: v })} />
      <Slider id="particles" label="Particles" value={settings.particles} onChange={(v) => setFx({ particles: v })} />
      <label className="flex min-h-11 items-center justify-between gap-3">
        <span className="meta text-muted">Hit flashes</span>
        <input type="checkbox" checked={settings.flashes} onChange={(e) => setFx({ flashes: e.target.checked })} className="h-5 w-5 accent-[var(--accent)]" />
      </label>
      <label className="flex min-h-11 items-center justify-between gap-3">
        <span className="meta text-muted">Mute everything</span>
        <input type="checkbox" checked={snd.muted} onChange={(e) => setSound({ muted: e.target.checked })} className="h-5 w-5 accent-[var(--accent)]" />
      </label>
    </div>
  );
}
