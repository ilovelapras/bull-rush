import { CONFIG, Game, type GameInput } from "../src";

export const NOT_JOGGING: GameInput = { events: [], jogging: false, jogIntensity: 0 };

const FRAME_MS = CONFIG.step.fixedDtS * 1000;

export function jogging(intensity: number): GameInput {
  return { events: [], jogging: true, jogIntensity: intensity };
}

/** Advance a game by one 60 fps frame (exactly one simulation step). */
export function frame(game: Game, input: GameInput): void {
  game.update(game.timeMs + FRAME_MS, input);
}

/** Advance a game by `seconds` of play with the same input every frame (60 fps frames). */
export function run(game: Game, seconds: number, input: GameInput): void {
  const frames = Math.round(seconds * 60);
  for (let i = 0; i < frames; i++) frame(game, input);
}
