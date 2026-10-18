import { useEffect, useState } from "react";
import { fighterSheet, FIGHTER_IDS, FIGHTERS, type FighterId } from "../art/fighters";
import { useHead } from "../art/heads";
import { AvatarCreator } from "../avatar/AvatarCreator";
import { Settings } from "../components/Settings";
import { SkinCards } from "../components/ThemePicker";
import { Win } from "../components/Win";
import { normalizeTag, tagProblem } from "../shared/tags";
import { setState, useStore } from "../state/store";

function FighterPreview({ id, active }: { id: FighterId; active: boolean }) {
  const headUrl = useStore((s) => s.head);
  const head = useHead(active ? headUrl : null);
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setFrame((f) => f + 1), 120);
    return () => window.clearInterval(t);
  }, [active]);
  const sheet = fighterSheet(id, active ? head : null);
  const pose = active ? (["run0", "run1", "run2", "run3"] as const)[frame % 4] : "idle0";
  return <img src={sheet.right[pose].toDataURL()} alt="" width={72} height={96} className="pixelated mx-auto block" />;
}

export function Me() {
  const fighter = useStore((s) => s.fighter);
  const saved = useStore((s) => s.tag);
  const [tag, setTag] = useState(saved);
  const [msg, setMsg] = useState<string | null>(null);

  const saveTag = () => {
    const t = normalizeTag(tag);
    const problem = tagProblem(t);
    if (problem) return setMsg(problem);
    setState({ tag: t, named: true });
    setMsg("Saved.");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-3 py-8 sm:px-6">
      <div>
        <h1 className="desk font-pixel text-title">Your fighter</h1>
        <p className="desk mt-2 max-w-[60ch] text-lg font-semibold">Pick a name and a body, then make the face yours.</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Win title="Your name" bodyClass="p-4 sm:p-5">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              saveTag();
            }}
          >
            <label htmlFor="tag-input" className="sr-only">Name</label>
            <input
              id="tag-input"
              value={tag}
              maxLength={12}
              onChange={(e) => {
                setTag(normalizeTag(e.target.value));
                setMsg(null);
              }}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="min-h-12 w-full max-w-xs rounded-lg border-2 border-line bg-white px-3 font-pixel text-2xl tracking-widest focus:border-accent"
            />
            <button className="btn" data-variant="accent">Save</button>
          </form>
          <p className="mt-2 text-sm text-muted">Shown on your cards and when you share a score.</p>
          {msg && <p className="mt-2 text-sm font-semibold text-accent-deep" role="status">{msg}</p>}
        </Win>
        <Win title="Pick a fighter" bodyClass="p-4 sm:p-5">
          <div role="radiogroup" aria-label="Fighter" className="grid grid-cols-3 gap-3">
            {FIGHTER_IDS.map((id) => (
              <button
                key={id}
                role="radio"
                aria-checked={fighter === id}
                onClick={() => setState({ fighter: id })}
                className={`rounded-xl border-2 p-3 text-center transition-transform duration-150 hover:-translate-y-1 ${fighter === id ? "border-accent bg-accent/15" : "border-line bg-paper-deep"}`}
              >
                <FighterPreview id={id} active={fighter === id} />
                <span className="mt-2 block font-pixel text-xl">{FIGHTERS[id].name}</span>
              </button>
            ))}
          </div>
        </Win>
      </div>
      <Win title="Skin" bodyClass="p-4 sm:p-5">
        <SkinCards />
      </Win>
      <Win title="Your face, in pixels" bodyClass="p-4 sm:p-5">
        <AvatarCreator />
      </Win>
      <Win title="Settings" bodyClass="p-4 sm:p-5">
        <Settings />
      </Win>
    </div>
  );
}
