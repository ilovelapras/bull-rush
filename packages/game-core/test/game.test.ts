import { describe, expect, it } from "vitest";
import type { InputEvent } from "@bull-rush/shared";
import { CONFIG, Game } from "../src";
import { NOT_JOGGING, frame, jogging, run } from "./helpers";

describe("Game", () => {
  it("is caught quickly if the player doesn't jog", () => {
    const game = new Game(1);
    run(game, 10, NOT_JOGGING);
    expect(game.over).toBe(true);
    expect(game.drainEvents().some((e) => e.type === "caught")).toBe(true);
  });

  it("travels further when jogging faster", () => {
    const slow = new Game(1);
    const fast = new Game(1);
    slow.invincible = true;
    fast.invincible = true;
    run(slow, 10, jogging(0));
    run(fast, 10, jogging(1));
    expect(fast.distanceM).toBeGreaterThan(slow.distanceM);
  });

  it("spawns obstacles ahead and clears them behind", () => {
    const game = new Game(3);
    game.invincible = true;
    run(game, 30, jogging(1));
    expect(game.track.obstacles.length).toBeGreaterThan(0);
    for (const o of game.track.obstacles) {
      expect(o.d).toBeGreaterThanOrEqual(game.distanceM - CONFIG.track.despawnBehindM);
      expect(o.d).toBeLessThanOrEqual(game.distanceM + CONFIG.track.spawnAheadM + 40);
    }
  });

  it("makes you stumble and brings the bull close when you run into something", () => {
    const game = new Game(1);
    game.track.obstacles = [
      { id: 999, kind: "obstacle", d: 20, lane: 0, category: "block", variant: 0, hit: false },
    ];
    game.chase.gapM = CONFIG.chase.gapMaxM;
    for (let i = 0; i < 60 * 10 && game.stumbles === 0; i++) frame(game, jogging(1));
    expect(game.stumbles).toBe(1);
    expect(game.player.stumbling).toBe(true);
    expect(game.chase.gapM).toBeLessThanOrEqual(CONFIG.chase.dangerGapM);
    expect(game.over).toBe(false);
    expect(game.drainEvents().some((e) => e.type === "stumble")).toBe(true);
  });

  it("is caught by two hits in quick succession", () => {
    const game = new Game(1);
    game.track.obstacles = [
      { id: 998, kind: "obstacle", d: 20, lane: 0, category: "block", variant: 0, hit: false },
      { id: 999, kind: "obstacle", d: 35, lane: 0, category: "block", variant: 0, hit: false },
    ];
    run(game, 10, jogging(1));
    expect(game.stumbles).toBe(2);
    expect(game.over).toBe(true);
    expect(game.drainEvents().some((e) => e.type === "caught")).toBe(true);
  });

  it("only counts one hit per obstacle", () => {
    const game = new Game(1);
    game.track.obstacles = [
      { id: 999, kind: "obstacle", d: 20, lane: 0, category: "block", variant: 0, hit: false },
    ];
    game.chase.gapM = CONFIG.chase.gapMaxM;
    for (let i = 0; i < 60 * 5; i++) {
      frame(game, jogging(1));
      game.chase.gapM = CONFIG.chase.gapMaxM;
    }
    expect(game.stumbles).toBe(1);
  });

  it("can be survived by a player who dodges everything", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const game = new Game(seed);
      let lane = 0;
      for (let i = 0; i < 60 * 120 && !game.over; i++) {
        const events: InputEvent[] = [];
        const ahead = game.track.obstacles.filter((o) => o.d > game.distanceM - 1);
        const nearD = ahead[0]?.d;
        if (nearD !== undefined) {
          const row = ahead.filter((o) => o.d === nearD);
          const distanceToRow = nearD - game.distanceM;
          const timeToRow = distanceToRow / game.chase.playerSpeedMps;
          // Pick a lane without a blocker as soon as the row is within 1.5 s.
          if (timeToRow < 1.5 && timeToRow > 0.3) {
            const blocked = (l: number) => row.some((o) => o.lane === l && o.category === "block");
            if (blocked(lane)) {
              const options = ([-1, 0, 1] as const).filter((l) => !blocked(l));
              const best = options.sort((a, b) => Math.abs(a - lane) - Math.abs(b - lane))[0];
              if (best !== undefined) {
                lane = best;
                events.push({ type: "lane", target: best, t: 0 });
              }
            }
          }
          // Jump or roll shortly before contact, for the obstacle in our lane.
          const mine = row.find((o) => o.lane === lane);
          if (mine && timeToRow < 0.3 && timeToRow > 0.25) {
            if (mine.category === "low") events.push({ type: "jump", t: 0 });
            if (mine.category === "high") events.push({ type: "roll", t: 0 });
          }
        }
        frame(game, { events, jogging: true, jogIntensity: 0.8 });
      }
      expect(game.over, `seed ${seed} was caught`).toBe(false);
      expect(game.stumbles, `seed ${seed} stumbled`).toBe(0);
    }
  });
});
