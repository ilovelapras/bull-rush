import {
  AmbientLight,
  Color,
  DirectionalLight,
  Fog,
  Group,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { CONFIG, type GameView } from "@bull-rush/game-core";
import { BullView } from "./BullView";
import { ObstacleViews } from "./ObstacleViews";
import { PlayerView } from "./PlayerView";
import { StreetView } from "./StreetView";
import type { Theme } from "./Theme";

const MAX_PIXEL_RATIO = 1.5; // cap for phone performance
const FOG_NEAR_M = 20;
const FOG_SPAWN_MARGIN_M = 5; // fully fogged this far before the spawn point, so nothing pops in
const FOG_FAR_M = CONFIG.track.spawnAheadM - FOG_SPAWN_MARGIN_M;
const CAMERA_HEIGHT_M = 4.2;
const CAMERA_BACK_M = 10; // far enough back that the bull is in view when it's close
const CAMERA_FOLLOW_X = 0.4; // how much the camera follows the player sideways
const SHAKE_MAX_M = 0.12;

/** Draws a Game with Three.js. Only reads game state; never changes it (CLAUDE.md rule R2). */
export class Renderer {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(60, 1, 0.1, 100);
  private readonly street: StreetView;
  private readonly player: PlayerView;
  private readonly bull: BullView;
  private readonly obstacles: ObstacleViews;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    theme: Theme,
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));

    this.scene.background = new Color(theme.palette.sky);
    this.scene.fog = new Fog(theme.palette.sky, FOG_NEAR_M, FOG_FAR_M);

    this.scene.add(new AmbientLight(0xffffff, 1.3));
    const sun = new DirectionalLight(0xfff2d6, 1.6);
    sun.position.set(-4, 10, 6);
    this.scene.add(sun);

    this.street = new StreetView(theme);
    this.scene.add(this.street.object);

    const obstacleParent = new Group();
    this.scene.add(obstacleParent);
    this.obstacles = new ObstacleViews(obstacleParent, theme);

    this.player = new PlayerView(theme.createRunner());
    this.scene.add(this.player.object);

    this.bull = new BullView(theme.createBull());
    this.scene.add(this.bull.object);

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  render(game: GameView, timeS: number): void {
    const { player, chase } = game;

    this.street.update(game.distanceM);
    this.obstacles.sync(game.track.obstacles, game.distanceM);
    this.player.update(player, chase.playerSpeedMps, timeS);
    this.bull.update(chase.gapM, player.x, timeS, chase.bullSpeedMps);

    // The closer the bull, the more the camera shakes.
    const closeness = Math.max(0, 1 - chase.gapM / CONFIG.chase.bullVisibleGapM);
    const shake = closeness * SHAKE_MAX_M;
    const camX = player.x * CAMERA_FOLLOW_X;
    this.camera.position.set(
      camX + Math.sin(timeS * 53) * shake,
      CAMERA_HEIGHT_M + Math.sin(timeS * 61) * shake,
      CAMERA_BACK_M,
    );
    this.camera.lookAt(camX, 1, -8);

    this.renderer.render(this.scene, this.camera);
  }

  private resize(): void {
    const { clientWidth: width, clientHeight: height } = this.canvas;
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.fov = this.camera.aspect < 1 ? 75 : 60; // wider view on tall phone screens
    this.camera.updateProjectionMatrix();
  }
}
