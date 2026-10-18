import { deflateSync, inflateSync } from "fflate";
import { ACTION_MASK } from "./input";

export const MAX_TICKS = 60 * 60 * 20;

function writeVarint(out: number[], n: number) {
  while (n >= 0x80) {
    out.push((n & 0x7f) | 0x80);
    n >>>= 7;
  }
  out.push(n);
}

export function encodeInputs(inputs: Uint8Array): string {
  const out: number[] = [];
  let i = 0;
  while (i < inputs.length) {
    const v = inputs[i];
    let n = 1;
    while (i + n < inputs.length && inputs[i + n] === v) n++;
    out.push(v);
    writeVarint(out, n);
    i += n;
  }
  const packed = deflateSync(Uint8Array.from(out), { level: 9 });
  let bin = "";
  for (const b of packed) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeInputs(encoded: string, maxTicks = MAX_TICKS): Uint8Array {
  if (encoded.length > 200_000 || !/^[A-Za-z0-9_-]*$/.test(encoded)) throw new Error("bad replay encoding");
  const bin = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
  const packed = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const raw = inflateSync(packed, { out: new Uint8Array(Math.min(maxTicks * 2, 1 << 20)) });
  const ticks: number[] = [];
  let i = 0;
  while (i < raw.length) {
    const v = raw[i++];
    if (v > ACTION_MASK) throw new Error("bad input bits");
    let n = 0;
    let shift = 0;
    for (;;) {
      if (i >= raw.length) throw new Error("truncated replay");
      const b = raw[i++];
      n |= (b & 0x7f) << shift;
      if (!(b & 0x80)) break;
      shift += 7;
      if (shift > 21) throw new Error("bad varint");
    }
    if (ticks.length + n > maxTicks) throw new Error("replay too long");
    for (let k = 0; k < n; k++) ticks.push(v);
  }
  return Uint8Array.from(ticks);
}
