import { Group, type Object3D } from "three";
import { CONFIG } from "@bull-rush/game-core";

const HIDE_MARGIN_M = 1; // hide just beyond the visible range so it never pops in view

/** The bull chasing from behind (+z). Only shown when it's close enough to be in view. */
export class BullView {
  readonly object = new Group();
  private readonly bull: Object3D;

  constructor(bull: Object3D) {
    this.bull = bull;
    this.object.add(bull);
    this.object.visible = false;
  }

  update(gapM: number, playerX: number, timeS: number, bullSpeedMps: number): void {
    this.object.visible = gapM < CONFIG.chase.bullVisibleGapM + HIDE_MARGIN_M;
    if (!this.object.visible) return;
    // The bull's front is about 1.5 m ahead of its origin; keep the gap measured to its nose.
    this.object.position.z = gapM + 2;
    this.object.position.x += (playerX - this.object.position.x) * 0.08; // drifts after the player
    const gallop = timeS * bullSpeedMps * 1.2;
    this.bull.position.y = Math.abs(Math.sin(gallop)) * 0.15;
    this.bull.rotation.x = Math.sin(gallop) * 0.04;
  }
}
