import type { Lane } from "@bull-rush/shared";
import { CONFIG } from "./config";
import { difficultyAt } from "./Difficulty";
import { OBSTACLE_CATEGORIES, type ObstacleCategory } from "./ObstacleTypes";
import { Rng } from "./rng";

export interface Cell {
  lane: Lane;
  category: ObstacleCategory;
  variant: number;
}

/** One row of obstacles across the track, and how far it is after the previous row. */
export interface RowPlan {
  gapM: number;
  cells: Cell[];
}

const LANES: readonly Lane[] = [-1, 0, 1];
const T = CONFIG.track;

/** A row is fair if some lane can be passed without changing lane away from a blocker. */
export function isPassable(cells: readonly Cell[]): boolean {
  return LANES.some((lane) => {
    const cell = cells.find((c) => c.lane === lane);
    return cell === undefined || cell.category !== "block";
  });
}

/** Plans fair rows of obstacles. Uses a seeded RNG so runs are reproducible. */
export class PatternGenerator {
  private readonly rng: Rng;
  private openingCategoriesShown = 0;

  constructor(seed: number) {
    this.rng = new Rng(seed);
  }

  /** `elapsedS` is how long the run has lasted when this row is planned. */
  nextRow(elapsedS: number, isFirst: boolean): RowPlan {
    const difficulty = difficultyAt(elapsedS);
    const minGapM = CONFIG.chase.jogMaxSpeedMps * T.minActionGapS;
    const gapM = isFirst
      ? T.firstRowM
      : minGapM + this.rng.next() * T.extraGapMaxM * (1 - difficulty);

    const cells = elapsedS < T.openingS ? this.openingRow() : this.normalRow(difficulty);
    return { gapM, cells };
  }

  private openingRow(): Cell[] {
    // One obstacle at a time, and show each category once before repeating.
    const shown = this.openingCategoriesShown++;
    const category = OBSTACLE_CATEGORIES[shown] ?? this.randomCategory();
    return [this.cell(this.rng.pick(LANES), category)];
  }

  private normalRow(difficulty: number): Cell[] {
    if (this.rng.chance(T.fullWidthRowChance)) {
      // Every lane has the same jump-over or roll-under obstacle, so the player just does that move.
      const category: ObstacleCategory = this.rng.chance(0.5) ? "low" : "high";
      return LANES.map((lane) => this.cell(lane, category));
    }

    const lanes = [...LANES];
    const first = lanes.splice(this.rng.int(lanes.length), 1)[0];
    if (first === undefined) throw new Error("no lane");
    const cells = [this.cell(first, this.randomCategory())];

    if (this.rng.chance(difficulty * T.doubleRowMaxChance)) {
      const second = lanes.splice(this.rng.int(lanes.length), 1)[0];
      if (second === undefined) throw new Error("no lane");
      cells.push(this.cell(second, this.randomCategory()));
    }
    return cells;
  }

  private cell(lane: Lane, category: ObstacleCategory): Cell {
    return { lane, category, variant: this.rng.int(CONFIG.obstacles.variantsPerCategory) };
  }

  private randomCategory(): ObstacleCategory {
    const w = T.categoryWeights;
    const r = this.rng.next() * (w.low + w.high + w.block);
    if (r < w.low) return "low";
    if (r < w.low + w.high) return "high";
    return "block";
  }
}
