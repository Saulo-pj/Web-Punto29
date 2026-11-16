import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { floorLayoutPlugin } from "./server/floorLayoutPlugin.js";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: process.env.GITHUB_ACTIONS ? "/Web-Punto29/" : "/",
  plugins: [
    react(),
    tailwindcss(),
    ...(command === "serve" && process.env.VITE_USE_LAYOUT_DATABASE === "true"
      ? [floorLayoutPlugin()]
      : []),
  ],
}));
