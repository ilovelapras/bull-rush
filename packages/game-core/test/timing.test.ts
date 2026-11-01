import { describe, expect, it } from "vitest";
import type { InputEvent } from "@bull-rush/shared";
import { CONFIG, Game, type GameEvent } from "../src";
import { jogging } from "./helpers";

const STEP_MS = CONFIG.step.fixedDtS * 1000;

const SCRIPT: InputEvent[] = [
  { type: "lane", target: 1, t: 400 },
  { type: "jump", t: 410 }, // a sideways jump: lane first, then jump
  { type: "lane", target: 0, t: 1700 },
  { type: "roll", t: 2300 },
  { type: "jump", t: 2500 }, // cancels the roll
];

/** Plays SCRIPT with frames at the given times; each event arrives in the first frame at or after it. */
function play(frameTimesMs: number[]) {
  const game = new Game(7);
  game.invincible = true;
  const events: GameEvent[] = [];
  let next = 0;
  for (const nowMs of frameTimesMs) {
    const arrived: InputEvent[] = [];
    while (next < SCRIPT.length && (SCRIPT[next]?.t ?? Infinity) <= nowMs) {
      const e = SCRIPT[next++];
      if (e) arrived.push(e);
    }
    game.update(nowMs, { ...jogging(0.7), events: arrived });
    events.push(...game.drainEvents());
  }
  const { x, y, lane, action } = game.player;
  return { events, x, y, lane, action, distanceM: game.distanceM, timeMs: game.timeMs };
}

function frames(endMs: number, nextFrameMs: (t: number, i: number) => number): number[] {
  const times: number[] = [];
  for (let t = 0, i = 0; t < endMs; i++) {
    t = Math.min(endMs, nextFrameMs(t, i));
    times.push(t);
  }
  return times;
}

describe("Game timing", () => {
  it("gives the same run at any frame rate", () => {
    const end = 3000;
    const at60 = play(frames(end, (t) => t + 1000 / 60));
    const at25 = play(frames(end, (t) => t + 40)); // camera-rate frames
    const jittery = play(frames(end, (t, i) => t + ([7, 33, 16, 51, 3][i % 5] ?? 16)));

    expect(at60.events.length).toBeGreaterThan(0);
    expect(at25).toEqual(at60);
    expect(jittery).toEqual(at60);
  });

  it("applies lane changes before a jump stamped just after", () => {
    const { events } = play(frames(1000, (t) => t + 40));
    expect(events.slice(0, 2).map((e) => e.type)).toEqual(["laneChange", "jump"]);
  });

  it("holds an event stamped in the future until its time comes", () => {
    const game = new Game(1);
    game.invincible = true;
    game.update(100, { ...jogging(0.5), events: [{ type: "jump", t: 500 }] });
    expect(game.player.action).toBe("run");
    game.update(490, jogging(0.5));
    expect(game.player.action).toBe("run");
    game.update(520, jogging(0.5));
    expect(game.player.action).toBe("jump");
  });

  it("skips a long stall instead of simulating it all at once", () => {
    const game = new Game(1, 1000);
    game.invincible = true;
    game.update(1000 + 5000, jogging(0.5)); // e.g. the tab was in the background
    expect(game.elapsedS).toBeLessThanOrEqual(CONFIG.step.maxFrameDtS + 1e-9);
    expect(game.timeMs).toBeGreaterThan(6000 - STEP_MS);
  });
});
