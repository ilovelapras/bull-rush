import type { Lane } from "@bull-rush/shared";
import { CONFIG } from "./config";

export type PlayerAction = "run" | "jump" | "dive" | "roll";

export type GameEvent =
  | { type: "laneChange"; lane: Lane }
  | { type: "jump" }
  | { type: "roll" }
  | { type: "stumble"; severity: "head-on" | "scrape" }
  | { type: "caught" };

const P = CONFIG.player;
const JUMP_SPEED_MPS = (4 * P.jumpPeakM) / P.jumpAirtimeS;
const GRAVITY_MPS2 = (8 * P.jumpPeakM) / (P.jumpAirtimeS * P.jumpAirtimeS);

function ease(t: number): number {
  return t * t * (3 - 2 * t); // smoothstep
}

/** Lane, jump and roll state. Knows nothing about obstacles; Game checks collisions. */
export class Player {
  lane: Lane = 0;
  /** Sideways position in metres (smoothly follows the lane). */
  x = 0;
  /** Height of the feet above the ground, in metres. */
  y = 0;
  action: PlayerAction = "run";
  /** 0..1 progress through the current roll. */
  rollProgress = 0;
  stumbleTimerS = 0;

  private vy = 0;
  private laneStartX = 0;
  private laneElapsedS = Infinity;
  private rollTimerS = 0;
  private bufferedJumpS = 0;

  constructor(private readonly emit: (event: GameEvent) => void) {}

  get stumbling(): boolean {
    return this.stumbleTimerS > 0;
  }

  get heightM(): number {
    return this.action === "roll" ? P.rollingHeightM : P.standingHeightM;
  }

  setLane(target: Lane): void {
    if (target === this.lane) return;
    this.lane = target;
    this.laneStartX = this.x;
    this.laneElapsedS = 0;
    this.emit({ type: "laneChange", lane: target });
  }

  jump(): void {
    if (this.action === "run" || this.action === "roll") {
      this.startJump();
    } else {
      this.bufferedJumpS = P.inputBufferS; // in the air already: do it on landing
    }
  }

  roll(): void {
    if (this.action === "run") {
      this.startRoll();
    } else if (this.action === "jump") {
      this.action = "dive"; // drop fast, then roll on landing
      this.vy = Math.min(this.vy, -P.diveSpeedMps);
    }
  }

  stumble(): void {
    this.stumbleTimerS = CONFIG.chase.stumbleDurationS;
  }

  update(dt: number): void {
    this.stumbleTimerS = Math.max(0, this.stumbleTimerS - dt);
    this.bufferedJumpS = Math.max(0, this.bufferedJumpS - dt);

    this.laneElapsedS += dt;
    const targetX = this.lane * CONFIG.lanes.widthM;
    const t = Math.min(1, this.laneElapsedS / CONFIG.lanes.changeDurationS);
    this.x = this.laneStartX + (targetX - this.laneStartX) * ease(t);

    if (this.action === "jump" || this.action === "dive") {
      this.vy -= GRAVITY_MPS2 * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) this.land();
    } else if (this.action === "roll") {
      this.rollTimerS -= dt;
      this.rollProgress = 1 - Math.max(0, this.rollTimerS) / P.rollDurationS;
      if (this.rollTimerS <= 0) this.action = "run";
    }
  }

  private land(): void {
    const dived = this.action === "dive";
    this.y = 0;
    this.vy = 0;
    this.action = "run";
    if (this.bufferedJumpS > 0) {
      this.bufferedJumpS = 0;
      this.startJump();
    } else if (dived) {
      this.startRoll();
    }
  }

  private startJump(): void {
    this.action = "jump";
    this.vy = JUMP_SPEED_MPS;
    this.rollProgress = 0;
    this.emit({ type: "jump" });
  }

  private startRoll(): void {
    this.action = "roll";
    this.rollTimerS = P.rollDurationS;
    this.rollProgress = 0;
    this.emit({ type: "roll" });
  }
}
