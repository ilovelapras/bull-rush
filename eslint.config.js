import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

// Package boundaries from CLAUDE.md §4.2. These are errors on purpose: if an import is rejected,
// move the code to the right package instead of loosening a rule (rule R2).
const BROWSER_GLOBALS = [
  "window",
  "document",
  "navigator",
  "localStorage",
  "sessionStorage",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "HTMLElement",
  "HTMLCanvasElement",
  "HTMLVideoElement",
  "AudioContext",
  "fetch",
];

const RENDERING_LIBS = ["three", "three/*", "@mediapipe/*"];

// `forbiddenDirs` catch the same imports written as relative paths, e.g. "../../motion/src".
function boundary(name, forbiddenPackages, forbiddenDirs) {
  return {
    files: [`packages/${name}/**/*.ts`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                ...RENDERING_LIBS,
                ...forbiddenPackages,
                ...forbiddenDirs.map((dir) => `**/${dir}/**`),
              ],
              message: `packages/${name} may not import this (CLAUDE.md §4.2).`,
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        ...BROWSER_GLOBALS.map((n) => ({
          name: n,
          message: `packages/${name} must not use browser APIs; only apps/web may (CLAUDE.md §4.2).`,
        })),
      ],
    },
  };
}

export default tseslint.config(
  { ignores: ["**/node_modules/**", "**/dist/**", "pnpm-lock.yaml"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["scripts/**/*.mjs", "*.js"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["apps/web/**/*.ts"],
    languageOptions: { globals: globals.browser },
  },
  boundary("shared", ["@bull-rush/*"], ["game-core", "motion", "apps"]),
  boundary("game-core", ["@bull-rush/motion", "@bull-rush/web"], ["motion", "apps"]),
  boundary("motion", ["@bull-rush/game-core", "@bull-rush/web"], ["game-core", "apps"]),
);
