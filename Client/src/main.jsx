import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { initializeFloorLayouts } from "./features/reservation/table-selection/services/floorLayoutStorage";

// The local editor's saved layout lives on this origin.
if (import.meta.env.DEV && window.location.hostname === "localhost") {
  const url = new URL(window.location.href);
  url.hostname = "127.0.0.1";
  window.location.replace(url.href);
} else {
  const start = async () => {
    let databaseError = false;
    try {
      await initializeFloorLayouts();
    } catch {
      databaseError = true;
    }
    createRoot(document.getElementById("root")).render(
      <StrictMode>
        {databaseError && <p role="alert">No se pudo conectar con la base de datos del plano. Se muestra la copia de este navegador; inicia el servidor y recarga para sincronizar.</p>}
        <App />
      </StrictMode>,
    );
  };
  start();
}
