# Motion detection spec

How Bull Rush turns the camera feed into game input. This is the source of truth for everything in
`packages/motion` and `apps/web/src/input/` (camera, pose tracking, calibration, detectors), and for
the Motion Lab tuning page. CLAUDE.md §6 summarises it. **Read this whole file before working on
motion code.**

All numbers here are **starting values**. They live in `packages/motion/src/config.ts` (rule R1)
and are expected to change once real recordings exist (§11).

---

## 1. What we need to see

| Player does                      | Game does                         | Main signal                                 |
| -------------------------------- | --------------------------------- | ------------------------------------------- |
| Jogs on the spot                 | Runs; speed follows cadence       | Left/right foot lift alternating            |
| Stops jogging                    | Slows to a walk; the bull charges | No alternation for 0.8 s                    |
| Stands left / center / right     | Moves to that lane                | Horizontal position of hips + feet          |
| Jumps                            | Jumps                             | Hips rise fast, both feet leave the floor   |
| Squats                           | Rolls                             | Hips drop, knees bend                       |
| Jumps sideways                   | Changes lane, **then** jumps      | Jump take-off with strong sideways velocity |
| Hops/steps sideways into a squat | Changes lane, **then** rolls      | Zone crossing, then squat                   |
| Jumps and lands in a squat       | Jumps, then rolls on landing      | Jump, then deep squat right after landing   |
| Walks out of frame               | Game pauses                       | Key landmarks not visible                   |

Everything is measured relative to the player's own body and their standing baseline, so the
same thresholds work for a child at 2 m and an adult at 3 m.

## 2. Pipeline

```
 camera (front, ~30 fps)
   │  getUserMedia                                   apps/web/src/input/Camera.ts
   ▼
 PoseTracker  ── MediaPipe PoseLandmarker (lite)     apps/web/src/input/PoseTracker.ts
   │  PoseFrame { t (capture time), 33 landmarks }
   ▼  ─────────────── browser above, pure TypeScript below (packages/motion) ───────────────
 BodySignals  ── mirror, pixel space, filter, normalise by body scale
   │  Signals { hipX, hipRise, hipVy, footLiftL/R, kneeAngleL/R, visible, … }
   ▼
 Calibration (baseline + scale) ──► Detectors (state machines)
                                     Presence · Jog · LaneZone · Jump · Squat
   ▼
 GestureFusion  ── ordering, combos, guards
   │  InputEvent[] + jogging + jogIntensity + present
   ▼
 PoseInput (InputSource) ──► game-core                apps/web/src/input/PoseInput.ts
```

- `packages/motion/src/MotionPipeline.ts` wires BodySignals → Calibration → Detectors →
  GestureFusion behind one call: `process(frame: PoseFrame): MotionOutput`. The browser side only
  feeds it frames; tests feed it recorded or synthetic frames. **The same code path runs live and
  in tests.**
- The touch and keyboard inputs stay as a fallback (CLAUDE.md rule R7). The game cannot tell
  which source it is using.

## 3. Camera and framing

### 3.1 Setup the player is told to use

- Phone or tablet in **portrait**, propped up at roughly **hip height** (about 1 m), level rather
  than tilted. Hip height keeps the hips near the middle of the image, so stepping closer or
  further barely changes hip height in the image.
- Stand **2–3 m** away. Whole body visible, with clear space above the head for jumping and room
  to step about half a metre to each side.
- Good, even lighting from the front. In dim light phone cameras drop their frame rate (often to
  around 15 fps) and blur fast moves. Both hurt jump and squat detection badly.
- Plain clothes that show the knees help but aren't required. One person in frame.

### 3.2 Camera request

- `facingMode: "user"`, ideal 640×480 (landscape sensor; in portrait the browser may report
  480×640, so always read `video.videoWidth/Height`), `frameRate: { ideal: 30 }`.
- Higher resolution doesn't help: the pose model works on a small input image. Lower resolution
  is a performance lever (§10).
- If the camera reports under 20 fps for 2 s, show "More light please". Low light is the most
  common cause.

### 3.3 Is there room? (framing check, part of calibration)

At calibration we know the player's body scale in pixels, so we can check that the planned moves
stay in frame:

- **Top:** estimated head top (nose y minus 0.35 × torso length) is at least 12% below the top
  edge, leaving room for a jump.
- **Bottom:** both ankles are at least 6% above the bottom edge.
- **Sides:** the player's center ± (lane enter distance + half a shoulder width + margin) stays
  inside the frame.
- If a check fails, the calibration screen says exactly what to do ("Step back", "Move left",
  "Tilt the phone down"). It doesn't start until all checks pass for 1 s.

## 4. Pose model

**Choice: MediaPipe PoseLandmarker, `lite` model**, `runningMode: "VIDEO"`, GPU delegate with CPU
fallback, `numPoses: 1`, output segmentation off.

Why:

- It runs in the browser on Android and iOS with one codebase, and works on-device.
- It gives 33 landmarks, including **heels (29/30) and foot tips (31/32)**, which help tell
  when feet leave the floor. MoveNet (17 points) has no feet.
- It gives a per-landmark `visibility`, which we use for presence and occlusion checks.

Alternatives, if the lite model is too slow or too jittery on the target phone: `full` model
(more accurate, slower), or TF.js MoveNet Lightning (fast, robust to fast motion, no feet).
Measure before switching (§10). Keep the model behind `PoseTracker` so switching only touches that
file.

Self-host the model file and WASM files in `apps/web/public/mediapipe/` (no CDN at runtime).

Landmarks used: shoulders 11/12, hips 23/24, knees 25/26, ankles 27/28, heels 29/30,
foot tips 31/32, nose 0 (framing only). Arms are ignored, so waving arms can't trigger anything.

## 5. Timing and latency

The game must react to a move **within about 150 ms of the body starting it**. Rough budget, to
be measured in Motion Lab:

| Stage                                 | Estimate   |
| ------------------------------------- | ---------- |
| Camera exposure + delivery (30 fps)   | ~35–50 ms  |
| Pose inference (lite, GPU, phone)     | ~15–40 ms  |
| Filtering lag (One Euro, tuned)       | ~10–20 ms  |
| Detection (needs 1–3 frames of onset) | ~33–100 ms |
| Render                                | ~16 ms     |

That is tight, so:

- **Detect onsets, not peaks.** Jumps fire on take-off velocity, lanes commit on sideways
  velocity, squats fire on the way down.
- **Use the camera's timestamps.** Take `t` from `requestVideoFrameCallback` metadata
  (`captureTime` if present, else `mediaTime`), never from when inference finishes. Velocities use
  the real time between frames, so dropped frames don't distort them.
- **Never queue frames.** If inference is still running when a new frame arrives, skip the new
  frame (CLAUDE.md rule R6).
- **The game forgives late input.** It uses forgiving hitboxes, a 150 ms input buffer, at least
  2 s of obstacle visibility and at least 1 s between required moves (CLAUDE.md §7).
- Motion Lab shows live inference ms, camera fps and an estimated end-to-end latency.

## 6. Signal conditioning (`BodySignals`)

### 6.1 Coordinate rules

- Convert normalized landmarks to **pixels** (`x * videoWidth`, `y * videoHeight`) before
  measuring anything; x and y are normalized on different scales.
- **Mirror once, here.** Player space: positive x is the player's right. A setting can flip it,
  and a unit test covers it.
- **Flip y once, here.** Signals use "up is positive" (`hipRise` > 0 means higher than standing).
- **Normalise every distance by body scale `T`** (torso length: shoulder midpoint to hip
  midpoint, in pixels). Unlike shoulder width, torso length doesn't shrink when the player turns
  slightly. `T` comes from calibration and only adapts while standing or jogging (§7.3). It is
  **frozen** during jumps, squats and lane moves, because a squat foreshortens the torso.
- Velocities are in T per second.

### 6.2 Filtering

- Use a **One Euro filter** per landmark coordinate. It removes jitter when still and adds
  little lag when moving fast. Start around `minCutoff` 1 Hz, then tune `beta` in Motion Lab
  until a jump's take-off isn't delayed by more than about one frame compared with the raw
  signal.
- Velocities are finite differences of the filtered positions over the real frame interval,
  lightly smoothed (EMA ~50 ms).
- **Visibility gating:** a landmark with visibility < 0.5 keeps its last good filtered value for
  up to 150 ms. After that the signals that need it are marked invalid, and detectors depending on
  them do nothing.
- **Glitch rejection:** if the hip midpoint jumps by more than 1 T in a single frame, treat the
  frame as a tracking glitch (or the model switching to another person). Drop it, and after
  3 such frames in a row reset filters and wait for stable tracking.

### 6.3 Signals produced each frame

| Signal           | Meaning                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `posX`           | Horizontal position for lanes: average of hip midpoint and ankle midpoint, minus calibrated center, in T. Using the feet means leaning sideways isn't enough; you have to step. |
| `hipRise`        | Hip midpoint height above standing baseline, in T                                                                                                                               |
| `hipVy`, `hipVx` | Hip velocity, T/s (up and player-right positive)                                                                                                                                |
| `footLiftL/R`    | Each foot's lift: max(knee rise, ankle rise) above that leg's baseline, in T                                                                                                    |
| `feetUp`         | min(ankleRiseL, ankleRiseR): both feet off the floor, in T                                                                                                                      |
| `kneeAngleL/R`   | Hip–knee–ankle angle, degrees (180 = straight)                                                                                                                                  |
| `visible`        | All key landmarks valid (presence)                                                                                                                                              |
| `scaleT`         | Current body scale, pixels                                                                                                                                                      |

## 7. Calibration

### 7.1 Flow (CalibrationState)

1. **Framing:** live skeleton over the camera preview with a silhouette guide, plus the §3.3 checks
   and plain-language hints. Continue when all checks pass for 1 s.
2. **Stand still for 2 s:** a ring fills while the hips move less than 0.03 T (standard
   deviation). If they move, the ring resets. Take medians over the window for hip midpoint
   (x, y), each ankle's y, each knee's y relative to hips, and `T`.
3. **Practice moves (optional, recommended):** "Jump!", "Squat!", "Step left", "Step right",
   prompted one at a time. Measure this player's jump height, squat depth and step size. Then set
   personal thresholds inside safe bounds:
   - jump rise threshold = clamp(0.4 × measured jump rise, 0.12, 0.25) T
   - squat depth threshold = clamp(0.6 × measured squat depth, 0.22, 0.40) T
   - lane enter distance = clamp(0.6 × measured step, 0.45, 0.9) T
     Without this step, use the defaults in §8.
4. **"Jog to start"** (ReadyState): the run starts after 1 s of detected jogging.

Practice moves matter because people differ a lot. A child's squat, an adult's shallow
"knee-friendly" squat and a fit player's deep squat can differ by 2× in depth.

### 7.2 Stored per session

The calibration and personal thresholds are kept in memory. Optionally save them to
`localStorage` (try/catch), so a returning player can skip step 3. Framing is always rechecked,
because the phone or player may have moved.

### 7.3 Adapting during play

Update the hip and ankle baselines and `T` with a slow EMA (time constant ~3 s), **only** while
Presence = present and the other detectors are idle (standing or jogging). Never re-center `posX`
during play: a player who stays in the left lane must stay in the left lane.

## 8. Detectors

Each detector is a small state machine with its own unit tests. Default thresholds below (T =
torso length).

### 8.1 Presence

- PRESENT when `visible` holds for 70% of the last 0.5 s, LOST otherwise.
- LOST for more than 1 s auto-pauses the game (CLAUDE.md §4.3). On return, the run resumes after
  a 3 s countdown once the player is jogging again.

### 8.2 Jog → `jogging`, `jogIntensity`

People jog on the spot in different styles: high knees, heel flicks (feet kick back, knees barely
rise) or a low shuffle. So use **foot lift**, which is the larger of knee rise and ankle rise for
each leg.

- `d = footLiftL − footLiftR`. A **step** is a sign change of `d`, with hysteresis (crossing from
  below −0.06 T to above +0.06 T or back).
- A step only counts if the larger foot lift reached at least 0.08 T since the previous step.
  That stops a jiggled heel from counting as jogging.
- Cadence = steps in the last 2 s × 30, in steps per minute.
- `jogging` turns on at cadence ≥ 100 spm, and turns off when no step has been seen for 0.8 s.
- `jogIntensity = clamp((cadence − 100) / (180 − 100), 0, 1)`, smoothed with an EMA of about
  0.5 s.
- Frames inside a jump or squat are ignored: they neither count as steps nor reset the timer.

### 8.3 LaneZone → `lane` events

- The lane follows **where the player stands**, using `posX`:
  - left lane if `posX < −0.6`, right lane if `posX > +0.6`
  - back to center only when `|posX| < 0.35` (hysteresis)
- **Early commit:** if `|hipVx| > 2.0` T/s and the position projected 100 ms ahead crosses a
  boundary, emit the lane change now. This makes sideways moves feel instant.
- Lane events are absolute (−1, 0, 1), so a missed event corrects itself on the next frame.
- Only one lane change per 150 ms, to stop flicker at a boundary.

### 8.4 Jump → `jump`

States: GROUNDED → AIRBORNE → GROUNDED.

- **Take-off** (fires `jump`): `hipVy > 1.2` T/s **and** `hipRise > 0.15` **and** `feetUp > 0.08`
  (both feet up together; jogging lifts one foot at a time).
- **Landing:** `feetUp < 0.04` and `hipVy ≤ 0`. Starts the 300 ms landing window used by the
  squat guard (§8.5).
- No new take-off for 300 ms after landing.
- AIRBORNE for more than 1.2 s is a tracking glitch: reset to GROUNDED without firing anything.
- Jogging bounce is about 0.05–0.1 T and has only one foot up at a time, so it must never fire.
  A fixture test covers this.

### 8.5 Squat → `roll`

States: STANDING → SQUATTING → STANDING.

- **Enter** (fires `roll`): `hipRise < −0.30` and both knee angles below 125°, held for **80 ms**.
- **Re-arm:** the player must stand back up (`hipRise > −0.12`) before another roll.
- The roll lasts a fixed time in the game, however long the player stays down.

**Guards: the two traps that would otherwise wreck the game.**

1. **Jump wind-up dip.** A natural jump starts with a quick dip (knees bend, hips drop) before
   pushing off. If the hips start moving up fast (`hipVy > 1.0`) during the 80 ms hold, it was a
   jump wind-up, so cancel and don't roll. The 80 ms hold exists for this reason.
2. **Landing absorption.** People bend their knees when they land. Within the 300 ms landing
   window, a roll needs a **deeper** squat (`hipRise < −0.40`) held for **150 ms**. A deliberate
   "land in a squat" still works; a normal soft landing doesn't.

## 9. GestureFusion: ordering and combos

GestureFusion takes each frame's detector outputs and emits `InputEvent`s. **It never holds an
event back to wait for another one,** because every delay adds latency. It only orders and
derives events.

- **Same-frame order:** lane events are always emitted before `jump` and `roll` in the same frame.
- **Sideways jump:** at take-off, if `|hipVx| > 1.5` T/s, emit the lane change towards that side
  first (adjacent lane, clamped), then `jump`. LaneZone is told the lane is already committed, so
  it doesn't emit it again when the feet land in the new zone.
- **Hop or step into a squat:** the zone crossing (or early commit) naturally happens before the
  squat's 80 ms hold ends, so the order comes out as lane, then roll. Test that it does.
- **Jump, then land in a squat:** `jump` at take-off, then `roll` from the landing-window squat
  rule. The game turns a roll in the air into a fast drop and a roll (`Player.roll()` → dive).
- Jog state is independent of everything else and is reported every frame.

### 9.1 Known confusions and their guards

| Real movement                          | Could be mistaken for | Guard                                                              |
| -------------------------------------- | --------------------- | ------------------------------------------------------------------ |
| Jogging bounce                         | Jump                  | Rise threshold + both feet up together                             |
| Jump wind-up dip                       | Squat → roll          | 80 ms hold, cancelled by upward velocity                           |
| Soft landing after a jump              | Squat → roll          | Deeper, longer squat needed in the landing window                  |
| Leaning sideways                       | Lane change           | `posX` uses the feet as well as the hips; hysteresis               |
| Knees pushing out in a squat           | Lane change           | Scale frozen while squatting; hysteresis                           |
| Stepping closer to or away from camera | Squat / jump          | Phone at hip height; slow baseline adaptation; velocity thresholds |
| Waving arms                            | Anything              | Arms aren't used                                                   |
| Someone walking behind the player      | Lane change / glitch  | `numPoses: 1`, glitch rejection, Presence LOST → pause             |
| Tracking jitter at the top of a jump   | Double jump / landing | Refractory time; AIRBORNE timeout                                  |

## 10. Performance on phones

Targets: pose tracking at **25 fps or more, sustained for 4 minutes** (phones throttle when warm),
and the game at 30 fps or more at the same time.

- Run inference from `requestVideoFrameCallback` (fallback: rAF polling of `currentTime`). Skip
  frames while busy; never queue.
- Levers, cheapest first: lower camera resolution (480p → 360p); renderer pixel ratio 1.0 while
  tracking; keep the lite model; GPU delegate (CPU fallback only if the GPU path fails).
- Moving inference to a Web Worker is a possible later step. Only do it if measurements show the
  main thread is the bottleneck, and check iOS Safari support first.
- Motion Lab logs fps and inference time over time, so throttling shows up in a 4-minute test.

## 11. Tooling: Motion Lab, recording, tests

### 11.1 Motion Lab (`?lab=1`)

A dev page without the game, for seeing and tuning detection on the real phone:

- Camera preview with the skeleton, the lane zone lines and the calibrated baseline.
- Scrolling plots of `hipRise`, `posX`, `footLiftL/R`, `feetUp` and knee angles, with threshold
  lines drawn on them (`ui/SignalPlot.ts`).
- Detector state labels and an event log ("JUMP 412 ms", "LANE −1"…), plus camera fps and
  inference ms.
- **Sliders for the main thresholds** that apply live, with an "Export config" button that copies
  the values as JSON, so tuning on the phone doesn't need a code change.
- Record / Download buttons (§11.2) and guided drills (§11.3).

### 11.2 Recording format

Landmarks only, **never images or video** (privacy). One JSON file per clip:

```json
{
  "version": 1,
  "device": "free text, e.g. Pixel 8 front camera",
  "videoWidth": 480,
  "videoHeight": 640,
  "mirrored": true,
  "labels": [{ "type": "jump", "promptMs": 5200, "windowMs": [0, 1500] }],
  "frames": [
    { "t": 33.4, "lm": [[0.512, 0.301, -0.2, 0.99], "… 33 entries of x, y, z, visibility"] }
  ]
}
```

Round numbers to 4 decimal places. A minute of 30 fps is about 1–2 MB, which is fine for
fixtures.

### 11.3 Guided drills (how labelled clips get made)

Motion Lab can play a **drill script**: on-screen and spoken prompts at known times ("Jog…",
"Jump!", "Squat!", "Step left", "Jump right!", "Hop left into a squat!", "Walk out of frame").
Each prompt is saved as a label with an expected window (from the prompt to +1.5 s), so recordings
come out **already labelled**, with no manual annotation. Suggested drills:
`jog-slow`, `jog-fast`, `jog-styles` (high knees / heel flicks / shuffle), `jumps`, `squats`,
`lanes`, `combos`, `wind-up-and-landing` (deliberate big dips and soft landings that must _not_
roll), `out-of-frame`.

Record each drill with at least two people, two outfits and two lighting conditions over time.
The more variety, the more the thresholds can be trusted.

### 11.4 Tests

- **Synthetic tests** (`packages/motion/src/synthetic.ts`): generators for idealised movements
  (sine-wave foot lifts at a given cadence and style, parabolic jumps with an optional wind-up dip
  and landing absorption, squats, sideways steps, dropouts, glitches). Every detector rule and
  guard in §8–§9 gets a synthetic test. These exist before any real recording does.
- **Fixture tests** run each recorded drill through `MotionPipeline` and check:
  - every label gets **exactly one** matching event inside its window
  - no events of that type outside any window (for `jogging`, the jog state matches the labelled
    segments)
  - combos come out in the right order (lane before jump/roll)
- A **report test** prints a table per drill: missed, false and median latency from the movement
  onset seen in the signal. Targets: **≥ 95% detected, ≤ 1 false trigger per minute, median
  latency ≤ 100 ms** from signal onset.
- Rule R5 applies: a threshold change needs a fixture or synthetic test to back it.

## 12. Build order (milestones 3 and 4)

| Step | What                                                                                                                                           | Done when                                                                  |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 3a   | `Camera`, `PoseTracker`, Motion Lab with skeleton overlay, fps and inference readouts                                                          | The skeleton follows you on your phone at ≥ 25 fps                         |
| 3b   | `BodySignals` (+ tests), signal plots, `Recorder` record/download/replay                                                                       | You can record a clip on your phone and it replays identically in Vitest   |
| 3c   | Guided drills in Motion Lab                                                                                                                    | One drill produces a labelled JSON file                                    |
| 4a   | `Calibration` + framing check + CalibrationState UI                                                                                            | Calibration passes only with good framing, and gives clear hints otherwise |
| 4b   | Detectors + `GestureFusion` + `MotionPipeline` against synthetic tests, including every guard                                                  | All synthetic tests pass                                                   |
| 4c   | **Human step:** record the drills on your phone; add them to `packages/motion/test/fixtures/`; tune thresholds with the sliders and the report | Fixture targets in §11.4 met                                               |
| 4d   | Practice-moves calibration (personal thresholds)                                                                                               | A second person gets the same detection rate without changing config       |
| 5    | `PoseInput` drives the game; Ready ("jog to start"), auto-pause, camera preview in a corner of the HUD with lane lines                         | A full run is playable with your body alone                                |

A small camera preview with the lane lines in a corner of the HUD (step 5) is strongly
recommended. It shows players which zone they're standing in, which is the most common source of
"it didn't change lane" confusion. It stays on the device like everything else.

## 13. Open questions

- Which phone(s) will this mainly run on? iPhone vs Android, and their age, decide how much of §10
  is needed.
- How much space do players have? This decides whether 2 m is the real minimum distance.
- Will children play? If so, the practice-moves calibration (§7.1 step 3) should be on by
  default.
- Position-based lanes (current plan) versus "each step = one lane": revisit after playtesting
  (CLAUDE.md §12).
