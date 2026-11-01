// Pure game simulation. No Three.js, no DOM, no browser APIs (see CLAUDE.md §4.2).
export { Chase } from "./Chase";
export { checkCollision, type Hit } from "./Collision";
export { CONFIG } from "./config";
export { difficultyAt } from "./Difficulty";
export { Game, type GameInput, type GameView } from "./Game";
export {
  OBSTACLE_CATEGORIES,
  hitboxFor,
  type Hitbox,
  type Obstacle,
  type ObstacleCategory,
  type Spawnable,
} from "./ObstacleTypes";
export { PatternGenerator, isPassable, type Cell, type RowPlan } from "./PatternGenerator";
export { Player, type GameEvent, type PlayerAction } from "./Player";
export { Rng } from "./rng";
export type { Score } from "./Score";
export { Track } from "./Track";
