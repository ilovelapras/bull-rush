import type { Lane } from "@bull-rush/shared";
import { CONFIG } from "./config";

/** What the player must do: jump over it, roll under it, or change lane. Themes decide the look. */
export type ObstacleCategory = "low" | "high" | "block";

export const OBSTACLE_CATEGORIES: readonly ObstacleCategory[] = ["low", "high", "block"];

/** Anything that can appear on the track. Pickups (coins, power-ups) will extend this later. */
export interface Spawnable {
  readonly id: number;
  readonly kind: string;
  /** Distance along the track, in metres from the start. */
  readonly d: number;
  readonly lane: Lane;
}

export interface Obstacle extends Spawnable {
  readonly kind: "obstacle";
  readonly category: ObstacleCategory;
  /** Which look to use within the category (0 .. variantsPerCategory - 1). Chosen by the theme. */
  readonly variant: number;
  /** Set once the player has hit it, so it can't hit twice. */
  hit: boolean;
}

export interface Hitbox {
  halfWidthM: number;
  halfDepthM: number;
  bottomM: number;
  topM: number;
}

/** The hitbox for a category: the visual size shrunk by the forgiveness factor, around its center. */
export function hitboxFor(category: ObstacleCategory): Hitbox {
  const o = CONFIG.obstacles[category];
  const f = CONFIG.hitbox.forgiveness;
  const midY = (o.bottomM + o.topM) / 2;
  const halfH = ((o.topM - o.bottomM) / 2) * f;
  return {
    halfWidthM: (o.widthM / 2) * f,
    halfDepthM: (o.depthM / 2) * f,
    bottomM: midY - halfH,
    topM: midY + halfH,
  };
}
