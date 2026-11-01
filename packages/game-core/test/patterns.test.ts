import { describe, expect, it } from "vitest";
import { CONFIG, PatternGenerator, isPassable } from "../src";

describe("PatternGenerator", () => {
  it("never produces an impassable row, across many seeds and difficulties", () => {
    for (let seed = 1; seed <= 2000; seed++) {
      const gen = new PatternGenerator(seed);
      for (let row = 0; row < 40; row++) {
        const elapsed = row * 5; // spans the opening, the ramp and full difficulty
        const plan = gen.nextRow(elapsed, row === 0);
        expect(isPassable(plan.cells), `seed ${seed} row ${row}`).toBe(true);
        expect(plan.cells.length).toBeGreaterThan(0);
        const lanes = plan.cells.map((c) => c.lane);
        expect(new Set(lanes).size).toBe(lanes.length); // no two obstacles in one lane
      }
    }
  });

  it("leaves at least the minimum action gap between rows at the fastest jog", () => {
    const minGapM = CONFIG.chase.jogMaxSpeedMps * CONFIG.track.minActionGapS;
    for (let seed = 1; seed <= 200; seed++) {
      const gen = new PatternGenerator(seed);
      gen.nextRow(0, true);
      for (let row = 1; row < 30; row++) {
        expect(gen.nextRow(row * 6, false).gapM).toBeGreaterThanOrEqual(minGapM);
      }
    }
  });

  it("starts gently: one obstacle per row, showing each category once", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const gen = new PatternGenerator(seed);
      const rows = [0, 1, 2].map((i) => gen.nextRow(i * 2, i === 0));
      for (const row of rows) expect(row.cells).toHaveLength(1);
      expect(rows.map((r) => r.cells[0]?.category)).toEqual(["low", "high", "block"]);
    }
  });

  it("is reproducible for a given seed", () => {
    const a = new PatternGenerator(99);
    const b = new PatternGenerator(99);
    for (let i = 0; i < 20; i++)
      expect(a.nextRow(i * 8, i === 0)).toEqual(b.nextRow(i * 8, i === 0));
  });

  it("only uses variants that exist", () => {
    const gen = new PatternGenerator(5);
    for (let i = 0; i < 200; i++) {
      for (const cell of gen.nextRow(60, false).cells) {
        expect(cell.variant).toBeGreaterThanOrEqual(0);
        expect(cell.variant).toBeLessThan(CONFIG.obstacles.variantsPerCategory);
      }
    }
  });
});
