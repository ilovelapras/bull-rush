import { describe, expect, it } from "vitest";
import { CONFIG, Player, type GameEvent } from "../src";

function setup() {
  const events: GameEvent[] = [];
  const player = new Player((e) => events.push(e));
  return { player, events };
}

function advance(player: Player, seconds: number): void {
  for (let i = 0; i < Math.round(seconds * 600); i++) player.update(1 / 600);
}

describe("Player", () => {
  it("jumps to the configured peak and lands after the configured airtime", () => {
    const { player } = setup();
    player.jump();
    let peak = 0;
    let t = 0;
    while (player.action === "jump" && t < 2) {
      player.update(1 / 600);
      peak = Math.max(peak, player.y);
      t += 1 / 600;
    }
    expect(peak).toBeCloseTo(CONFIG.player.jumpPeakM, 1);
    expect(t).toBeCloseTo(CONFIG.player.jumpAirtimeS, 1);
    expect(player.action).toBe("run");
    expect(player.y).toBe(0);
  });

  it("rolls for the configured duration", () => {
    const { player } = setup();
    player.roll();
    expect(player.action).toBe("roll");
    advance(player, CONFIG.player.rollDurationS - 0.05);
    expect(player.action).toBe("roll");
    advance(player, 0.1);
    expect(player.action).toBe("run");
  });

  it("drops fast and then rolls when you roll in the air", () => {
    const { player, events } = setup();
    player.jump();
    advance(player, 0.2);
    player.roll();
    expect(player.action).toBe("dive");
    advance(player, 0.2);
    expect(player.action).toBe("roll");
    expect(events.map((e) => e.type)).toEqual(["jump", "roll"]);
  });

  it("cancels a roll when you jump", () => {
    const { player } = setup();
    player.roll();
    advance(player, 0.1);
    player.jump();
    expect(player.action).toBe("jump");
  });

  it("carries out a jump requested just before landing", () => {
    const { player } = setup();
    player.jump();
    advance(player, CONFIG.player.jumpAirtimeS - 0.1);
    player.jump(); // within the buffer window before landing
    advance(player, 0.2);
    expect(player.action).toBe("jump");
  });

  it("drops a jump requested too early before landing", () => {
    const { player } = setup();
    player.jump();
    advance(player, 0.1);
    player.jump(); // far too early
    advance(player, CONFIG.player.jumpAirtimeS);
    expect(player.action).toBe("run");
  });

  it("moves to the target lane over the configured time", () => {
    const { player, events } = setup();
    player.setLane(1);
    advance(player, CONFIG.lanes.changeDurationS + 0.01);
    expect(player.x).toBeCloseTo(CONFIG.lanes.widthM, 5);
    expect(events).toEqual([{ type: "laneChange", lane: 1 }]);
  });

  it("ignores a lane change to the lane it's already in", () => {
    const { player, events } = setup();
    player.setLane(0);
    expect(events).toEqual([]);
  });
});
