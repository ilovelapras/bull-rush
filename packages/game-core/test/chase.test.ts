import { describe, expect, it } from "vitest";
import { CONFIG, Chase } from "../src";

const C = CONFIG.chase;

function simulate(chase: Chase, seconds: number, jogging: boolean, intensity: number): void {
  for (let i = 0; i < seconds * 60; i++) chase.update(1 / 60, jogging, intensity, false);
}

describe("Chase", () => {
  it("lets the bull charge and catch you within a few seconds when not jogging", () => {
    const chase = new Chase();
    simulate(chase, 5, false, 0);
    expect(chase.caught).toBe(true);
  });

  it("settles the bull at the resting gap behind the slowest jog", () => {
    const chase = new Chase();
    simulate(chase, 30, true, 0);
    expect(chase.gapM).toBeCloseTo(C.gapRestM, 0);
  });

  it("lets the bull drop further back the harder you jog, up to the maximum", () => {
    const chase = new Chase();
    simulate(chase, 60, true, 1);
    expect(chase.gapM).toBeGreaterThan(C.gapMaxM - 0.5);
    expect(chase.gapM).toBeLessThanOrEqual(C.gapMaxM);
  });

  it("speeds the bull up over time but never past the fastest jog", () => {
    const chase = new Chase();
    simulate(chase, 50, true, 0);
    expect(chase.bullTopSpeedMps).toBeCloseTo(C.bullStartSpeedMps + C.bullAccelMps2 * 50, 1);
    simulate(chase, 1000, true, 0);
    expect(chase.bullTopSpeedMps).toBe(C.bullMaxSpeedMps);
    expect(chase.bullTopSpeedMps).toBeLessThan(C.jogMaxSpeedMps);
  });

  it("never catches a player who keeps jogging and doesn't get hit", () => {
    const chase = new Chase();
    simulate(chase, 600, true, 0);
    expect(chase.caught).toBe(false);
  });

  it("brings the bull close on a hit, then lets it drop back after the danger window", () => {
    const chase = new Chase();
    simulate(chase, 10, true, 0.5);
    chase.strike();
    expect(chase.gapM).toBeLessThanOrEqual(C.dangerGapM);
    simulate(chase, C.dangerWindowS - 0.5, true, 0.5);
    expect(chase.gapM).toBeLessThan(C.dangerGapM + 0.5);
    simulate(chase, 15, true, 0.5);
    expect(chase.gapM).toBeGreaterThan(C.gapRestM);
    expect(chase.caught).toBe(false);
  });

  it("is caught by a second hit inside the danger window", () => {
    const chase = new Chase();
    chase.strike();
    simulate(chase, C.dangerWindowS - 1, true, 1);
    chase.strike();
    expect(chase.caught).toBe(true);
  });

  it("survives a second hit after the danger window has closed", () => {
    const chase = new Chase();
    chase.strike();
    simulate(chase, C.dangerWindowS + 0.5, true, 1);
    chase.strike();
    expect(chase.caught).toBe(false);
  });
});
