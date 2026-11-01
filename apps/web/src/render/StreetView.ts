import { BoxGeometry, Group, Mesh, MeshLambertMaterial, PlaneGeometry } from "three";
import { CONFIG } from "@bull-rush/game-core";
import { BUILDING_SEGMENT_M, STREET_HALF_WIDTH_M, type Theme } from "./Theme";

const DASH_SPACING_M = 4;
const DASH_LENGTH_M = 2;
const DASH_FIRST = -3; // slots behind the player so the road is covered up to the camera
const DASH_COUNT = 24;
const BUILDING_FIRST = -2;
const BUILDING_COUNT = 9; // covers about 80 m, beyond the fog

function hash(n: number, salt: number): number {
  let h = Math.imul(n | 0, 0x45d9f3b) ^ Math.imul(salt, 0x27d4eb2d);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  return (h ^ (h >>> 12)) >>> 0;
}

interface BuildingSlot {
  variants: Group[];
  shown: number;
  segment: number;
}

/** The scrolling street: ground, lane dashes and building rows that recycle as you run. */
export class StreetView {
  readonly object = new Group();
  private readonly dashes: Mesh[] = [];
  private readonly slots: Array<{ left: BuildingSlot; right: BuildingSlot }> = [];

  constructor(private readonly theme: Theme) {
    const ground = new Mesh(
      new PlaneGeometry(STREET_HALF_WIDTH_M * 2, 220),
      new MeshLambertMaterial({ color: theme.palette.ground }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -90;
    this.object.add(ground);

    const dashGeometry = new BoxGeometry(0.12, 0.02, DASH_LENGTH_M);
    const dashMaterial = new MeshLambertMaterial({ color: theme.palette.laneLine });
    for (const x of [-1.5, -0.5, 0.5, 1.5].map((n) => n * CONFIG.lanes.widthM)) {
      for (let i = 0; i < DASH_COUNT; i++) {
        const dash = new Mesh(dashGeometry, dashMaterial);
        dash.position.set(x, 0.01, 0);
        this.dashes.push(dash);
        this.object.add(dash);
      }
    }

    for (let i = 0; i < BUILDING_COUNT; i++) {
      this.slots.push({ left: this.makeSlot(-1), right: this.makeSlot(1) });
    }
  }

  update(distanceM: number): void {
    const dashOffset = distanceM % DASH_SPACING_M;
    this.dashes.forEach((dash, n) => {
      const i = DASH_FIRST + (n % DASH_COUNT);
      dash.position.z = -(i * DASH_SPACING_M) + dashOffset;
    });

    const segmentOffset = distanceM % BUILDING_SEGMENT_M;
    const baseSegment = Math.floor(distanceM / BUILDING_SEGMENT_M);
    this.slots.forEach((pair, n) => {
      const i = BUILDING_FIRST + n;
      const z = -(i * BUILDING_SEGMENT_M) + segmentOffset;
      this.place(pair.left, baseSegment + i, 1, z);
      this.place(pair.right, baseSegment + i, 2, z);
    });
  }

  private makeSlot(side: -1 | 1): BuildingSlot {
    const variants: Group[] = [];
    for (let v = 0; v < this.theme.buildingVariants; v++) {
      const wrapper = new Group();
      wrapper.add(this.theme.createBuilding(v));
      wrapper.position.x = side * (STREET_HALF_WIDTH_M + 2);
      wrapper.scale.x = -side; // windows face the street on both sides
      wrapper.visible = false;
      variants.push(wrapper);
      this.object.add(wrapper);
    }
    return { variants, shown: -1, segment: Number.NaN };
  }

  private place(slot: BuildingSlot, segment: number, salt: number, z: number): void {
    if (slot.segment !== segment) {
      slot.segment = segment;
      const next = hash(segment, salt) % this.theme.buildingVariants;
      const previous = slot.variants[slot.shown];
      if (previous) previous.visible = false;
      slot.shown = next;
      const shown = slot.variants[next];
      if (shown) shown.visible = true;
    }
    const shown = slot.variants[slot.shown];
    if (shown) shown.position.z = z;
  }
}
