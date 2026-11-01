import type { InputEvent, InputPoll, InputSource, Lane } from "@bull-rush/shared";
import type { JogControl } from "./JogControl";

/** What a gesture source reports: relative lane moves, jump and roll. */
export type Intent = "left" | "right" | "jump" | "roll";

/** An intent and when it happened (the DOM event's timeStamp, on the performance.now() clock). */
export interface TimedIntent {
  intent: Intent;
  t: number;
}

export interface GestureSource {
  drain(): TimedIntent[];
}

/**
 * Merges the keyboard and touch gestures into the game's InputSource. It is the one place that
 * turns "left"/"right" into absolute lane targets, so the keyboard and touch can never disagree
 * about which lane the player is in.
 */
export class CombinedInput implements InputSource {
  private lane: Lane = 0;

  constructor(
    private readonly sources: readonly GestureSource[],
    private readonly jog: JogControl,
  ) {}

  poll(): InputPoll {
    // In time order across sources, so the lane tracking follows what the player actually did.
    const intents = this.sources.flatMap((s) => s.drain()).sort((a, b) => a.t - b.t);
    const events: InputEvent[] = [];
    for (const { intent, t } of intents) {
      if (intent === "left" || intent === "right") {
        const target = Math.max(-1, Math.min(1, this.lane + (intent === "left" ? -1 : 1))) as Lane;
        this.lane = target;
        events.push({ type: "lane", target, t });
      } else {
        events.push({ type: intent, t });
      }
    }
    return { events, jogging: this.jog.jogging, jogIntensity: this.jog.intensity, present: true };
  }

  reset(): void {
    this.lane = 0;
    for (const source of this.sources) source.drain(); // drop anything queued before the run
  }
}
