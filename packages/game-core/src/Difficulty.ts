import { CONFIG } from "./config";

/** 0 at the start of a run, rising linearly to 1 after `rampS` seconds. */
export function difficultyAt(elapsedS: number): number {
  return Math.min(1, Math.max(0, elapsedS / CONFIG.track.rampS));
}
