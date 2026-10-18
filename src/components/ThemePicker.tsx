import { setState, useStore } from "../state/store";
import { THEME_IDS, THEMES } from "../themes/themes";
import { Coin } from "./Coin";

export function ThemePicker() {
  const theme = useStore((s) => s.theme);
  return (
    <div role="radiogroup" aria-label="Skin" className="flex gap-1">
      {THEME_IDS.map((id, i) => (
        <button
          key={id}
          role="radio"
          aria-checked={id === theme}
          aria-label={`${THEMES[id].name} skin: ${THEMES[id].world}`}
          title={`${THEMES[id].name}: ${THEMES[id].world}`}
          onClick={() => setState({ theme: id })}
          className={`grid h-11 w-11 place-items-center rounded-full transition-[background-color,opacity] duration-150 ${id === theme ? "bg-white/25 ring-2 ring-white" : "opacity-80 hover:bg-white/15 hover:opacity-100"}`}
        >
          <span className="coin-spin block" style={{ animationDelay: `${-i * 0.9}s`, animationDuration: id === theme ? "2.4s" : "4.2s" }}>
            <Coin theme={id} size={30} />
          </span>
        </button>
      ))}
    </div>
  );
}

export function SkinCards() {
  const theme = useStore((s) => s.theme);
  return (
    <div role="radiogroup" aria-label="Skin" className="grid gap-3 sm:grid-cols-3">
      {THEME_IDS.map((id) => {
        const t = THEMES[id];
        const on = id === theme;
        return (
          <button
            key={id}
            role="radio"
            aria-checked={on}
            aria-label={`${t.name} skin: ${t.world}`}
            onClick={() => setState({ theme: id })}
            className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-transform duration-150 hover:-translate-y-0.5 ${on ? "border-accent bg-accent/15" : "border-line bg-paper-deep"}`}
          >
            <span className={on ? "coin-spin" : ""}>
              <Coin theme={id} size={44} />
            </span>
            <span>
              <span className="block font-pixel text-xl leading-none">{t.world}</span>
              <span className="meta mt-1 block text-muted">{t.name}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
