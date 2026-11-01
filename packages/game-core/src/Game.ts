import type { InputEvent } from "@bull-rush/shared";
import { Chase } from "./Chase";
import { checkCollision } from "./Collision";
import { CONFIG } from "./config";
import type { Obstacle } from "./ObstacleTypes";
import { Player, type GameEvent } from "./Player";
import type { Score } from "./Score";
import { Track } from "./Track";

export interface GameInput {
  events: readonly InputEvent[];
  jogging: boolean;
  jogIntensity: number;
}

/** What drawing code (renderer, HUD) may read. Read-only, so it can't change the game (R2). */
export interface GameView {
  readonly player: Readonly<
    Pick<Player, "lane" | "x" | "y" | "action" | "rollProgress" | "stumbling">
  >;
  readonly chase: Readonly<Pick<Chase, "gapM" | "playerSpeedMps" | "bullSpeedMps">>;
  readonly track: { readonly obstacles: readonly Readonly<Obstacle>[] };
  readonly distanceM: number;
  readonly elapsedS: number;
}

const COLLISION_WINDOW_M = 3; // only obstacles this close to the player are tested
const STEP_MS = CONFIG.step.fixedDtS * 1000;
const MAX_FRAME_MS = CONFIG.step.maxFrameDtS * 1000;
const STEP_EPSILON_MS = 1e-6; // so float error in frame timestamps can't drop a step

/**
 * The whole simulation. Advance it with update(); read its fields to draw it.
 *
 * Time comes from timestamps, not frame lengths: each input event is applied at the start of the
 * fixed step its `t` falls in. The same events and jog input give the same run at any frame rate,
 * which recording/replay (and replaying a run to check a score) rely on.
 */
export class Game {
  readonly player: Player;
  readonly chase = new Chase();
  readonly track: Track;

  distanceM = 0;
  elapsedS = 0;
  over = false;
  stumbles = 0;
  /** When true, obstacles are ignored (used for the menu background). */
  invincible = false;

  private originMs: number;
  private stepsRun = 0;
  private queuedInput: InputEvent[] = [];
  private invulnerableS = 0;
  private pendingEvents: GameEvent[] = [];

  /** `startMs` is the run's start on the clock that update() and the input events use. */
  constructor(seed: number, startMs = 0) {
    this.originMs = startMs;
    this.player = new Player((e) => this.pendingEvents.push(e));
    this.track = new Track(seed);
    this.track.update(0, 0);
  }

  /** Simulated time, in ms on the input clock. Always a whole number of steps after the start. */
  get timeMs(): number {
    return this.originMs + this.stepsRun * STEP_MS;
  }

  /**
   * Simulate up to `nowMs`. Events stamped later than the steps that run now wait for a later
   * update; events stamped earlier than the current step are applied at the next step.
   */
  update(nowMs: number, input: GameInput): void {
    if (this.over) return;
    if (input.events.length > 0) {
      this.queuedInput.push(...input.events);
      this.queuedInput.sort((a, b) => a.t - b.t); // stable: same-time events keep their order
    }

    // A long stall (tab switch, debugger) is skipped, not simulated in one burst.
    const behindMs = nowMs - this.timeMs;
    if (behindMs > MAX_FRAME_MS) this.originMs += behindMs - MAX_FRAME_MS;

    while (!this.over && this.timeMs + STEP_MS <= nowMs + STEP_EPSILON_MS) {
      const stepEndMs = this.timeMs + STEP_MS;
      let next = this.queuedInput[0];
      while (next && next.t < stepEndMs) {
        this.queuedInput.shift();
        this.apply(next);
        next = this.queuedInput[0];
      }
      this.step(CONFIG.step.fixedDtS, input);
      this.stepsRun++;
    }
  }

  /** Things that happened since the last call (for sound, effects and the HUD). */
  drainEvents(): GameEvent[] {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    return events;
  }

  score(): Score {
    return {
      distanceM: this.distanceM,
      timeS: this.elapsedS,
      topBullSpeedMps: this.chase.topBullSpeedMps,
      stumbles: this.stumbles,
    };
  }

  private apply(event: InputEvent): void {
    if (event.type === "lane") this.player.setLane(event.target);
    else if (event.type === "jump") this.player.jump();
    else this.player.roll();
  }

  private step(dt: number, input: GameInput): void {
    this.player.update(dt);
    this.chase.update(dt, input.jogging, input.jogIntensity, this.player.stumbling);
    this.distanceM += this.chase.playerSpeedMps * dt;
    this.elapsedS += dt;
    this.invulnerableS = Math.max(0, this.invulnerableS - dt);
    this.track.update(this.distanceM, this.elapsedS);

    if (!this.invincible) this.checkHits();

    if (this.chase.caught) {
      this.over = true;
      this.pendingEvents.push({ type: "caught" });
    }
  }

  private checkHits(): void {
    if (this.invulnerableS > 0) return;
    for (const obstacle of this.track.obstacles) {
      if (obstacle.hit || Math.abs(obstacle.d - this.distanceM) > COLLISION_WINDOW_M) continue;
      const hit = checkCollision(this.player, this.distanceM, obstacle);
      if (hit === "none") continue;

      obstacle.hit = true;
      this.chase.strike();
      this.player.stumble();
      this.invulnerableS = CONFIG.chase.hitInvulnerableS;
      this.stumbles++;
      this.pendingEvents.push({ type: "stumble", severity: hit });
      return;
    }
  }
}
