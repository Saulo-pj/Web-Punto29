import { VENUE17_TABLES } from "../config/venue17.config";
import { TABLES } from "../config/tables.config";
import { FIRST_FLOOR_TABLES } from "../config/firstFloor.config";
const STORAGE_KEY = "punto29-floor-layout-v1";
const useLayoutDatabase = true;

export const getFloorLayoutSignature = (floor) => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return JSON.stringify({
      floor: saved[floor] || {},
      tables: saved[`${floor}-tables`] || [],
    });
  } catch {
    return "";
  }
};

export const loadFloorLayout = (floor, fallbackTables) => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const positions = saved[floor] || {};
    const storedTables = Array.isArray(saved[`${floor}-tables`]) ? saved[`${floor}-tables`] : [];
    if (Array.isArray(saved[`${floor}-tables`])) return storedTables;
    const baseTables = fallbackTables.map((table) => ({
      ...table,
      ...(positions[table.id] || {}),
    }));
    return [...baseTables, ...storedTables.filter((table) => !baseTables.some((base) => base.id === table.id))];
  } catch {
    return fallbackTables;
  }
};

export const saveFloorLayout = async (floor, tables) => {
  if (useLayoutDatabase) await writeDatabase(floor, tables);
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  saved[floor] = Object.fromEntries(tables.map((table) => [
    table.id,
    { x: table.x, y: table.y, rotacion: table.rotacion, ancho: table.ancho, alto: table.alto },
  ]));
  saved[`${floor}-tables`] = tables;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  window.dispatchEvent(new Event("punto29-floor-layout-updated"));
};

export const clearFloorLayout = async (floor) => {
  if (useLayoutDatabase) {
    await writeDatabase(floor, floor === "venue17" ? VENUE17_TABLES : floor === "first" ? FIRST_FLOOR_TABLES : TABLES);
  }
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  delete saved[floor];
  delete saved[`${floor}-tables`];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  window.dispatchEvent(new Event("punto29-floor-layout-updated"));
};

export const loadStaticLayout = (floor, fallbackElements) => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const elements = saved[`${floor}-static`] || {};
    return fallbackElements.map((element) => ({ ...element, ...(elements[element.id] || {}) }));
  } catch {
    return fallbackElements;
  }
};

export const saveStaticLayout = (floor, elements) => {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  saved[`${floor}-static`] = Object.fromEntries(elements.map((element) => [
    element.id,
    {
      x: element.x,
      y: element.y,
      fill: element.fill,
      label: element.label,
      width: element.width,
      height: element.height,
      rotation: element.rotation || 0,
    },
  ]));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  window.dispatchEvent(new Event("punto29-floor-layout-updated"));
};

export const clearStaticLayout = (floor) => {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  delete saved[`${floor}-static`];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  window.dispatchEvent(new Event("punto29-floor-layout-updated"));
};

export const subscribeFloorLayout = (onChange) => {
  const onStorage = (event) => {
    if (!event.key || event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("punto29-floor-layout-updated", onChange);
  window.addEventListener("pageshow", onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("punto29-floor-layout-updated", onChange);
    window.removeEventListener("pageshow", onChange);
  };
};

const writeDatabase = async (floor, tables, onlyIfMissing = false) => {
  const response = await fetch("/api/floor-layouts", {
    method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${JSON.parse(localStorage.getItem("punto29-admin-session") || "null")?.token || ""}` },
    body: JSON.stringify({ floor, tables, onlyIfMissing }),
  });
  if (!response.ok) { const error = await response.json(); throw new Error(error.error || "No se pudo guardar el plano en la base de datos."); }
};

export const initializeFloorLayouts = async () => {
  const response = await fetch("/api/floor-layouts", { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo cargar el croquis desde PostgreSQL.");
  const normalizedLayouts = await response.json();
  let saved;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { saved = {}; }
  for (const [floor, tables] of Object.entries(normalizedLayouts)) {
    saved[`${floor}-tables`] = tables;
    saved[floor] = Object.fromEntries(tables.map((table) => [table.id, table]));
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  window.dispatchEvent(new Event("punto29-floor-layout-updated"));
};
