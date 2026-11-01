import { CONFIG, type GameView } from "@bull-rush/game-core";
import type { ThemeText } from "../render/Theme";
import { el } from "./dom";

const FLASH_MS = 600;

/** In-run display: chase meter, distance, time and a flash of the last move. */
export class Hud {
  readonly element = el("div", "hud");
  private readonly fill = el("div", "meter-fill");
  private readonly you: HTMLSpanElement;
  private readonly distance = el("div", "stat", "0 m");
  private readonly time = el("div", "stat small", "0:00");
  private readonly flashText = el("div", "flash");
  private flashTimer = 0;

  constructor(text: ThemeText) {
    this.you = el("span", "meter-you", text.icons.runner);
    const meter = el("div", "meter");
    const track = el("div", "meter-track");
    track.append(this.fill, this.you);
    meter.append(el("span", "meter-icon", text.icons.chaser), track);
    const stats = el("div", "stats");
    stats.append(this.distance, this.time);
    this.element.append(meter, stats, this.flashText);
  }

  update(game: GameView): void {
    const safe = Math.min(1, game.chase.gapM / CONFIG.chase.gapMaxM);
    this.fill.style.width = `${safe * 100}%`;
    this.you.style.left = `${safe * 100}%`; // the runner sits at the far end of the gap
    this.element.classList.toggle("danger", game.chase.gapM < CONFIG.chase.bullVisibleGapM);
    this.distance.textContent = `${Math.floor(game.distanceM)} m`;
    const s = Math.floor(game.elapsedS);
    this.time.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  flash(text: string): void {
    this.flashText.textContent = text;
    this.flashText.classList.add("show");
    window.clearTimeout(this.flashTimer);
    this.flashTimer = window.setTimeout(() => this.flashText.classList.remove("show"), FLASH_MS);
  }
}
