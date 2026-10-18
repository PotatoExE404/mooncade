import { houseHeadUrl } from "../art/heads";
import type { FighterId } from "../art/fighters";

export function Head({ player, size = 28, className = "" }: { player: { avatar: string | null; fighter: FighterId | string }; size?: number; className?: string }) {
  const src = player.avatar ?? houseHeadUrl(player.fighter as FighterId);
  return <img src={src} width={size} height={size} alt="" className={`pixelated shrink-0 ${className}`} style={{ width: size, height: size }} />;
}
