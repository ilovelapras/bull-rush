import { CircleGeometry, Group, Mesh, MeshBasicMaterial, type Object3D } from "three";
import { CONFIG, type GameView } from "@bull-rush/game-core";

const PIVOT_HEIGHT_M = 0.85; // roughly the runner's center, so rolls spin around the middle
const ROLL_SQUASH = 0.55;

/** Shows the player: running bob, lane lean, a spinning roll, a stumble wobble and a blob shadow. */
export class PlayerView {
  readonly object = new Group();
  private readonly pivot = new Group();
  private readonly shadow: Mesh;

  constructor(runner: Object3D) {
    runner.position.y = -PIVOT_HEIGHT_M;
    this.pivot.add(runner);
    this.pivot.position.y = PIVOT_HEIGHT_M;
    this.object.add(this.pivot);

    this.shadow = new Mesh(
      new CircleGeometry(0.5, 16),
      new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    this.object.add(this.shadow);
  }

  update(player: GameView["player"], speedMps: number, timeS: number): void {
    this.object.position.x = player.x;
    this.object.position.y = player.y;

    const laneX = player.lane * CONFIG.lanes.widthM;
    const rolling = player.action === "roll";
    const squash = rolling ? ROLL_SQUASH : 1;
    const bob = player.action === "run" ? Math.abs(Math.sin(timeS * speedMps * 1.1)) * 0.08 : 0;

    this.pivot.scale.y = squash;
    this.pivot.position.y = PIVOT_HEIGHT_M * squash + bob;
    this.pivot.rotation.x = rolling ? -player.rollProgress * Math.PI * 2 : 0;
    this.pivot.rotation.z =
      (laneX - player.x) * 0.15 + (player.stumbling ? Math.sin(timeS * 40) * 0.15 : 0);

    const shadowScale = Math.max(0.4, 1 - player.y * 0.3);
    this.shadow.scale.setScalar(shadowScale);
    this.shadow.position.y = 0.02 - player.y; // stays on the ground while the player is in the air
  }
}
