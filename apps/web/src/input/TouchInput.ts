import type { GestureSource, TimedIntent } from "./CombinedInput";

const SWIPE_MIN_PX = 32; // how far a finger must move to count as a swipe

/**
 * Swipe controls for phones: left/right = change lane, up = jump, down = roll.
 * A swipe acts as soon as it's long enough, without waiting for the finger to lift.
 */
export class TouchInput implements GestureSource {
  private queue: TimedIntent[] = [];
  private start: { id: number; x: number; y: number } | null = null;
  private fired = false;

  constructor(target: HTMLElement) {
    target.addEventListener("pointerdown", (e) => {
      this.start = { id: e.pointerId, x: e.clientX, y: e.clientY };
      this.fired = false;
    });
    target.addEventListener("pointermove", (e) => {
      if (!this.start || this.fired || e.pointerId !== this.start.id) return;
      const dx = e.clientX - this.start.x;
      const dy = e.clientY - this.start.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_PX) return;
      this.fired = true;
      const t = e.timeStamp;
      if (Math.abs(dx) > Math.abs(dy)) this.queue.push({ intent: dx < 0 ? "left" : "right", t });
      else this.queue.push({ intent: dy < 0 ? "jump" : "roll", t });
    });
    const end = (e: PointerEvent) => {
      if (this.start && e.pointerId === this.start.id) this.start = null;
    };
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  }

  drain(): TimedIntent[] {
    const intents = this.queue;
    this.queue = [];
    return intents;
  }
}
