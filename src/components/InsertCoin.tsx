import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { audio } from "../engine/audio";
import { useStore } from "../state/store";
import { Coin } from "./Coin";
import { MarqueeLights } from "./MarqueeLights";

export function InsertCoin() {
  const navigate = useNavigate();
  const theme = useStore((s) => s.theme);
  const [stage, setStage] = useState<"idle" | "drop" | "credit" | "zoom">("idle");
  const coin = useRef<HTMLSpanElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const insert = () => {
    if (stage !== "idle") return;
    audio.unlock();
    if (reduced) {
      navigate("/play");
      return;
    }
    const c = coin.current!.getBoundingClientRect(), s = slot.current!.getBoundingClientRect();
    coin.current!.style.setProperty("--slot-dx", `${s.left + s.width / 2 - (c.left + c.width / 2)}px`);
    coin.current!.style.setProperty("--slot-dy", `${s.top + 30 - (c.top + c.height / 2)}px`);
    setStage("drop");
    window.setTimeout(() => {
      audio.chime(4);
      window.setTimeout(() => audio.chime(9), 90);
      setStage("credit");
    }, 640);
    window.setTimeout(() => {
      audio.launch();
      setStage("zoom");
    }, 1250);
    window.setTimeout(() => navigate("/play", { state: { fromCoin: true } }), 1720);
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label="Insert coin and choose a game"
        onClick={insert}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), insert())}
        className="bulbs group block cursor-pointer px-6 py-9 text-center transition-transform duration-200 hover:-translate-y-1 focus-visible:-translate-y-1 sm:px-10 sm:py-12"
      >
        <MarqueeLights />
        <h1 className="font-pixel text-[clamp(2.6rem,7.4vw,6.2rem)] leading-none font-bold lg:text-[clamp(2.6rem,5.6vw,6.2rem)]">
          <span className="led block">MOONCADE</span>
        </h1>
        <p className={`led led-green mt-4 text-2xl sm:text-3xl ${stage === "idle" ? "blink" : ""}`} aria-live="polite">
          {stage === "idle" ? "INSERT COIN" : "CREDIT 01"}
        </p>
        <div className="mt-6 flex items-center justify-center gap-6">
          <span ref={coin} className={`inline-block transition-transform duration-200 group-hover:-translate-y-1 ${stage !== "idle" ? "coin-dropping" : "bob"}`}>
            <Coin theme={theme} size={56} />
          </span>
          <div ref={slot} className="coin-slot" data-lit={stage === "credit" || stage === "zoom"} aria-hidden="true">
            <span className="led absolute inset-x-0 bottom-1.5 text-center text-xs">25¢</span>
          </div>
        </div>
      </div>
      {stage === "zoom" && <div className="crt-zoom fixed inset-0 z-50 bg-[#0a0806]" aria-hidden="true" />}
    </>
  );
}
