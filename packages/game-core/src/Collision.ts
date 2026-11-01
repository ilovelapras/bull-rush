import { CONFIG } from "./config";
import { type Obstacle, hitboxFor } from "./ObstacleTypes";
import type { Player } from "./Player";

export type Hit = "none" | "head-on" | "scrape";

/** Box test between the player and an obstacle. A small sideways overlap is a scrape. */
export function checkCollision(player: Player, playerDistanceM: number, obstacle: Obstacle): Hit {
  const box = hitboxFor(obstacle.category);

  const depthOverlap =
    CONFIG.player.depthM / 2 + box.halfDepthM - Math.abs(obstacle.d - playerDistanceM);
  if (depthOverlap <= 0) return "none";

  const obstacleX = obstacle.lane * CONFIG.lanes.widthM;
  const sideOverlap = CONFIG.player.widthM / 2 + box.halfWidthM - Math.abs(obstacleX - player.x);
  if (sideOverlap <= 0) return "none";

  const feet = player.y;
  const head = player.y + player.heightM;
  if (head <= box.bottomM || feet >= box.topM) return "none";

  return sideOverlap < CONFIG.hitbox.scrapeOverlapM ? "scrape" : "head-on";
}
