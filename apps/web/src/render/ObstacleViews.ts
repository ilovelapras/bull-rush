import type { Group, Object3D } from "three";
import { CONFIG, type Obstacle } from "@bull-rush/game-core";
import type { Theme } from "./Theme";

/** Keeps one 3D object per obstacle on the track, reusing objects as obstacles come and go. */
export class ObstacleViews {
  private readonly active = new Map<number, Object3D>();
  private readonly pool = new Map<string, Object3D[]>();
  private readonly keyOf = new Map<number, string>();

  constructor(
    private readonly parent: Group,
    private readonly theme: Theme,
  ) {}

  sync(obstacles: readonly Obstacle[], distanceM: number): void {
    const seen = new Set<number>();
    for (const o of obstacles) {
      seen.add(o.id);
      let view = this.active.get(o.id);
      if (!view) {
        view = this.acquire(o);
        this.active.set(o.id, view);
      }
      view.position.set(o.lane * CONFIG.lanes.widthM, 0, -(o.d - distanceM));
      view.visible = !o.hit || o.d - distanceM > -2; // hit obstacles vanish once passed
    }
    for (const [id, view] of this.active) {
      if (seen.has(id)) continue;
      this.release(id, view);
    }
  }

  private acquire(o: Obstacle): Object3D {
    const key = `${o.category}:${o.variant}`;
    const view = this.pool.get(key)?.pop() ?? this.theme.createObstacle(o.category, o.variant);
    this.keyOf.set(o.id, key);
    view.visible = true;
    this.parent.add(view);
    return view;
  }

  private release(id: number, view: Object3D): void {
    this.active.delete(id);
    const key = this.keyOf.get(id);
    this.keyOf.delete(id);
    this.parent.remove(view);
    if (key) {
      const list = this.pool.get(key) ?? [];
      list.push(view);
      this.pool.set(key, list);
    }
  }
}
