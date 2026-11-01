import {
  AmbientLight,
  Color,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  type Object3D,
} from "three";
import { OBSTACLE_CATEGORIES } from "@bull-rush/game-core";
import { CONFIG } from "@bull-rush/game-core";
import type { Theme } from "./Theme";

const SPACING_M = 3;

/** Dev page (?gallery=1): every obstacle, the runner and the bull in rows, for checking a theme. */
export function showGallery(canvas: HTMLCanvasElement, theme: Theme): void {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  const scene = new Scene();
  scene.background = new Color(theme.palette.sky);
  scene.add(new AmbientLight(0xffffff, 1.3));
  const sun = new DirectionalLight(0xfff2d6, 1.6);
  sun.position.set(-4, 10, 6);
  scene.add(sun);

  const place = (object: Object3D, col: number, row: number) => {
    object.position.set((col - 1) * SPACING_M, 0, -row * SPACING_M);
    scene.add(object);
  };
  OBSTACLE_CATEGORIES.forEach((category, row) => {
    for (let variant = 0; variant < CONFIG.obstacles.variantsPerCategory; variant++) {
      place(theme.createObstacle(category, variant), variant, row);
    }
  });
  place(theme.createRunner(), 0, OBSTACLE_CATEGORIES.length);
  place(theme.createBull(), 2, OBSTACLE_CATEGORIES.length);
  place(theme.createBuilding(0), 1, OBSTACLE_CATEGORIES.length + 1);

  const camera = new PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 7, 8);
  camera.lookAt(0, 0.5, -5);
  renderer.render(scene, camera);
}
