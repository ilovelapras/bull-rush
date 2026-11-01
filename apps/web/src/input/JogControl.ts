export const JOG_LEVEL_MAX = 5;
export const JOG_LEVEL_DEFAULT = 3;

/**
 * Manual stand-in for the camera's jog detection: level 0 = not jogging, 1..5 = slow to fast.
 * Set by the on-screen buttons and the number keys; replaced by the jog detector in milestone 4.
 */
export class JogControl {
  private current = JOG_LEVEL_DEFAULT;
  private readonly listeners = new Set<(level: number) => void>();

  get level(): number {
    return this.current;
  }

  get jogging(): boolean {
    return this.current > 0;
  }

  /** 0..1 over levels 1..5. */
  get intensity(): number {
    return this.current > 0 ? (this.current - 1) / (JOG_LEVEL_MAX - 1) : 0;
  }

  set(level: number): void {
    const clamped = Math.min(JOG_LEVEL_MAX, Math.max(0, Math.round(level)));
    if (clamped === this.current) return;
    this.current = clamped;
    for (const listener of this.listeners) listener(clamped);
  }

  onChange(listener: (level: number) => void): void {
    this.listeners.add(listener);
  }
}
