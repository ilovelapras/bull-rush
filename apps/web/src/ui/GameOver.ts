import type { Score } from "@bull-rush/game-core";
import type { ThemeText } from "../render/Theme";
import { el } from "./dom";

/** The "caught" screen. */
export class GameOver {
  readonly element = el("div", "screen gameover");
  private readonly stats = el("div", "result");
  private readonly best = el("div", "best");

  constructor(
    private readonly text: ThemeText,
    onRetry: () => void,
    onMenu: () => void,
  ) {
    const retry = el("button", "big-button", "RETRY");
    retry.type = "button";
    retry.addEventListener("click", onRetry);
    const menu = el("button", "small-button", "Menu");
    menu.type = "button";
    menu.addEventListener("click", onMenu);
    this.element.append(el("h1", undefined, text.caught), this.stats, this.best, retry, menu);
  }

  show(score: Score, bestM: number, isNewBest: boolean): void {
    const s = Math.floor(score.timeS);
    this.stats.replaceChildren(
      el("div", "result-distance", `${Math.floor(score.distanceM)} m`),
      el("div", undefined, `Survived ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`),
      el(
        "div",
        undefined,
        `${this.text.chaserName} top speed ${score.topBullSpeedMps.toFixed(1)} m/s`,
      ),
      el("div", undefined, `Stumbles ${score.stumbles}`),
    );
    this.best.textContent = isNewBest ? "New best!" : `Best: ${Math.floor(bestM)} m`;
  }
}
