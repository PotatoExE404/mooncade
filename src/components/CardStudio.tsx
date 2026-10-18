import { useEffect, useRef, useState } from "react";
import { customizeCard } from "../cards/earn";
import { exportCard } from "../cards/render";
import type { CardCustom, CardDto } from "../cards/types";
import { shareRun } from "../engine/share";
import { GAMES } from "../games/registry";
import { useStore } from "../state/store";
import { THEME_IDS, THEMES } from "../themes/themes";
import { CardView } from "./CardView";
import { Coin } from "./Coin";

const BACKDROPS: { id: NonNullable<CardCustom["backdrop"]>; label: string }[] = [
  { id: "sky", label: "Sky" },
  { id: "chart", label: "City" },
  { id: "void", label: "Plain" },
];

export function CardStudio({ card, onClose }: { card: CardDto; onClose(): void }) {
  const tag = useStore((s) => s.tag);
  const fighter = useStore((s) => s.fighter);
  const head = useStore((s) => s.head);
  const [custom, setCustom] = useState<CardCustom>(card.custom ?? {});
  const [note, setNote] = useState<string | null>(null);
  const blob = useRef<{ key: string; blob: Blob } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const view: CardDto = { ...card, custom, player: { display: tag, fighter, avatar: head } };
  const key = JSON.stringify(custom);
  const file = `mooncade-${card.game}-${card.rarity}.png`;

  useEffect(() => {
    const d = dialog.current!;
    d.showModal();
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    customizeCard(card.id, custom);
    let live = true;
    const t = window.setTimeout(() => {
      void exportCard(view, head).then((b) => live && (blob.current = { key, blob: b }));
    }, 150);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [key, head, tag, fighter]);

  const image = async () => (blob.current?.key === key ? blob.current.blob : exportCard(view, head));
  const download = async () => {
    const url = URL.createObjectURL(await image());
    Object.assign(document.createElement("a"), { href: url, download: file }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNote("Saved to your downloads");
  };
  const share = async () => {
    const out = await shareRun(`My ${card.reason} card from ${GAMES[card.game].name} on MOONCADE. Beat that.\n${location.origin}/play/${card.game}`, await image(), file);
    setNote(out === "shared" ? "Shared" : out === "copied" ? "Copied. Paste it anywhere." : out === "downloaded" ? "Saved to your downloads" : null);
  };
  const set = (patch: Partial<CardCustom>) => {
    setNote(null);
    setCustom((c) => ({ ...c, ...patch }));
  };

  return (
    <dialog
      ref={dialog}
      className="m-auto max-h-[calc(100dvh-1.5rem)] w-[min(880px,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border-2 border-line bg-paper p-0 text-ink shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current.close()}
      aria-label={`Customise your ${card.reason} card`}
      data-testid="card-studio"
    >
      <div className="grid gap-6 p-4 sm:p-6 md:grid-cols-[auto_minmax(0,1fr)]">
        <div className="mx-auto w-[min(280px,70vw)]">
          <CardView card={view} head={head} width={280} className="!w-full" />
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="meta text-muted">
                {GAMES[card.game].name} · {card.rarity}
              </p>
              <h2 className="font-pixel text-3xl leading-none">{card.reason}</h2>
            </div>
            <button className="icon-btn shrink-0" aria-label="Close" onClick={() => dialog.current?.close()}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2.4" />
              </svg>
            </button>
          </div>

          <label className="grid gap-1.5">
            <span className="meta text-muted">Name on the card</span>
            <input
              value={custom.name ?? ""}
              placeholder={tag}
              maxLength={14}
              onChange={(e) => set({ name: e.target.value.replace(/[^\p{L}\p{N} _.!?'-]/gu, "") || undefined })}
              className="min-h-11 rounded-lg border-2 border-line bg-white px-3 font-mono text-base focus:border-accent"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="meta text-muted">Caption</span>
            <input
              value={custom.caption ?? ""}
              placeholder="gm. diamond hands only."
              maxLength={24}
              onChange={(e) => set({ caption: e.target.value || undefined })}
              className="min-h-11 rounded-lg border-2 border-line bg-white px-3 font-mono text-base focus:border-accent"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset>
              <legend className="meta mb-1.5 text-muted">Frame</legend>
              <div className="flex gap-2">
                {THEME_IDS.map((id) => (
                  <button
                    key={id}
                    aria-pressed={(custom.frame ?? card.theme) === id}
                    aria-label={`${THEMES[id].world} frame`}
                    onClick={() => set({ frame: id })}
                    className={`grid h-12 w-12 place-items-center rounded-xl border-2 transition-colors duration-120 ${(custom.frame ?? card.theme) === id ? "border-accent bg-accent/15" : "border-line/30 bg-paper-deep hover:border-line"}`}
                  >
                    <Coin theme={id} size={30} />
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="meta mb-1.5 text-muted">Backdrop</legend>
              <div className="flex flex-wrap gap-2">
                {BACKDROPS.map((b) => (
                  <button key={b.id} className="chip !min-h-12" aria-pressed={(custom.backdrop ?? "sky") === b.id} onClick={() => set({ backdrop: b.id })}>
                    {b.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-2">
            <button className="btn" data-variant="accent" onClick={() => void download()} data-testid="download-card">
              Download
            </button>
            <button className="btn" onClick={() => void share()}>
              Share
            </button>
          </div>
          <p className="meta -mt-2 min-h-4 font-semibold text-accent-deep" role="status">
            {note}
          </p>
        </div>
      </div>
    </dialog>
  );
}
