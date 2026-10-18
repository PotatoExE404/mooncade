import { useEffect, useState } from "react";
import { canvas } from "./bake";
import { fighterSheet, type FighterId } from "./fighters";
import { headOf } from "./props";
import { hashString } from "../sim/rng";
import { HEAD, headFromPortrait } from "../avatar/pipeline";

export const headKey = (dataUrl: string) => hashString(dataUrl).toString(36);

const loaded = new Map<string, Promise<HTMLCanvasElement>>();

export function headCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
  let p = loaded.get(dataUrl);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = canvas(img.width, img.height);
        c.getContext("2d")!.drawImage(img, 0, 0);
        resolve(c);
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
    loaded.set(dataUrl, p);
  }
  return p;
}

const gameHeads = new Map<string, Promise<HTMLCanvasElement>>();
export function gameHead(dataUrl: string): Promise<HTMLCanvasElement> {
  let p = gameHeads.get(dataUrl);
  if (!p) {
    p = headCanvas(dataUrl).then((c) => (c.width > HEAD ? headFromPortrait(c) : c));
    gameHeads.set(dataUrl, p);
  }
  return p;
}

export function useHead(dataUrl: string | null): { key: string; canvas: HTMLCanvasElement } | null {
  const [head, setHead] = useState<{ key: string; canvas: HTMLCanvasElement } | null>(null);
  useEffect(() => {
    let live = true;
    if (!dataUrl) {
      setHead(null);
      return;
    }
    gameHead(dataUrl).then((c) => live && setHead({ key: headKey(dataUrl), canvas: c }), () => live && setHead(null));
    return () => {
      live = false;
    };
  }, [dataUrl]);
  return head;
}

const houseUrls = new Map<FighterId, string>();

export function houseHeadUrl(id: FighterId): string {
  let u = houseUrls.get(id);
  if (!u) {
    u = headOf(fighterSheet(id)).toDataURL();
    houseUrls.set(id, u);
  }
  return u;
}
