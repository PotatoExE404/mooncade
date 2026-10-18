export interface RunResult {
  game: string;
  number?: number;
  timeMs?: number;
  deaths?: number;
  medals?: ("gold" | "silver" | "bronze" | "none")[];
  url: string;
}

const MEDAL = { gold: "🟨", silver: "⬜", bronze: "🟫", none: "⬛" } as const;

export function formatTime(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${m}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

export function shareText(r: RunResult) {
  const head = [r.game, r.number != null ? `#${r.number}` : "", r.timeMs != null ? `⏱ ${formatTime(r.timeMs)}` : "", r.deaths != null ? `☠ ${r.deaths}` : ""]
    .filter(Boolean)
    .join("  ");
  const row = r.medals?.map((m) => MEDAL[m]).join("") ?? "";
  return [head, row, r.url].filter(Boolean).join("\n");
}

export async function renderCard(draw: (ctx: OffscreenCanvasRenderingContext2D, w: number, h: number) => void, w = 1080, h = 1350): Promise<Blob> {
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  await document.fonts.ready;
  draw(ctx, w, h);
  return canvas.convertToBlob({ type: "image/png" });
}

export type ShareOutcome = "shared" | "copied" | "downloaded" | "cancelled";

export async function shareRun(text: string, image?: Blob, filename = "run.png"): Promise<ShareOutcome> {
  const file = image ? new File([image], filename, { type: "image/png" }) : undefined;
  try {
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return "shared";
    }
    if (!file && navigator.share) {
      await navigator.share({ text });
      return "shared";
    }
  } catch (e) {
    if ((e as DOMException).name === "AbortError") return "cancelled";
  }
  try {
    if (image && "ClipboardItem" in window) {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": image, "text/plain": new Blob([text], { type: "text/plain" }) })]);
    } else {
      await navigator.clipboard.writeText(text);
    }
    return "copied";
  } catch {
    const copied = await navigator.clipboard.writeText(text).then(() => true, () => false);
    if (image) {
      const url = URL.createObjectURL(image);
      Object.assign(document.createElement("a"), { href: url, download: filename }).click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return "downloaded";
    }
    return copied ? "copied" : "cancelled";
  }
}

export function roomCode(length = 5, rand: () => number = Math.random) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => alphabet[Math.floor(rand() * alphabet.length)]).join("");
}
