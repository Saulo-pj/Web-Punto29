import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { floorLayoutPlugin } from "./server/floorLayoutPlugin.js";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), floorLayoutPlugin()],
});
