import type { Object3D } from "three";
import type { ObstacleCategory } from "@bull-rush/game-core";

/** Length of one building segment along the street, in metres. */
export const BUILDING_SEGMENT_M = 10;
/** Distance from the center line to the inside face of the buildings, in metres. */
export const STREET_HALF_WIDTH_M = 4.6;

/** The theme's words and icons, shown by the menu, HUD and game-over screen. */
export interface ThemeText {
  title: string;
  tagline: string;
  /** First paragraph of How to Play: what you're running from and why speed matters. */
  howToIntro: string;
  /** Game-over heading. */
  caught: string;
  /** Name of the chaser in stats, e.g. "<chaserName> top speed". */
  chaserName: string;
  icons: { runner: string; chaser: string };
}

/** Everything that gives the game its look. The renderer and UI only know this interface. */
export interface Theme {
  text: ThemeText;
  palette: {
    sky: number;
    ground: number;
    laneLine: number;
  };
  /** Origin at the feet, facing -z (away from the camera), about 1.7 m tall. */
  createRunner(): Object3D;
  /** Origin at the feet, facing -z, so it looks towards the runner it chases. */
  createBull(): Object3D;
  /** Origin at the center of the base on the ground. */
  createObstacle(category: ObstacleCategory, variant: number): Object3D;
  buildingVariants: number;
  /** One side of the street, BUILDING_SEGMENT_M deep. Origin at the center of its base. */
  createBuilding(variant: number): Object3D;
}
