import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { initializeFloorLayouts } from "./features/reservation/table-selection/services/floorLayoutStorage";

const root = createRoot(document.getElementById("root"));

// The visual demo must render without a server or database. Enable this only
// when running the local editor with the SQLite API available.
const useLayoutDatabase = import.meta.env.VITE_USE_LAYOUT_DATABASE === "true";

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (useLayoutDatabase) {
  initializeFloorLayouts().catch(() => {
    console.warn("No se pudo sincronizar el plano; se usará la copia local.");
  });
}
