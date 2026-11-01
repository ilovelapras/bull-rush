import { describe, expect, it } from "vitest";
import { Rng } from "../src";

describe("Rng", () => {
  it("gives the same sequence for the same seed", () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 20; i++) expect(a.next()).toBe(b.next());
  });

  it("stays in range", () => {
    const rng = new Rng(7);
    for (let i = 0; i < 1000; i++) {
      const n = rng.next();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
      expect(rng.int(3)).toBeLessThan(3);
    }
  });
});
