import type { ThemeText } from "../render/Theme";
import { el } from "./dom";

/** Title screen with Play and How to Play. */
export class Menu {
  readonly element = el("div", "screen menu");

  constructor(text: ThemeText, onPlay: () => void) {
    const play = el("button", "big-button", "PLAY");
    play.type = "button";
    play.addEventListener("click", onPlay);

    const help = el("div", "help hidden");
    help.append(
      el("h2", undefined, "How to play"),
      el("p", undefined, text.howToIntro),
      el("p", undefined, "Swipe ⬅️ ➡️ to change lane."),
      el("p", undefined, "Swipe ⬆️ to jump over low obstacles."),
      el("p", undefined, "Swipe ⬇️ to roll under high obstacles."),
      el("p", undefined, "Blockers fill a whole lane: change lane to get round them."),
      el(
        "p",
        "muted",
        "Keyboard: arrows or WASD, Space to jump, Shift to roll, 0-5 to set jog speed.",
      ),
    );
    const helpButton = el("button", "small-button", "How to play");
    helpButton.type = "button";
    helpButton.addEventListener("click", () => help.classList.toggle("hidden"));

    this.element.append(
      el("h1", undefined, text.title),
      el("p", "tagline", text.tagline),
      play,
      helpButton,
      help,
    );
  }
}
