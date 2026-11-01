import type { GestureSource, Intent, TimedIntent } from "./CombinedInput";
import { type JogControl } from "./JogControl";

const MEDIUM_JOG_LEVEL = 3;

const KEY_INTENTS: Record<string, Intent> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "jump",
  KeyW: "jump",
  Space: "jump",
  ArrowDown: "roll",
  KeyS: "roll",
  ShiftLeft: "roll",
  ShiftRight: "roll",
};

/** Keyboard controls, for testing on a computer. Also sets the jog level with 0-5 and J. */
export class KeyboardInput implements GestureSource {
  private queue: TimedIntent[] = [];

  constructor(jog: JogControl) {
    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      const intent = KEY_INTENTS[e.code];
      if (intent) {
        this.queue.push({ intent, t: e.timeStamp });
        e.preventDefault();
      } else if (/^Digit[0-5]$/.test(e.code)) {
        jog.set(Number(e.code.slice(5)));
      } else if (e.code === "KeyJ") {
        jog.set(MEDIUM_JOG_LEVEL);
      }
    });
  }

  drain(): TimedIntent[] {
    const intents = this.queue;
    this.queue = [];
    return intents;
  }
}
