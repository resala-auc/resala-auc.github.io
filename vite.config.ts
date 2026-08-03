import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The recruitment experience is a separate Vite app that builds into dist/join/.
// base: "./" keeps asset URLs relative so the same output works on a GitHub Pages
// project site, a user site, or a custom domain without rebuilding.
export default defineConfig({
  root: "experience",
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../dist/join",
    emptyOutDir: true
  }
});
