import { CONFIG } from "./config";

const C = CONFIG.chase;

/**
 * Player speed against the bull's speed, and the gap between them.
 *
 * While you jog, the bull settles at a resting gap (further back the harder you jog). Stop jogging
 * and it charges at its top speed. A hit brings it close and opens a danger window; a second hit
 * inside the window means you're caught (as in Subway Surfers and Temple Run).
 */
export class Chase {
  gapM: number = C.gapStartM;
  playerSpeedMps: number = C.jogMinSpeedMps;
  bullSpeedMps: number = C.bullStartSpeedMps;
  elapsedS = 0;
  topBullSpeedMps: number = C.bullStartSpeedMps;
  /** Time left in the danger window after a hit. Another hit while it runs means caught. */
  dangerS = 0;
  private struckOut = false;

  get caught(): boolean {
    return this.struckOut || this.gapM <= 0;
  }

  /** How fast the bull can run right now: rises over the run, capped below the fastest jog. */
  get bullTopSpeedMps(): number {
    return Math.min(C.bullMaxSpeedMps, C.bullStartSpeedMps + C.bullAccelMps2 * this.elapsedS);
  }

  update(dt: number, jogging: boolean, jogIntensity: number, stumbling: boolean): void {
    this.elapsedS += dt;
    this.dangerS = Math.max(0, this.dangerS - dt);

    const intensity = Math.min(1, Math.max(0, jogIntensity));
    let target = jogging
      ? C.jogMinSpeedMps + (C.jogMaxSpeedMps - C.jogMinSpeedMps) * intensity
      : C.walkSpeedMps;
    if (stumbling) target *= C.stumbleSpeedFactor;
    this.playerSpeedMps += (target - this.playerSpeedMps) * (1 - Math.exp(-dt / C.speedEaseTauS));

    const top = this.bullTopSpeedMps;
    if (!jogging) {
      this.bullSpeedMps = top;
    } else {
      // In the danger window the bull keeps pace with you, even above its top speed.
      const danger = this.dangerS > 0;
      const wantedGapM = danger ? C.dangerGapM : C.gapRestM + (C.gapMaxM - C.gapRestM) * intensity;
      const wanted = this.playerSpeedMps + (this.gapM - wantedGapM) * C.bullCatchUpPerS;
      const slowest = Math.max(0, this.playerSpeedMps - C.bullDropBackMps);
      this.bullSpeedMps = Math.max(slowest, danger ? wanted : Math.min(top, wanted));
    }
    this.topBullSpeedMps = Math.max(this.topBullSpeedMps, this.bullSpeedMps);

    this.gapM += (this.playerSpeedMps - this.bullSpeedMps) * dt;
    this.gapM = Math.min(C.gapMaxM, Math.max(0, this.gapM));
  }

  /** A hit: the bull closes right in. A second hit inside the danger window means caught. */
  strike(): void {
    if (this.dangerS > 0) this.struckOut = true;
    this.gapM = Math.min(this.gapM, C.dangerGapM);
    this.dangerS = C.dangerWindowS;
  }
}
