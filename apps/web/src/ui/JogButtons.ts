import { JOG_LEVEL_MAX, type JogControl } from "../input/JogControl";
import { el } from "./dom";

/** Phone stand-in for jogging: tap a level (5 = fastest, STOP = not jogging). */
export class JogButtons {
  readonly element = el("div", "jog-buttons");
  private readonly buttons = new Map<number, HTMLButtonElement>();

  constructor(private readonly jog: JogControl) {
    this.element.append(el("div", "jog-title", "JOG"));
    for (let level = JOG_LEVEL_MAX; level >= 0; level--) {
      const button = el("button", "jog-button", level === 0 ? "STOP" : String(level));
      button.type = "button";
      button.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        jog.set(level);
      });
      this.buttons.set(level, button);
      this.element.append(button);
    }
    jog.onChange(() => this.refresh());
    this.refresh();
  }

  private refresh(): void {
    for (const [level, button] of this.buttons) {
      button.classList.toggle("active", level === this.jog.level);
    }
  }
}
