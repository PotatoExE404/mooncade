import { useSyncExternalStore } from "react";
import { audio } from "./audio";

export function useAudioSettings() {
  return useSyncExternalStore(
    (cb) => audio.subscribe(cb),
    () => audio.settings,
    () => audio.settings,
  );
}
