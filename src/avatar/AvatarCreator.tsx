import { useEffect, useMemo, useRef, useState } from "react";
import { fighterSheet, type FighterId } from "../art/fighters";
import { hashString } from "../sim/rng";
import { setState, useStore } from "../state/store";
import { headFromPortrait, loadPhoto, makePortrait, PALETTES, type Crop } from "./pipeline";
import { RetroCam } from "../components/RetroCam";

const VIEW = 280;

export function AvatarCreator({ onDone }: { onDone?: () => void }) {
  const theme = useStore((s) => s.theme);
  const fighter = useStore((s) => s.fighter) as FighterId;
  const saved = useStore((s) => s.head);
  const [photo, setPhoto] = useState<ImageBitmap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.6);
  const [pan, setPan] = useState({ x: 0.5, y: 0.4 });
  const [paletteKey, setPaletteKey] = useState<string>("photo");
  const [colors, setColors] = useState(24);
  const [dither, setDither] = useState(false);
  const [boost, setBoost] = useState(1.08);
  const [cut, setCut] = useState(false);
  const [saved2, setSaved2] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; pan: { x: number; y: number } } | null>(null);
  const cropCanvas = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const crop: Crop | null = useMemo(() => {
    if (!photo) return null;
    const size = Math.min(photo.width, photo.height) / zoom;
    return {
      x: Math.max(0, Math.min(photo.width - size, pan.x * photo.width - size / 2)),
      y: Math.max(0, Math.min(photo.height - size, pan.y * photo.height - size / 2)),
      size,
    };
  }, [photo, zoom, pan]);

  const portrait = useMemo(
    () => (photo && crop ? makePortrait(photo, crop, { palette: paletteKey, team: theme, colors, dither, contrast: boost, cutBackground: cut }) : null),
    [photo, crop, paletteKey, theme, colors, dither, boost, cut],
  );
  const head = useMemo(() => (portrait ? headFromPortrait(portrait) : null), [portrait]);
  const headKey = useMemo(() => (portrait ? hashString(portrait.toDataURL()).toString(36) : null), [portrait]);

  useEffect(() => {
    const c = cropCanvas.current;
    if (!c || !photo || !crop) return;
    const g = c.getContext("2d")!;
    g.clearRect(0, 0, VIEW, VIEW);
    g.drawImage(photo, crop.x, crop.y, crop.size, crop.size, 0, 0, VIEW, VIEW);
    g.fillStyle = "rgba(20,14,8,0.45)";
    g.beginPath();
    g.rect(0, 0, VIEW, VIEW);
    g.roundRect(8, 8, VIEW - 16, VIEW - 16, VIEW * 0.3);
    g.fill("evenodd");
    g.strokeStyle = "rgba(255,255,255,0.7)";
    g.setLineDash([6, 6]);
    g.beginPath();
    g.ellipse(VIEW / 2, VIEW * 0.46, VIEW * 0.24, VIEW * 0.31, 0, 0, Math.PI * 2);
    g.stroke();
  }, [photo, crop]);

  useEffect(() => {
    const c = previewRef.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    let raf = 0;
    const sheet = head && headKey ? fighterSheet(fighter, { key: `preview:${headKey}`, canvas: head }) : fighterSheet(fighter);
    const loop = (t: number) => {
      g.clearRect(0, 0, c.width, c.height);
      const pose = (["run0", "run1", "run2", "run3"] as const)[Math.floor(t / 110) % 4];
      const fw = 18 * 5, fh = 24 * 5;
      if (portrait) {
        const total = 48 * 3 + 24 + fw;
        const x0 = Math.round((c.width - total) / 2);
        g.drawImage(portrait, x0, 0, 48 * 3, 48 * 3);
        g.drawImage(sheet.right[pose], x0 + 48 * 3 + 24, Math.round((c.height - fh) / 2), fw, fh);
      } else g.drawImage(sheet.right[pose], Math.round((c.width - fw) / 2), Math.round((c.height - fh) / 2), fw, fh);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [portrait, head, headKey, fighter]);

  const onFile = async (file: File | undefined | null) => {
    if (!file) return;
    setError(null);
    setSaved2(false);
    try {
      setPhoto(await loadPhoto(file));
      setZoom(1.6);
      setPan({ x: 0.5, y: 0.4 });
    } catch (e) {
      setError((e as Error).message || "Couldn't read that photo.");
    }
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith("image/"));
      if (f) void onFile(f);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const save = () => {
    if (!portrait) return;
    setState({ head: portrait.toDataURL("image/png") });
    setSaved2(true);
    onDone?.();
  };

  const clear = () => {
    setState({ head: null });
    setPhoto(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
      <div>
        {!photo ? (
          <label
            className={`grid cursor-pointer place-items-center rounded-xl border-[3px] border-dashed bg-paper p-6 text-center transition-colors duration-150 ${dragging ? "border-accent bg-accent/10" : "border-line/40 hover:border-line"}`}
            style={{ width: VIEW, height: VIEW, maxWidth: "100%" }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void onFile(e.dataTransfer.files[0]);
            }}
          >
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} data-testid="photo-input" />
            <span>
              <RetroCam size={56} className="mx-auto block" />
              <span className="mt-3 block font-pixel text-2xl">Drop a selfie</span>
              <span className="mt-1 block text-sm text-muted">or tap to choose · paste works too</span>
            </span>
          </label>
        ) : (
          <div>
            <canvas
              ref={cropCanvas}
              width={VIEW}
              height={VIEW}
              className="block cursor-grab touch-none rounded-xl border-2 border-line active:cursor-grabbing"
              style={{ width: VIEW, height: VIEW, maxWidth: "100%" }}
              aria-label="Drag to put your face inside the dotted guide"
              onPointerDown={(e) => {
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                drag.current = { x: e.clientX, y: e.clientY, pan };
              }}
              onPointerMove={(e) => {
                if (!drag.current || !photo || !crop) return;
                const k = crop.size / VIEW;
                setPan({ x: drag.current.pan.x - ((e.clientX - drag.current.x) * k) / photo.width, y: drag.current.pan.y - ((e.clientY - drag.current.y) * k) / photo.height });
              }}
              onPointerUp={() => (drag.current = null)}
              onWheel={(e) => setZoom((z) => Math.max(1, Math.min(5, z - e.deltaY * 0.002)))}
            />
            <label className="mt-3 grid gap-1">
              <span className="meta text-muted">Zoom: fill the guide with your face</span>
              <input type="range" min={1} max={5} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="accent-[var(--accent)]" />
            </label>
            <button className="meta mt-2 text-muted underline underline-offset-4 hover:text-ink" onClick={() => setPhoto(null)}>
              Choose another photo
            </button>
          </div>
        )}
        {error && (
          <p className="mt-2 text-sm text-[#b42318]" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="space-y-5">
        <div className="inline-block rounded-xl border-2 border-line bg-[#1b1712] p-3">
          <canvas ref={previewRef} width={300} height={144} className="pixelated block max-w-full" aria-label="Preview of your pixel portrait and fighter" />
        </div>
        <fieldset>
          <legend className="meta mb-2 text-muted">Colours</legend>
          <div className="flex flex-wrap gap-2">
            {[...Object.entries(PALETTES).map(([k, v]) => [k, v.name] as const), ["team", "Skin colours"] as const].map(([k, name]) => (
              <button key={k} className="chip" onClick={() => setPaletteKey(k)} aria-pressed={paletteKey === k}>
                {name}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          {paletteKey === "photo" && (
            <label className="grid gap-1">
              <span className="meta text-muted">Detail · {colors} colours</span>
              <input type="range" min={10} max={40} step={1} value={colors} onChange={(e) => setColors(Number(e.target.value))} className="accent-[var(--accent)]" />
            </label>
          )}
          <label className="grid gap-1">
            <span className="meta text-muted">Contrast</span>
            <input type="range" min={0.9} max={1.5} step={0.02} value={boost} onChange={(e) => setBoost(Number(e.target.value))} className="accent-[var(--accent)]" />
          </label>
          <div className="flex flex-wrap gap-4 sm:col-span-2">
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" checked={cut} onChange={(e) => setCut(e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
              <span className="meta text-muted">Remove plain background</span>
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" checked={dither} onChange={(e) => setDither(e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
              <span className="meta text-muted">Dither</span>
            </label>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn" data-variant="accent" disabled={!portrait} onClick={save} data-testid="save-avatar">
            {saved2 ? "Saved ✓" : "Use this face"}
          </button>
          {saved && (
            <button className="btn" onClick={clear}>
              Back to house head
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
