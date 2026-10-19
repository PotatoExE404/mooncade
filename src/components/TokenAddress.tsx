import { useEffect, useRef, useState } from "react";
import { TOKEN_ADDRESS } from "../config";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

export function TokenAddress() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!TOKEN_ADDRESS)
    return (
      <span className="chip cursor-default">
        <span className="font-bold">CA</span>
        <span className="text-muted">launching soon</span>
      </span>
    );

  const copy = async () => {
    if (!(await copyText(TOKEN_ADDRESS))) return;
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button type="button" className="chip" onClick={() => void copy()} title={TOKEN_ADDRESS} aria-label={`Copy token address ${TOKEN_ADDRESS}`}>
      <span className="font-bold">CA</span>
      <span>{copied ? "Copied!" : `${TOKEN_ADDRESS.slice(0, 6)}…${TOKEN_ADDRESS.slice(-6)}`}</span>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" shapeRendering="crispEdges">
        {copied ? <path d="M2 8h2v2h2v2h2v-2h2V8h2V6h2V4h-2v2h-2v2H8v2H6V8H4V6H2z" /> : <path d="M5 1h9v10h-2V3H5zM2 5h9v10H2zm2 2v6h5V7z" fillRule="evenodd" />}
      </svg>
      <span className="sr-only" role="status">
        {copied ? "Token address copied" : ""}
      </span>
    </button>
  );
}
