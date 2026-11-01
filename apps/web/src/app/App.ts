import { Game, type GameEvent } from "@bull-rush/game-core";
import { CombinedInput } from "../input/CombinedInput";
import { JogControl } from "../input/JogControl";
import { KeyboardInput } from "../input/KeyboardInput";
import { TouchInput } from "../input/TouchInput";
import { Renderer } from "../render/Renderer";
import { bullRunTheme } from "../theme/bullrun";
import { GameOver } from "../ui/GameOver";
import { Hud } from "../ui/Hud";
import { JogButtons } from "../ui/JogButtons";
import { Menu } from "../ui/Menu";

type Screen = "menu" | "playing" | "ending" | "gameover";

const BEST_KEY = "bullrush.best";
const ENDING_MS = 900; // let the bull catch you before the game-over screen
const MENU_BACKGROUND_JOG = 0.5;

function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

function loadBest(): number {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0; // storage can be blocked (private mode); the game works without it
  }
}

function saveBest(distanceM: number): void {
  try {
    window.localStorage.setItem(BEST_KEY, String(distanceM));
  } catch {
    // ignore: best score just isn't remembered
  }
}

/** Top-level state machine: menu, playing, being caught, game over. Owns the frame loop. */
export class App {
  private screen: Screen = "menu";
  private game: Game = this.newBackgroundGame();
  private endingStartMs = 0;
  private best = loadBest();

  private readonly renderer: Renderer;
  private readonly jog = new JogControl();
  private readonly input: CombinedInput;
  private readonly hud = new Hud(bullRunTheme.text);
  private readonly jogButtons = new JogButtons(this.jog);
  private readonly menu = new Menu(bullRunTheme.text, () => this.startRun());
  private readonly gameOver = new GameOver(
    bullRunTheme.text,
    () => this.startRun(),
    () => this.showMenu(),
  );

  constructor(canvas: HTMLCanvasElement, overlay: HTMLElement) {
    this.renderer = new Renderer(canvas, bullRunTheme);
    this.input = new CombinedInput([new KeyboardInput(this.jog), new TouchInput(canvas)], this.jog);
    overlay.append(
      this.menu.element,
      this.hud.element,
      this.jogButtons.element,
      this.gameOver.element,
    );
    this.showMenu();
  }

  start(): void {
    requestAnimationFrame((t) => this.frame(t));
  }

  // nowMs is the rAF timestamp: the same performance.now() clock as the input events' `t`.
  private frame(nowMs: number): void {
    if (this.screen === "playing") this.updatePlaying(nowMs);
    else if (this.screen === "ending") this.updateEnding(nowMs);
    else this.updateBackground(nowMs);

    this.renderer.render(this.game, nowMs / 1000);
    requestAnimationFrame((t) => this.frame(t));
  }

  private updatePlaying(nowMs: number): void {
    const poll = this.input.poll(); // gesture events carry their own timestamps
    this.game.update(nowMs, poll);
    for (const event of this.game.drainEvents()) this.onGameEvent(event);
    this.hud.update(this.game);
    if (this.game.over) {
      this.screen = "ending";
      this.endingStartMs = nowMs;
    }
  }

  private updateEnding(nowMs: number): void {
    // The simulation has stopped with the bull on the player: hold that frame for a moment
    // (the runner and bull keep their idle animation) before the game-over screen.
    this.hud.update(this.game);
    if (nowMs - this.endingStartMs > ENDING_MS) this.showGameOver();
  }

  private updateBackground(nowMs: number): void {
    this.game.update(nowMs, { events: [], jogging: true, jogIntensity: MENU_BACKGROUND_JOG });
    this.game.drainEvents();
  }

  private onGameEvent(event: GameEvent): void {
    if (event.type === "jump") this.hud.flash("JUMP");
    else if (event.type === "roll") this.hud.flash("ROLL");
    else if (event.type === "laneChange")
      this.hud.flash(event.lane === 0 ? "CENTER" : event.lane < 0 ? "◀ LEFT" : "RIGHT ▶");
    else if (event.type === "stumble") this.hud.flash("OUCH!");
  }

  private startRun(): void {
    this.game = new Game(randomSeed(), performance.now());
    this.input.reset();
    this.screen = "playing";
    this.setScreenClasses();
  }

  private showMenu(): void {
    this.game = this.newBackgroundGame();
    this.screen = "menu";
    this.setScreenClasses();
  }

  private showGameOver(): void {
    const score = this.game.score();
    const isNewBest = score.distanceM > this.best;
    if (isNewBest) {
      this.best = score.distanceM;
      saveBest(this.best);
    }
    this.gameOver.show(score, this.best, isNewBest);
    this.screen = "gameover";
    this.setScreenClasses();
  }

  private newBackgroundGame(): Game {
    const game = new Game(randomSeed(), performance.now());
    game.invincible = true;
    return game;
  }

  private setScreenClasses(): void {
    this.menu.element.classList.toggle("hidden", this.screen !== "menu");
    this.gameOver.element.classList.toggle("hidden", this.screen !== "gameover");
    const inRun = this.screen === "playing" || this.screen === "ending";
    this.hud.element.classList.toggle("hidden", !inRun);
    this.jogButtons.element.classList.toggle("hidden", !inRun);
  }
}
