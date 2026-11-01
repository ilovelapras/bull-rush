import {
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Material,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  SphereGeometry,
  TorusGeometry,
} from "three";
import type { ObstacleCategory } from "@bull-rush/game-core";
import { BUILDING_SEGMENT_M, type Theme } from "../../render/Theme";

// Phase 1: procedural placeholder meshes from Three.js primitives. Geometries and materials are
// cached and shared, so creating obstacles allocates no GPU resources. Real models can replace
// these later without touching anything outside this folder (CLAUDE.md §7.4, rule R8).

const geometries = new Map<string, BufferGeometry>();
const materials = new Map<number, Material>();

function geometry<T extends BufferGeometry>(key: string, make: () => T): T {
  let g = geometries.get(key);
  if (!g) {
    g = make();
    geometries.set(key, g);
  }
  return g as T;
}

function material(color: number): Material {
  let m = materials.get(color);
  if (!m) {
    m = new MeshLambertMaterial({ color });
    materials.set(color, m);
  }
  return m;
}

function mesh(g: BufferGeometry, color: number, x = 0, y = 0, z = 0): Mesh {
  const m = new Mesh(g, material(color));
  m.position.set(x, y, z);
  return m;
}

function box(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0): Mesh {
  return mesh(
    geometry(`box:${w},${h},${d}`, () => new BoxGeometry(w, h, d)),
    color,
    x,
    y,
    z,
  );
}

function group(...children: Object3D[]): Group {
  const g = new Group();
  g.add(...children);
  return g;
}

const BROWN = 0x6b4423;
const RED = 0xd8352a;
const WHITE = 0xf4f1ea;

// ---- Obstacles ------------------------------------------------------------------------------

function pooPile(): Object3D {
  const ring = (radius: number, tube: number, y: number) => {
    const m = mesh(
      geometry(`torus:${radius},${tube}`, () => new TorusGeometry(radius, tube, 8, 16)),
      BROWN,
      0,
      y,
    );
    m.rotation.x = Math.PI / 2;
    return m;
  };
  const tip = mesh(
    geometry("poo-tip", () => new ConeGeometry(0.22, 0.4, 8)),
    BROWN,
    0,
    0.95,
  );
  const fly = (x: number, y: number, z: number) =>
    mesh(
      geometry("fly", () => new SphereGeometry(0.05, 6, 6)),
      0x111111,
      x,
      y,
      z,
    );
  return group(
    ring(0.7, 0.25, 0.25),
    ring(0.48, 0.22, 0.55),
    ring(0.28, 0.18, 0.8),
    tip,
    fly(0.4, 1.1, 0.2),
    fly(-0.3, 1.2, -0.1),
    fly(0.1, 1.3, 0.35),
  );
}

function hayBale(): Object3D {
  return group(
    box(1.8, 0.8, 0.9, 0xe2b84a, 0, 0.4, 0),
    box(1.82, 0.08, 0.92, 0xb98b2d, 0, 0.55, 0),
  );
}

function barrel(): Object3D {
  const body = mesh(
    geometry("barrel", () => new CylinderGeometry(0.4, 0.4, 1.4, 12)),
    0x8a5a2b,
    0,
    0.4,
    0,
  );
  body.rotation.z = Math.PI / 2;
  return group(body);
}

function bunting(): Object3D {
  const flags = [-0.9, -0.45, 0, 0.45, 0.9].map((x, i) => {
    const flag = mesh(
      geometry("flag", () => new ConeGeometry(0.2, 0.45, 3)),
      i % 2 === 0 ? RED : WHITE,
      x,
      1.65,
      0,
    );
    flag.rotation.x = Math.PI; // point down
    return flag;
  });
  return group(box(2.4, 0.08, 0.08, 0x333333, 0, 2.0, 0), ...flags);
}

function laundryLine(): Object3D {
  const cloth = [-0.8, -0.2, 0.5].map((x, i) =>
    box(0.5, 0.7, 0.04, [0x4a90d9, WHITE, 0xe8c547][i] ?? WHITE, x, 1.6, 0),
  );
  return group(box(2.4, 0.04, 0.04, 0x333333, 0, 2.0, 0), ...cloth);
}

function awning(): Object3D {
  const stripes = [-0.9, -0.3, 0.3, 0.9].map((x, i) =>
    box(0.6, 0.1, 1.0, i % 2 === 0 ? RED : WHITE, x, 1.9, 0),
  );
  return group(...stripes, box(2.4, 0.5, 0.05, 0xc0392b, 0, 1.55, 0.5));
}

function foodCart(): Object3D {
  const wheel = (x: number) => {
    const w = mesh(
      geometry("wheel", () => new CylinderGeometry(0.35, 0.35, 0.1, 12)),
      0x222222,
      x,
      0.35,
      0.2,
    );
    w.rotation.z = Math.PI / 2;
    return w;
  };
  return group(
    box(1.8, 0.9, 1.2, 0xf2c14e, 0, 0.8, 0),
    box(1.9, 0.12, 1.3, RED, 0, 2.0, 0),
    box(0.08, 0.7, 0.08, 0x333333, -0.85, 1.65, 0.5),
    box(0.08, 0.7, 0.08, 0x333333, 0.85, 1.65, 0.5),
    wheel(-0.95),
    wheel(0.95),
  );
}

function fountain(): Object3D {
  return group(
    mesh(
      geometry("fountain-base", () => new CylinderGeometry(0.95, 1.0, 0.7, 16)),
      0xb8b8b0,
      0,
      0.35,
      0,
    ),
    mesh(
      geometry("fountain-pillar", () => new CylinderGeometry(0.2, 0.3, 1.6, 10)),
      0xcfcfc8,
      0,
      1.4,
      0,
    ),
    mesh(
      geometry("fountain-top", () => new SphereGeometry(0.35, 10, 8)),
      0x7ec8e3,
      0,
      2.3,
      0,
    ),
  );
}

function crates(): Object3D {
  return group(
    box(0.95, 0.95, 0.95, 0xa9743c, -0.45, 0.48, 0),
    box(0.95, 0.95, 0.95, 0xb98347, 0.5, 0.48, 0.1),
    box(0.95, 0.95, 0.95, 0x9a6a36, 0, 1.43, 0),
    box(0.8, 0.8, 0.8, 0xb98347, 0.05, 2.28, 0),
  );
}

const OBSTACLES: Record<ObstacleCategory, Array<() => Object3D>> = {
  low: [pooPile, hayBale, barrel],
  high: [bunting, laundryLine, awning],
  block: [foodCart, fountain, crates],
};

// ---- Characters -----------------------------------------------------------------------------

function runner(): Object3D {
  return group(
    box(0.5, 0.2, 0.3, 0x333333, 0, 0.1, 0), // shoes
    box(0.5, 0.6, 0.3, WHITE, 0, 0.5, 0), // trousers
    box(0.6, 0.65, 0.35, WHITE, 0, 1.12, 0), // shirt
    box(0.62, 0.1, 0.37, RED, 0, 1.46, 0), // neckerchief
    mesh(
      geometry("head", () => new SphereGeometry(0.2, 12, 10)),
      0xe0ac84,
      0,
      1.62,
      0,
    ),
  );
}

function bull(): Object3D {
  const horn = (x: number) => {
    const h = mesh(
      geometry("horn", () => new ConeGeometry(0.08, 0.4, 6)),
      0xf1ead2,
      x,
      1.55,
      -1.05,
    );
    h.rotation.z = x > 0 ? -0.9 : 0.9;
    return h;
  };
  const leg = (x: number, z: number) => box(0.22, 0.8, 0.22, 0x2a1c14, x, 0.4, z);
  const g = group(
    box(1.1, 1.0, 2.0, 0x3b2a20, 0, 1.2, 0), // body
    box(0.8, 0.8, 0.8, 0x45322a, 0, 1.4, -1.2), // head
    box(0.4, 0.3, 0.3, 0xd9a5a0, 0, 1.2, -1.65), // snout
    horn(0.45),
    horn(-0.45),
    leg(-0.35, -0.7),
    leg(0.35, -0.7),
    leg(-0.35, 0.7),
    leg(0.35, 0.7),
    box(0.12, 0.12, 0.8, 0x2a1c14, 0, 1.5, 1.35), // tail
    box(0.7, 0.35, 0.8, 0x5a4033, 0, 1.85, -0.5), // hump
  );
  g.scale.setScalar(1.3);
  return g;
}

// ---- Street ---------------------------------------------------------------------------------

const WALL_COLORS = [0xf3ead7, 0xf0d9b5, 0xe8c9a0, 0xf5f0e6];
const ROOF_COLORS = [0xb5502f, 0xc4623a, 0xa8452a, 0xb85c38];

function building(variant: number): Object3D {
  const height = 6 + (variant % 3) * 1.5;
  const wall = WALL_COLORS[variant % WALL_COLORS.length] ?? WHITE;
  const roof = ROOF_COLORS[variant % ROOF_COLORS.length] ?? RED;
  const w = BUILDING_SEGMENT_M - 0.3;
  const windowRow = (y: number) => [-3, 0, 3].map((z) => box(0.1, 0.9, 0.7, 0x4a6fa5, 2.0, y, z)); // on the street-facing side
  return group(
    box(4, height, w, wall, 0, height / 2, 0),
    box(4.4, 0.4, w + 0.3, roof, 0, height + 0.2, 0),
    ...windowRow(2.2),
    ...windowRow(4.4),
    box(0.15, 0.5, w * 0.8, RED, 2.05, 3.4, 0), // festive banner strip
  );
}

export const bullRunTheme: Theme = {
  text: {
    title: "BULL RUSH",
    tagline: "Run. Jump. Roll. Don't get gored.",
    howToIntro:
      "Run from the bull! Pick your jog speed with the JOG buttons: faster means more distance from the bull, but the bull keeps getting faster.",
    caught: "The bull got you!",
    chaserName: "Bull",
    icons: { runner: "🏃", chaser: "🐂" },
  },
  palette: { sky: 0x87ceeb, ground: 0xd9b382, laneLine: 0xfaf3e0 },
  createRunner: runner,
  createBull: bull,
  createObstacle(category, variant) {
    const makers = OBSTACLES[category];
    const make = makers[variant % makers.length];
    if (!make) throw new Error(`No obstacle for ${category}/${variant}`);
    return make();
  },
  buildingVariants: 4,
  createBuilding: building,
};
