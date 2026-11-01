# Chase model: strikes, not a race

## Benchmark

Neither of the two reference games gives its chaser a real speed:

- **Subway Surfers:** a light bump makes you stumble (stars circle your head) and the Inspector
  appears right behind you. A second bump while the stars are showing means you're caught. A
  head-on crash ends the run immediately. Run cleanly and he drops out of view. The world speeds
  up on its own over the run.
- **Temple Run:** a stumble brings the demon monkeys up close but they can't catch you on the
  first one. A second stumble while they're close means you're caught. One fan wiki says they
  fall back after about 10 s (unverified). Speed rises with distance.

No published figures exist for either game's run speeds or exact window lengths.

## What changed

The first model had a bull that kept accelerating (8 m/s + 0.02 m/s per s) and overtook the
fastest jog (12 m/s) at about 200 s. A perfect player was always caught after 3–4 minutes. With
body controls that means a tired player loses no matter how well they play, which the benchmark
games never do.

Now:

- The bull's top speed is capped at 11.5 m/s, below the fastest jog.
- While you jog, it settles 12–18 m behind (further the harder you jog).
- Stop jogging and it charges at its top speed.
- A hit brings it to 3 m and opens a 5 s danger window. A second hit inside the window means
  you're caught.

Jogging still matters: it sets your speed (and so your score), your buffer, and stopping gets you
caught. Difficulty comes from obstacle density and pace.

## To tune on a device (milestone 7)

The danger window length, whether side-scrapes count as full strikes, and the resting gaps.
