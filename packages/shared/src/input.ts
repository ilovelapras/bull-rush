/** A lane relative to the track center: -1 = left, 0 = center, 1 = right (player space). */
export type Lane = -1 | 0 | 1;

/**
 * One thing the player did. Lane events are absolute so a missed event can't desync the game.
 * `t` is when it happened, in ms on the same clock as `poll(nowMs)` (performance.now() in the
 * browser). The game applies each event at the simulation step that `t` falls in.
 */
export type InputEvent =
  | { type: "lane"; target: Lane; t: number }
  | { type: "jump"; t: number }
  | { type: "roll"; t: number };

export interface InputPoll {
  events: InputEvent[];
  /** Whether the player is jogging at all. Not jogging means the character only walks. */
  jogging: boolean;
  /** 0..1, how fast they jog (only meaningful while `jogging`). 1 = the fastest the game rewards. */
  jogIntensity: number;
  /** False when no person is detected (camera input) or the input source is paused. */
  present: boolean;
}

/** Implemented by both the camera input and the keyboard input. */
export interface InputSource {
  poll(nowMs: number): InputPoll;
  /** Called when a run starts, so sources that track state (like the current lane) start fresh. */
  reset?(): void;
}

/** One pose landmark in normalized image coordinates (0..1, y points down), as MediaPipe gives them. */
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

/** All landmarks detected in one video frame. */
export interface PoseFrame {
  /** Timestamp in ms. */
  t: number;
  /** Video size in pixels, needed to convert normalized x/y to a common scale. */
  videoWidth: number;
  videoHeight: number;
  /** 33 landmarks in MediaPipe order, or empty when nobody was detected. */
  landmarks: Landmark[];
}
