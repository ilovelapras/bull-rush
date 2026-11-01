import { describe, expect, it } from "vitest";
import { Player, checkCollision, type Obstacle, type ObstacleCategory } from "../src";

function obstacle(category: ObstacleCategory, lane: -1 | 0 | 1 = 0, d = 10): Obstacle {
  return { id: 1, kind: "obstacle", d, lane, category, variant: 0, hit: false };
}

function player(): Player {
  return new Player(() => {});
}

function advance(p: Player, seconds: number): void {
  for (let i = 0; i < seconds * 600; i++) p.update(1 / 600);
}

describe("checkCollision", () => {
  it("hits a standing player with a low obstacle", () => {
    expect(checkCollision(player(), 10, obstacle("low"))).toBe("head-on");
  });

  it("lets a jumping player clear a low obstacle", () => {
    const p = player();
    p.jump();
    advance(p, 0.35); // near the top of the jump
    expect(checkCollision(p, 10, obstacle("low"))).toBe("none");
  });

  it("hits a standing player with a high obstacle", () => {
    expect(checkCollision(player(), 10, obstacle("high"))).toBe("head-on");
  });

  it("lets a rolling player pass under a high obstacle", () => {
    const p = player();
    p.roll();
    advance(p, 0.2);
    expect(checkCollision(p, 10, obstacle("high"))).toBe("none");
  });

  it("does not let a jump clear a high obstacle", () => {
    const p = player();
    p.jump();
    advance(p, 0.35);
    expect(checkCollision(p, 10, obstacle("high"))).toBe("head-on");
  });

  it("does not let a jump or a roll get past a blocker", () => {
    const jumping = player();
    jumping.jump();
    advance(jumping, 0.35);
    expect(checkCollision(jumping, 10, obstacle("block"))).toBe("head-on");

    const rolling = player();
    rolling.roll();
    advance(rolling, 0.2);
    expect(checkCollision(rolling, 10, obstacle("block"))).toBe("head-on");
  });

  it("ignores obstacles in other lanes and ones that aren't level with the player", () => {
    expect(checkCollision(player(), 10, obstacle("block", 1))).toBe("none");
    expect(checkCollision(player(), 10, obstacle("block", 0, 14))).toBe("none");
    expect(checkCollision(player(), 10, obstacle("block", 0, 6))).toBe("none");
  });

  it("counts a barely-overlapping lane change as a scrape, then clears it", () => {
    const p = player();
    p.setLane(1); // moving away from a blocker in lane 0
    const results: string[] = [];
    for (let i = 0; i < 600 * 0.3; i++) {
      p.update(1 / 600);
      const r = checkCollision(p, 10, obstacle("block", 0));
      if (results[results.length - 1] !== r) results.push(r);
    }
    expect(results).toEqual(["head-on", "scrape", "none"]);
  });
});
