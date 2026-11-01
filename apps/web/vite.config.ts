import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig } from "vite";

// The camera only works over HTTPS, so the dev server uses a self-signed certificate.
// The phone has to accept it once. BASE_PATH is set by the GitHub Pages deploy workflow.
export default defineConfig(({ command }) => ({
  base: process.env["BASE_PATH"] ?? "/",
  build: { chunkSizeWarningLimit: 800 }, // three.js alone is ~500 kB
  plugins: command === "serve" ? [basicSsl()] : [],
}));
