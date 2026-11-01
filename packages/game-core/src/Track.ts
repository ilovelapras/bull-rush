import { CONFIG } from "./config";
import type { Obstacle } from "./ObstacleTypes";
import { PatternGenerator } from "./PatternGenerator";

/** Spawns rows of obstacles ahead of the player and drops them once they're behind. */
export class Track {
  /** Everything currently on the track, nearest first. */
  obstacles: Obstacle[] = [];

  private readonly generator: PatternGenerator;
  private nextRowD = 0;
  private lastRowD = 0;
  private nextId = 1;
  private rowsPlanned = 0;

  constructor(seed: number) {
    this.generator = new PatternGenerator(seed);
  }

  update(playerDistanceM: number, elapsedS: number): void {
    while (this.nextRowD < playerDistanceM + CONFIG.track.spawnAheadM || this.rowsPlanned === 0) {
      const row = this.generator.nextRow(elapsedS, this.rowsPlanned === 0);
      this.nextRowD = this.lastRowD + row.gapM;
      this.lastRowD = this.nextRowD;
      this.rowsPlanned++;
      for (const cell of row.cells) {
        this.obstacles.push({
          id: this.nextId++,
          kind: "obstacle",
          d: this.nextRowD,
          lane: cell.lane,
          category: cell.category,
          variant: cell.variant,
          hit: false,
        });
      }
    }
    // Rows are added in distance order, so passed obstacles are always at the front. Removing them
    // in place avoids a new array every step (less garbage collection on phones).
    const cutoff = playerDistanceM - CONFIG.track.despawnBehindM;
    let passed = 0;
    while (passed < this.obstacles.length && (this.obstacles[passed]?.d ?? Infinity) < cutoff) {
      passed++;
    }
    if (passed > 0) this.obstacles.splice(0, passed);
  }
}
