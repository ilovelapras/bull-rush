# Bull Rush — CLAUDE.md

A 3D endless runner (in the style of Subway Surfers) controlled entirely by the player's **body**, tracked through the device camera. The setting is a **Running of the Bulls**: the player sprints through a narrow, sunny old-town street with a bull charging behind them.

The player jogs on the spot to run. Jogging faster pulls them further ahead of the bull; stopping lets it catch them, and two hits in quick succession bring it down on them. Stepping left or right changes lanes, jumping jumps and squatting rolls. Combined moves, such as a sideways jump, trigger a lane change followed by the action.

Working title: **Bull Rush**. The theme is deliberately kept separate from the game logic so it can be reskinned later.

---

## 1. Target platform and constraints

- **Primary device:** a phone or tablet propped up in **portrait** orientation at roughly waist height, with the player standing **2–3 m away** and their whole body in frame. Landscape should still work, but portrait is the design target.
- **Runs in the mobile browser.** There is no native app or app store build. It must work in current Chrome for Android and Safari for iOS.
- **The camera requires HTTPS**, including during development on the local network. See §9.1.
- **Privacy:** camera frames are processed on the device only. Never upload, store or send video or images anywhere. Recorded *landmark* data (numbers only, see §6.6) is a development-only feature and must be off by default.
- **Performance budget:** the game renders at 60 fps (at least 30 fps on mid-range phones), and pose tracking runs at 25 fps or more at the same time. Body movement to on-screen reaction should take **under 150 ms**.

## 2. Tech stack

| Concern | Choice |
|---|---|
| Language | TypeScript (strict), pinned to 6.0.x because `typescript-eslint` doesn't support 7.x yet |
| Repo/build | pnpm workspaces monorepo (§4). Vite for `apps/web`, plus `@vitejs/plugin-basic-ssl` for HTTPS on the local network |
| 3D | Three.js |
| Pose tracking | `@mediapipe/tasks-vision` **PoseLandmarker**, *lite* model, `runningMode: "VIDEO"`, GPU delegate falling back to CPU |
| Tests | Vitest |
| Quality | ESLint (with import-boundary rules), Prettier, `tsc --noEmit` |
| Git hooks | `simple-git-hooks` + `lint-staged` (§9.2) |
| CI/deploy | GitHub Actions, deploying `apps/web` to GitHub Pages |
| UI | Plain DOM and CSS layered over the canvas (no framework needed) |
| Audio | Web Audio API (one small wrapper) |

Do not add other dependencies without a clear reason. Never add a physics engine, because collisions are simple box checks against lanes.

## 3. Scope

### In scope (v1)
- Menu page: title, Play, How to Play and Settings.
- Camera permission flow, then **calibration**, then **"jog to start"**, then gameplay, then the game-over screen.
- Three lanes, with jump, roll and lane changes, including combined moves.
- Variable-speed jogging and the bull chase model (§5).
- Three obstacle categories: jump-over, roll-under and lane-blocker (§7).
- HUD: a chase meter showing distance to the bull, a jog-intensity indicator and distance/score.
- A debug overlay: camera feed with skeleton, live signal values, detector states and FPS.
- **Touch and keyboard controls** so the whole game can be played and tested without a camera: swipes on a phone, keys on a computer, and on-screen JOG buttons standing in for jogging. These stay as a fallback and testing tool after the camera input arrives (rule R7).

### Out of scope (keep in view; don't block them)
- Coins, power-ups, shop and currency. The track spawner (§7.3) should make it **easy to add pickups later**, for example through a generic "spawnable" interface, but don't build pickups now.
- A backend, leaderboards, accounts, multiplayer and hands-free menu navigation. `apps/server/` is reserved but must not be created yet (§4.5).

## 4. Repository structure and architecture

The repository is a **pnpm workspace monorepo**. v1 has **no backend**: everything runs on the player's device, and best scores are saved in `localStorage`. `apps/server/` is reserved for a later backend (§4.5) and **must not be created in v1**.

### 4.1 Living file tree

> **This tree must always match the real repository (see rule R9).**
> - Entries marked `(planned)` don't exist yet. Remove the marker when you create the file.
> - **One file or folder per line**, so `scripts/check-file-tree.mjs` can parse the tree. Folders end in `/`, and indentation shows nesting.
> - **Current status:** milestones 1 (scaffold) and 2 (playable game with touch and keyboard controls) are done. The game runs end to end: menu, run, obstacles, chase, game over. There is no camera/pose code yet (`packages/motion` is empty), and no calibration, settings or audio.

```
bull-rush/
  CLAUDE.md
  README.md                          // how to run, test, deploy
  package.json                       // workspace root: dev, test, build, lint, typecheck scripts
  pnpm-workspace.yaml
  tsconfig.base.json                 // shared strict TS settings
  eslint.config.js                   // includes the package import rules (R2)
  .prettierrc
  .prettierignore
  .gitignore
  apps/
    web/                             // FRONTEND: the playable game (Vite)
      index.html
      vite.config.ts                 // basic-ssl plugin (HTTPS), BASE_PATH for GitHub Pages
      tsconfig.json
      tsconfig.node.json             // for vite.config.ts only (Node types)
      package.json
      public/
        mediapipe/                   (planned)  // pose model + wasm, self-hosted (no CDN)
        models/                      (planned)  // GLB models (later; placeholders are procedural)
        audio/                       (planned)
      src/
        main.ts                      // boot, creates App
        app/
          App.ts                     // top-level state machine (see 4.2)
          states/                    (planned)  // MenuState, PermissionState, CalibrationState,
                                                // ReadyState, PlayingState, PausedState, GameOverState
        input/                       // browser-side input sources only
          KeyboardInput.ts           // keyboard gestures + number keys for jog level
          TouchInput.ts                         // swipe gestures: left/right = lane, up = jump, down = roll
          JogControl.ts                         // manual jog level 0-5 (stand-in for the jog detector)
          CombinedInput.ts                      // merges gestures into an InputSource; owns the absolute lane
          PoseInput.ts               (planned)  // implements InputSource: camera -> @bull-rush/motion
          Camera.ts                  (planned)  // getUserMedia (front camera), video element
          PoseTracker.ts             (planned)  // MediaPipe wrapper; emits PoseFrame per video frame
          RecorderControls.ts        (planned)  // dev only: record button, download JSON
        render/                      // Three.js; only READS game-core state
          Renderer.ts                // scene, camera rig, fog, lighting
          Theme.ts                   // interface a theme implements (the renderer only knows this)
          PlayerView.ts
          BullView.ts
          ObstacleViews.ts
          StreetView.ts
          Gallery.ts                 // dev page (?gallery=1): all obstacles, runner and bull in rows
        theme/
          bullrun/                   // the ONLY place that knows about bulls, poo, Spain (R8)
            index.ts                 // maps logical obstacle ids -> view factories
        ui/
          Menu.ts
          GameOver.ts
          Hud.ts
          JogButtons.ts              // on-screen jog levels for phones (stand-in for jogging)
          dom.ts                     // tiny element-building helper
          HowToPlay.ts               (planned)
          Settings.ts                (planned)
          CalibrationGuide.ts        (planned)
          DebugOverlay.ts            (planned)
        audio/                       (planned)
          Audio.ts                   (planned)  // Web Audio wrapper
        styles/
          main.css
  packages/
    shared/                          // types only, no logic
      package.json
      tsconfig.json
      src/
        index.ts
        input.ts                     // InputEvent, InputSource, PoseFrame, Landmark types
    game-core/                       // pure simulation. No Three.js, no DOM, no browser APIs
      package.json
      tsconfig.json
      src/
        index.ts
        config.ts                    // ALL game tunables (R1)
        Game.ts                      // fixed-timestep simulation, owns everything below
        Player.ts                    // lane + action state machine (run/jump/roll/stumble)
        Chase.ts                     // player speed vs bull speed, gap model, danger window
        Track.ts                     // spawns obstacle rows ahead, drops them once behind
        ObstacleTypes.ts             // logical obstacles (category, hitbox, lanes)
        PatternGenerator.ts          // guarantees passable, fair layouts
        Collision.ts
        Difficulty.ts
        Score.ts
        rng.ts                       // seeded random number generator
      test/                          // chase model, pattern fairness, player FSM, collisions, a dodging bot
        helpers.ts
        rng.test.ts
        player.test.ts
        chase.test.ts
        collision.test.ts
        patterns.test.ts
        game.test.ts
        timing.test.ts               // same run at any frame rate; events applied at their timestamp
    motion/                          // body signals -> InputEvents. Pure TS. No Three.js, no game-core
      package.json
      tsconfig.json
      src/
        index.ts
        config.ts                    (planned)  // ALL motion thresholds (R1)
        filters.ts                   (planned)  // One Euro filter, EMA helpers
        BodySignals.ts               (planned)  // landmarks -> normalized body features (6.2). Only place for mirroring (R4)
        Calibration.ts               (planned)  // baseline capture + slow adaptive update
        detectors/                   (planned)
          JogDetector.ts             (planned)
          LaneZoneDetector.ts        (planned)
          JumpDetector.ts            (planned)
          SquatDetector.ts           (planned)
        GestureFusion.ts             (planned)  // combines detector outputs -> ordered InputEvents (combos)
        Recorder.ts                  (planned)  // record landmark streams as JSON, replay as a fake PoseTracker
        synthetic.ts                 (planned)  // synthetic movement generators for tests
      test/                          (planned)
        fixtures/                    (planned)  // recorded landmark JSON clips (numbers only, never video)
  scripts/
    check-file-tree.mjs              // fails if this tree and the real repo disagree
  docs/
    decisions/                       // short notes on design decisions and tuning results
      README.md
      2026-10-24-chase-model.md      // why the bull uses strikes, benchmarked on Subway Surfers / Temple Run
  .claude/
    settings.json                    // Claude Code hooks (see 9.2)
  .github/
    workflows/
      ci.yml                         // typecheck, lint, test, build on every push
      deploy.yml                     // publish apps/web to GitHub Pages
```

### 4.2 Dependency rules (enforced by the build, not just by convention)

```
shared  ←  game-core
shared  ←  motion
shared, game-core, motion  ←  apps/web
```

- `shared` depends on nothing.
- `game-core` may import only `shared`. It contains **no Three.js and no browser APIs** (`window`, `document`, `navigator`), so it runs in plain Node.
- `motion` may import only `shared`. It never imports `game-core`, so it can be tested without a game or a camera.
- `apps/web` is the only package that touches the camera, MediaPipe, Three.js, the DOM and audio. It connects `motion` to `game-core` through the `InputSource` interface.
- Declare these dependencies in each `package.json` **and** enforce them with ESLint import rules, so a wrong import fails lint and CI.
- Packages are referenced as `@bull-rush/shared`, `@bull-rush/game-core` and `@bull-rush/motion`.

### 4.3 App states (`apps/web/src/app/`)
`Menu → Permission → Calibration → Ready ("jog to start") → Playing ⇄ Paused → GameOver → (Ready | Menu)`

> **Planned (milestones 3–5).** Today `App.ts` has only four screens: menu, playing, caught (the bull reaches the player) and game over. Permission, Calibration, Ready and Paused arrive with the camera input.

- **Paused** is entered automatically when no pose has been detected for 1 s, or the person has left the frame. Resume with a 3-second countdown once the person is back in frame and jogging.
- In keyboard mode, Permission and Calibration are skipped.

### 4.4 The single most important boundary
The camera, the touch swipes and the keyboard are interchangeable. Each ends up as an `InputSource`, which produces **`InputEvent`s and a `jogIntensity` value only**. `game-core` consumes that interface and knows nothing about where it came from. The types live in `packages/shared`.

```ts
type InputEvent =
  | { type: "lane"; target: -1 | 0 | 1; t: number }   // absolute lane, player-space
  | { type: "jump"; t: number }
  | { type: "roll"; t: number };

interface InputSource {
  poll(nowMs: number): {
    events: InputEvent[];
    jogging: boolean;     // false = the character only walks
    jogIntensity: number; // 0..1, only meaningful while jogging
    present: boolean;
  };
  reset?(): void;         // called when a run starts (e.g. to reset a lane tracker)
}
```

Lane events are **absolute** (left, center or right) rather than relative, because lanes map to where the player is standing (§6.4). With absolute targets, a missed or duplicated event can't leave the game permanently out of sync with the player.

Today (milestone 2) `CombinedInput` in `apps/web` is the `InputSource`: keyboard and touch gestures report relative intents (left, right, jump, roll), and `CombinedInput` is the one place that turns them into absolute lane events. The camera pipeline will become another source with the same output.

### 4.5 Backend: reserved, not built
There is no server in v1. Everything runs on the device, and the game deploys as static files to any HTTPS host.

If leaderboards, accounts or saved coins are added later:
- Start with a hosted service (for example Supabase or Firebase) called from `apps/web`, behind one small `apps/web/src/services/` module, so the rest of the game never talks to it directly.
- Only create `apps/server/` if custom logic is needed, such as rejecting faked scores by replaying a run's recorded inputs through `game-core` (which works because `game-core` is deterministic and runs in Node).
- Any API types shared between the client and the server go in `packages/shared`.
- Never send camera frames or landmark data to a server.

## 5. Chase model (the core loop)

All values below are **starting points** and belong in `packages/game-core/src/config.ts`.

- `jogIntensity` (0 to 1) comes from the jog detector (§6.3).
- Player speed:
  `vPlayer = jogging ? lerp(V_JOG_MIN=7, V_JOG_MAX=12, jogIntensity) : V_WALK=3` (m/s), smoothed with roughly 0.5 s of easing so the speed doesn't jitter.
- The world scrolls at `vPlayer`. Jogging faster brings obstacles towards you faster, which is the risk-for-reward trade-off.
- **The bull never outruns a jogging player.** It works like the chasers in Subway Surfers (the Inspector) and Temple Run (the demon monkeys): only mistakes get you caught, and difficulty comes from obstacle density, not from the chaser. See `docs/decisions/2026-10-24-chase-model.md`.
- Bull top speed: `V_BULL_START(8) + BULL_ACCEL(0.02 m/s per s) * elapsed`, capped at `BULL_MAX=11.5`, below the fastest jog.
- **While jogging,** the bull settles at a wanted gap: `lerp(GAP_REST=12, GAP_MAX=18, jogIntensity)` m. Its speed is `vPlayer + (dGap - wantedGap) * CATCH_UP(1/s)`, at most its top speed and at least `vPlayer - DROP_BACK(1.5)`. Jogging harder buys a bigger buffer.
- **While not jogging,** the bull charges at its top speed and catches a walking player within a few seconds.
- Gap: `dGap += (vPlayer - vBull) * dt`, clamped to `[0, GAP_MAX]`, starting at `GAP_START=12` m.
- **Hitting an obstacle** (head-on or a side-scrape) is a strike. The player stumbles (slowed for 1 s), the bull closes to `DANGER_GAP=3` m and a **danger window of `DANGER_WINDOW=5` s** opens, during which the bull stays close. A second hit inside the window means caught. After the window, the bull drops back to the wanted gap.
- **Caught (game over):** a second hit inside the danger window, or `dGap <= 0` from not jogging.
- Score is the distance travelled in metres. Also show the time survived and the bull's top speed reached.
- Bull presentation: when `dGap < 8` m, the bull becomes visible between the camera and the player (as in Temple Run's monster). The hoof sound gets louder and the camera shakes more as the gap shrinks. The HUD chase meter always shows the gap.

## 6. Motion detection

### 6.1 Coordinate rules (read twice)
- Use MediaPipe's **normalized image landmarks** (not world landmarks, which are centered on the hips and so lose sideways and vertical position). Convert to **pixel space** with the video's width and height before measuring any distance, because x and y are normalized on different scales.
- The front camera image is mirrored. **All left/right logic is in player space**: when the player moves to *their* right, the character moves right. Do the mirroring in exactly one place (`BodySignals`), back it with a setting, and cover it with a unit test.
- **Image y points downwards.** Wrap this in helpers like `heightAboveBaseline()` so detector code reads naturally.
- Normalize every distance by the **calibrated body scale** so thresholds don't depend on how far the player stands from the camera:
  - `torsoLen`: the distance from the midpoint of the shoulders to the midpoint of the hips.
  - `shoulderW`: the distance between the shoulders.

### 6.2 Body signals (per frame, after One Euro filtering)
Landmarks used: shoulders 11/12, hips 23/24, knees 25/26, ankles 27/28.
- `hipX`: the horizontal offset of the hip midpoint from the calibrated center, in units of `shoulderW`, in player space.
- `hipRise`: how far the hip midpoint is above the standing baseline, in units of `torsoLen` (negative means lower).
- `hipVy`: the vertical velocity of the hips, in `torsoLen` per second.
- `hipVx`: the sideways velocity of the hips, in `shoulderW` per second.
- `kneeLiftL/R`: the height of each knee relative to the hips (used for jogging).
- `ankleRise`: how far both ankles are above their standing baseline, using the smaller of the two.
- `kneeAngleL/R`: the hip–knee–ankle angle in degrees.
- `visible`: true when the key landmarks have visibility of at least 0.5 and the whole body is in frame.

### 6.3 Calibration
1. Show a silhouette guide. The player stands still with their whole body visible for **2 s**.
2. Capture the baseline hip midpoint (x and y), ankle y, `torsoLen` and `shoulderW` by taking the median over that window.
3. During play, **adapt slowly**: update the baseline and scale with an EMA (time constant about 3 s), *but only* while the detector says "standing" or "jogging" (never while jumping, squatting or changing lanes). This handles the player drifting closer to or further from the camera.

### 6.4 Detectors (starting thresholds; all in `packages/motion/src/config.ts`)

**JogDetector → `jogIntensity`**
- Detect alternating peaks in `kneeLiftL` and `kneeLiftR` (peak prominence of at least 0.08 `torsoLen`, with left and right alternating).
- Cadence is the number of alternating peaks in the last 2 s, converted to steps per minute.
- Jogging counts as active above `CADENCE_MIN=100` spm. `jogIntensity = clamp((cadence-100)/(180-100), 0, 1)`, smoothed with an EMA of about 0.5 s.
- Ignore the frames inside a jump or squat.

**LaneZoneDetector → `lane` events (position-based)**
- The lane is decided by **where the player stands**: `hipX < -ENTER(0.8)` is the left lane, `hipX > +ENTER(0.8)` is the right lane, and anything else is the center.
- Use hysteresis: once in a side lane, the player only returns to center when `|hipX| < EXIT(0.5)`.
- **Early commit:** if `|hipVx| > LATERAL_V_COMMIT(3.0)` and the projected position 100 ms ahead crosses a boundary, emit the lane change now. This makes sideways jumps and hops feel instant.

**JumpDetector → `jump`**
- A jump fires on take-off, not at the peak. It requires `hipVy > 1.5`, `hipRise > 0.15` and `ankleRise > 0.10`, with both ankles rising together.
- Normal jogging bounce is about 0.05–0.08 `torsoLen`, so it must never trigger a jump. A unit test must cover this using the jogging fixtures.
- A refractory period of 400 ms after landing prevents double jumps.

**SquatDetector → `roll`**
- A roll fires when `hipRise < -0.25` and both knee angles are below 130°, held for 2 frames or more.
- It fires when the squat *starts*. The player must be standing again (`hipRise > -0.1`) before another roll can fire.
- The roll in the game lasts a fixed 0.6 s, no matter how long the player stays squatting.

### 6.5 GestureFusion and combos
GestureFusion collects detector outputs in a short **fusion window (`FUSION_MS=80`)**. Within one window, lane changes are **always emitted before** jumps and rolls.

| Real-world movement | Game result |
|---|---|
| Jog on the spot | Run. Speed follows cadence. |
| Step left or right into a zone | Change lane |
| Jump straight up | Jump |
| Squat | Roll |
| **Jump sideways** (high rise plus strong sideways velocity at take-off) | Lane change, **then** jump |
| **Low sideways hop or step landing in a squat** (rise below the jump threshold) | Lane change, **then** roll |
| Jump, then land in a squat | Jump, then roll on landing (the character drops fast and rolls) |

The vertical-rise threshold is what separates a "sideways jump" from a "sideways hop into a squat". Keep it in config and tune it from recordings.

### 6.6 Recording and replay (essential for development)
- In debug mode, a Record button saves the filtered landmark stream (timestamps and landmarks only, **no images**) as JSON.
- `Recorder` (in `packages/motion`) can replay a JSON clip as a fake `PoseTracker`, both in the browser and in Vitest. The record button itself lives in `apps/web`.
- Keep labelled fixture clips in `packages/motion/test/fixtures/`, for example `jog_slow`, `jog_fast`, `jump_straight`, `jump_left`, `squat`, `hop_right_squat` and `walk_out_of_frame`. Each test asserts the exact sequence of events produced.
- **Until real recordings exist,** write synthetic generators (`packages/motion/src/synthetic.ts`: sine-wave knee lifts, a parabolic hip rise for jumps, and so on) so the detector logic can be tested. Replace them with real clips as soon as the human provides them.

## 7. Game world

### 7.1 Lanes and player
- Three lanes, 2.5 m apart. Lane changes take 0.18 s with an eased sideways move.
- Jump airtime is about 0.7 s and clears jump-over obstacles. A roll lasts 0.6 s and clears roll-under obstacles.
- Lane changes are allowed in the air and during a roll. A roll in the air makes the player drop fast and then roll. A jump during a roll cancels the roll.
- Input buffer: a jump or roll requested up to 150 ms before landing is carried out on landing.
- Collision uses **forgiving hitboxes** (about 80% of the visual size), because body controls are less precise than fingers.

### 7.2 Obstacles (Running of the Bulls theme)
| Category | Must… | Theme objects |
|---|---|---|
| Jump-over (low) | jump | **Pile of poo** (the signature obstacle: brown stacked swirl, a few buzzing flies, squelch sound if you hit it), hay bale, barrel on its side |
| Roll-under (high) | roll | Festival bunting or banner, washing line with laundry, low market awning |
| Lane-blocker (full height) | change lane | Churro/food cart, stone fountain, stacked crates, parked wagon |

The logical obstacle definitions (`game-core/src/ObstacleTypes.ts`) know only the category, hitbox and lane footprint. How each one looks lives in `apps/web/src/theme/bullrun/`.

### 7.3 Pattern generator (fairness rules)
- **Every row must have at least one passable lane.** Test this across thousands of random seeds.
- Leave at least `MIN_ACTION_GAP_S = 1.0` s of travel, at the current speed, between two required actions. Never require a lane change and a jump/roll within 0.6 s unless it's a deliberate combo pattern, and only introduce those after 45 s.
- The first 15 s are a gentle opening: one obstacle at a time, each type shown once.
- Obstacles must be visible at least **2 s** before the player reaches them. Use fog for the spawn distance, so spawn distance is at least `vPlayer * 2.0`.
- Use a seeded random number generator so runs and tests are reproducible.
- Build spawning around a generic `Spawnable` so coins and power-ups can be added later.

### 7.4 Art direction
- Low-poly, bright and cartoony: warm Mediterranean palette, whitewashed walls, terracotta roofs, red and white festival bunting.
- **Phase 1 uses procedural placeholder meshes built from Three.js primitives.** The poo pile is three stacked, shrinking tori plus a cone tip. Swapping in GLB models later (for example Quaternius or Kenney CC0 packs) must only touch `apps/web/src/theme/bullrun/`.
- The player wears the traditional white outfit with a red neckerchief. The bull is chunky and dark, with visible breath puffs.
- Performance: cap pixelRatio at 1.5, use a single directional light, skip real-time shadows (fake blob shadows instead), use fog, pool all obstacle and street chunks, and share materials.

## 8. UI
- **Menu:** title, Play, How to Play (an illustrated card for each move from the table in §6.5), Settings (debug overlay, mirror toggle, sensitivity presets low/normal/high, keyboard mode, sound).
- **Calibration guide:** silhouette outline, a "move back" or "step into frame" hint, and a lighting warning when landmark visibility is low.
- **Ready:** "Jog on the spot to start!" with a cadence meter that fills up. Jogging steadily for 1 s starts the run.
- **HUD:** the chase meter (bull icon to runner icon) along the top, jog-intensity bar, distance, and a brief flash of the detected move (helps players learn the controls).
- **Game over:** "The bull got you!", distance, time and best score (localStorage, wrapped in try/catch), plus Retry (jog to restart, or tap) and Menu.
- All touch targets are large. The player is 2–3 m away, so text must be readable from a distance: large and high-contrast.

## 9. Development workflow

### 9.1 Commands (run from the repository root)
- `pnpm install`: install all workspace packages.
- `pnpm dev`: serves `apps/web` over HTTPS on the local network (`--host`) so a real phone can open it. The self-signed certificate must be accepted on the phone once.
- `pnpm test`: runs Vitest in every package. `game-core` and `motion` tests run in plain Node with no browser or camera.
- `pnpm typecheck`, `pnpm lint` and `pnpm format`: strict TypeScript, ESLint (including the import-boundary rules from §4.2) and Prettier.
- `pnpm build`: produces a static build of `apps/web` for any HTTPS static host.
- `pnpm check:tree`: runs `scripts/check-file-tree.mjs`, which fails if the file tree in §4.1 and the real repository disagree.
- **Touch controls (phone):** swipe left/right to change lane, up to jump, down to roll. The JOG buttons (5 = fastest, STOP = not jogging) set the jog level.
- **Keyboard controls:** ← → or A/D for lanes (pressing ← in the left lane does nothing), ↑/W/Space to jump, ↓/S/Shift to roll, and 0–5 to set the jog level (0 = not jogging). J sets a medium jog.
- `?gallery=1` shows every obstacle, the runner and the bull in rows, for checking a theme.
- *(Planned, milestone 3)* A `?debug=1` URL flag turns on the debug overlay, and `?replay=<fixture>` drives the game from a recorded clip. Neither exists yet.

### 9.2 Hooks
There are three kinds, each with its own job. The game is plain TypeScript, so there are no React hooks.

| Kind | Where | What it does |
|---|---|---|
| **Git hooks** | `simple-git-hooks` + `lint-staged`, configured in the root `package.json` | **pre-commit:** Prettier and ESLint on the staged files. **pre-push:** `pnpm typecheck && pnpm test && pnpm check:tree`. |
| **Claude Code hooks** | `.claude/settings.json` | **SessionStart:** runs `pnpm install` so a cloud session can run tests straight away. **Stop:** runs `pnpm check:tree` and blocks the agent from finishing while the tree is out of date. |
| **CI** | `.github/workflows/ci.yml` | On every push and pull request: install, typecheck, lint, Prettier check, test, `check:tree` and build. |

Deployment: `.github/workflows/deploy.yml` publishes the `apps/web` build to GitHub Pages, so the latest build can be opened on a phone over HTTPS. It runs only after CI passes for a push to main, and builds that exact commit, so a change that fails CI never goes live. It can also be run by hand, which deploys the current main.

## 10. Rules for the coding agent
- **R1:** No magic numbers in logic. Every threshold, speed and duration goes in the package's `config.ts` (`game-core` for game numbers, `motion` for detector numbers) with a comment giving its unit.
- **R2:** Follow the dependency rules in §4.2. `motion` and `game-core` never import each other or anything from the browser or Three.js, and only `apps/web` touches the camera, DOM and rendering. Rendering only reads game state: the renderer and HUD take a read-only `GameView`, never `Game`. Never loosen the ESLint boundary rules to make an import work; move the code instead.
- **R3:** The game simulation runs on a fixed 60 Hz timestep, separate from the render rate and from the pose frame rate. `Game` is clocked by timestamps (`update(nowMs)`), and each input event is applied at the step its `t` falls in, so the same inputs give the same run at any frame rate (`test/timing.test.ts`). Input sources stamp events with when they happened (DOM `event.timeStamp`, video frame time), on the `performance.now()` clock, not with the time they're polled.
- **R4:** Mirroring and the y-axis flip are handled only in `packages/motion/src/BodySignals.ts`.
- **R5:** Every detector and fusion change is backed by fixture or synthetic tests. Never "tune by eye" without adding a fixture.
- **R6:** Run pose tracking with `requestVideoFrameCallback` where available, falling back to rAF. Skip a frame rather than queue frames when tracking is slow.
- **R7:** Fail gracefully. If camera permission is denied, there's no camera, or the GPU delegate fails, show a clear message and offer keyboard mode.
- **R8:** Keep the theme swappable. The chaser is part of the core game, so code outside `theme/` may call it "the bull" (`bullSpeedMps`, `BullView`). But how anything *looks or sounds* (the bull's model, poo, hay, bunting, Spain), and the words and icons the UI shows (title, tagline, "The bull got you!", 🐂), live only in `apps/web/src/theme/`. UI code gets its text from `Theme.text`. Outside it, obstacles are referred to only by their logical category (`low`, `high`, `block`).
- **R9: Keep the file tree in §4.1 up to date.** Whenever you create, rename, move or delete a file or folder anywhere in the repository, update the tree in the **same change**:
  - Add new files with a short `// comment` explaining what each one is for.
  - Remove the `(planned)` marker when a planned file is created.
  - Delete entries that are dropped from the plan. Don't leave stale ones.
  - Update the "Current status" line to the latest milestone you've finished.
  - Keep one entry per line so the checker can parse it.
  - Before finishing any task, run `pnpm check:tree` (once `scripts/check-file-tree.mjs` exists; until then compare against `git ls-files`).
- **R10:** Don't bypass hooks (`--no-verify`) or weaken CI to get a change through. Fix the underlying problem.
- **R11:** No backend code in v1 (§4.5), and never send camera frames or landmark data off the device.

## 11. Milestones (each must be demoable)
1. **Scaffold:** pnpm workspace with `shared`, `game-core`, `motion` and `apps/web`; strict TypeScript; ESLint boundary rules; Vite + Three.js with HTTPS on the local network; empty scene on a phone; git hooks, `check-file-tree.mjs`, `.claude/settings.json` and CI in place.
2. **Game core with touch and keyboard controls (done):** lanes, jump, roll, placeholder obstacles, pattern generator, collision, chase model, HUD, game over, menu. *Done when the game is fun to play on a phone with swipes.* The numbers in `game-core/src/config.ts` are first guesses to be tuned by playing on a phone.
3. **Pose pipeline:** camera, PoseTracker, BodySignals, debug overlay with skeleton and live signals, recorder/replay.
4. **Calibration + detectors + fusion:** with synthetic tests, plus fixture tests once real clips exist.
5. **Integration:** camera input drives the game. Menu, Ready ("jog to start"), auto-pause, settings.
6. **Theme pass:** Running of the Bulls street, poo/hay/bunting/cart meshes, runner and bull, sounds.
7. **Tuning on a real device:** thresholds, latency, fps, difficulty curve.

## 12. Open questions / decisions to revisit after playtesting
- Lanes by standing position (current choice) versus a "step = one lane" scheme. Keep `LaneZoneDetector` behind an interface so a step-based version can be swapped in.
- Whether the bull should be visible all the time or only when close.
- Danger window length (5 s, between Subway Surfers' short "stars" window and Temple Run's reported ~10 s) and whether a side-scrape should count as a full strike.
- Sensitivity presets: what "low/normal/high" should change, likely the jump, squat and lane thresholds together.
- Lane crossings between rows: two consecutive rows can block opposite lane pairs (left+center, then center+right), forcing a two-lane move in about `minActionGapS` (1 s). Easy with swipes, likely too hard with body control. Consider giving the pattern generator a limit on lane moves per gap when tuning on a device (milestone 7).
