// ALL game tunables live here (CLAUDE.md rule R1). Every value has its unit in the comment.
// Distances are metres, times are seconds, speeds are m/s. These are starting points to tune on a phone.

export const CONFIG = {
  step: {
    fixedDtS: 1 / 60, // simulation step
    maxFrameDtS: 0.1, // longest frame we simulate; longer frames (tab switch) are clipped
  },
  lanes: {
    widthM: 2.5, // distance between lane centers
    changeDurationS: 0.18,
  },
  player: {
    widthM: 0.8,
    depthM: 0.6,
    standingHeightM: 1.7,
    rollingHeightM: 0.8,
    jumpPeakM: 1.5,
    jumpAirtimeS: 0.7,
    diveSpeedMps: 18, // downward speed when you roll in mid-air
    rollDurationS: 0.6,
    inputBufferS: 0.15, // a jump asked for this long before landing happens on landing
  },
  chase: {
    walkSpeedMps: 3, // when not jogging
    jogMinSpeedMps: 7, // slowest jog
    jogMaxSpeedMps: 12, // fastest jog
    speedEaseTauS: 0.5, // time constant of the player speed smoothing
    // The bull works like the chasers in Subway Surfers and Temple Run: it never outruns a
    // jogging player. It closes in on a hit, and a second hit inside the danger window catches you.
    bullStartSpeedMps: 8, // the bull's top speed at the start of a run
    bullAccelMps2: 0.02, // top speed gain per second of play
    bullMaxSpeedMps: 11.5, // top speed cap; below the fastest jog so a jogging player can't be outrun
    bullCatchUpPerS: 1, // bull speed above the player's per metre it is behind where it wants to be (1/s)
    bullDropBackMps: 1.5, // the fastest the bull falls back, relative to the player
    gapStartM: 12,
    gapRestM: 12, // where the bull settles behind the slowest jog
    gapMaxM: 18, // where it settles behind the fastest jog; the gap never goes above this
    dangerGapM: 3, // a hit brings the bull this close
    dangerWindowS: 5, // a second hit within this long of the last one means you're caught
    stumbleDurationS: 1,
    stumbleSpeedFactor: 0.5, // player speed multiplier while stumbling
    hitInvulnerableS: 0.5, // no further hits count for this long after one
    bullVisibleGapM: 8, // the renderer shows the bull when the gap is below this
  },
  hitbox: {
    forgiveness: 0.8, // obstacles are shrunk to this fraction of their visual size
    scrapeOverlapM: 0.3, // sideways overlap below this counts as a scrape, not a head-on hit
  },
  obstacles: {
    variantsPerCategory: 3,
    low: { widthM: 2.0, depthM: 1.0, bottomM: 0, topM: 0.9 }, // jump over
    high: { widthM: 2.4, depthM: 0.6, bottomM: 1.3, topM: 3.0 }, // roll under
    block: { widthM: 2.0, depthM: 1.6, bottomM: 0, topM: 2.5 }, // change lane
  },
  track: {
    spawnAheadM: 60, // obstacles appear this far ahead (hidden by fog)
    despawnBehindM: 8,
    firstRowM: 40, // distance of the first row from the start
    minActionGapS: 1.0, // minimum travel time between two rows, at the fastest jog
    extraGapMaxM: 12, // random extra spacing at the start; shrinks to 0 as difficulty rises
    openingS: 15, // gentle opening: one obstacle per row, each category shown once first
    rampS: 120, // time for difficulty to go from 0 to 1
    doubleRowMaxChance: 0.6, // chance of a two-obstacle row at full difficulty
    fullWidthRowChance: 0.15, // chance of an all-jump or all-roll row, after the opening
    categoryWeights: { low: 0.4, high: 0.3, block: 0.3 },
  },
} as const;
