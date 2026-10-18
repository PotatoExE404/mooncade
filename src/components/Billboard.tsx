import { GAME_ORDER, GAMES } from "../games/registry";
import { formatScore } from "../shared/rules";
import { useStore } from "../state/store";

export function Billboard() {
  const bests = useStore((s) => s.bests);
  const tag = useStore((s) => s.tag);
  const mine = GAME_ORDER.filter((g) => bests[g] !== undefined);
  const row = (
    <span className="inline-flex items-center gap-6 px-6">
      <span className="led text-2xl">INSERT COIN</span>
      <span className="led led-green text-2xl">★ BEAT YOUR HIGH SCORE ★</span>
      {mine.map((g) => (
        <span key={g} className="inline-flex items-center gap-3">
          <span className="led text-xl opacity-80">{tag}</span>
          <span className="led text-xl opacity-80">{GAMES[g].name.toUpperCase()}</span>
          <span className="led led-green text-2xl">{formatScore(g, bests[g]!)}</span>
          <span className="led-green led text-lg">★</span>
        </span>
      ))}
      <span className="led text-2xl">SHARE IT</span>
      <span className="led led-green text-2xl">★ 3 GAMES ★ 18 CARDS ★</span>
      <span className="led text-2xl">PLAY AGAIN</span>
    </span>
  );
  return (
    <div className="billboard" aria-label="Arcade billboard">
      <div className="marquee py-3" style={{ ["--marquee-speed" as string]: `${36 + mine.length * 8}s` }}>
        <div className="flex">{row}{row}</div>
        <div className="flex" aria-hidden="true">{row}{row}</div>
      </div>
    </div>
  );
}
