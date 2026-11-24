import process from "node:process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { postgresPlugin } from "./server/postgresPlugin.js";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: process.env.GITHUB_ACTIONS ? "/Web-Punto29/" : "/",
  plugins: [
    react(),
    tailwindcss(),
    ...(command === "serve" ? [postgresPlugin()] : []),
  ],
}));
