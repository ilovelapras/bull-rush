import { App } from "./app/App";
import { showGallery } from "./render/Gallery";
import { bullRunTheme } from "./theme/bullrun";
import "./styles/main.css";

const canvas = document.getElementById("game");
const overlay = document.getElementById("overlay");
if (!(canvas instanceof HTMLCanvasElement) || !overlay) {
  throw new Error('index.html needs <canvas id="game"> and <div id="overlay">');
}

if (new URLSearchParams(window.location.search).has("gallery")) {
  showGallery(canvas, bullRunTheme);
} else {
  new App(canvas, overlay).start();
}
