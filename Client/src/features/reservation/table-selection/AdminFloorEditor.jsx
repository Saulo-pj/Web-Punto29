import { FloorPlanBackground } from "./components/FloorPlanBackground";
import { useEffect, useState } from "react";
import { FIRST_FLOOR_TABLES } from "./config/firstFloor.config";
import { VENUE17_TABLES } from "./config/venue17.config";
import { TABLES } from "./config/tables.config";
import { clearFloorLayout, loadFloorLayout, saveFloorLayout } from "./services/floorLayoutStorage";
import "./table-selection.css";

const FLOOR_DATA = {
  venue17: { label: "Sede 17", viewBox: "80 30 452 710", tables: VENUE17_TABLES },
  first: {
    label: "Primer piso",
    viewBox: "170 0 370 765",
    tables: FIRST_FLOOR_TABLES,
    elements: [
      { id: "kitchen", label: "COCINA", x: 337, y: 210, width: 285, height: 416, fill: "#d9d9d9", rotation: -12, type: "area" },
      { id: "cashier", label: "CAJA", x: 328, y: 616, width: 36, height: 109, fill: "#d2ae66", rotation: -90, type: "area" },
      { id: "stairs", label: "ESCALERA", x: 330, y: 695, width: 59, height: 43, fill: "#7a1a00", rotation: 7, type: "area" },
      { id: "entrance", label: "ENTRADA", x: 424, y: 721, width: 92, height: 10, fill: "#d9d9d9", rotation: 3, type: "line" },
      { id: "tv", label: "TV", x: 351, y: 489, width: 20, height: 104, fill: "#6b6b6b", rotation: -16, type: "line" },
    ],
  },
  second: {
    label: "Segundo piso",
    viewBox: "0 0 632 884",
    tables: TABLES,
    elements: [
      { id: "events", label: "ZONA DE EVENTOS", x: 307, y: 70, width: 140, height: 54, fill: "#e5c77f", rotation: 0, type: "area" },
      { id: "women-bathroom", label: "BAÑO MUJERES", x: 530, y: 71, width: 142, height: 82, fill: "#666666", rotation: 0, type: "area" },
      { id: "men-bathroom", label: "BAÑO VARONES", x: 523, y: 160, width: 152, height: 95, fill: "#666666", rotation: 0, type: "area" },
      { id: "bar", label: "BARRA", x: 490, y: 340, width: 80, height: 190, fill: "#666666", rotation: 0, type: "area" },
      { id: "stairs", label: "ESCALERA", x: 377, y: 683, width: 50, height: 150, fill: "#666666", rotation: 0, type: "area" },
      { id: "tv", label: "TV", x: 398, y: 426, width: 20, height: 16, fill: "#333333", rotation: 0, type: "line" },
    ],
  },
};

export const AdminFloorEditor = () => {
  const [venue, setVenue] = useState("20");
  const [floor, setFloor] = useState("second");
  const [tables, setTables] = useState(() => loadFloorLayout("second", TABLES));
  const [selectedId, setSelectedId] = useState(TABLES[0].id);
  const [draggingId, setDraggingId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [clipboard, setClipboard] = useState(null);
  const data = FLOOR_DATA[floor];
  const [viewX, viewY, viewWidth, viewHeight] = data.viewBox.split(" ").map(Number);
  const zoomedWidth = viewWidth / zoom;
  const zoomedHeight = viewHeight / zoom;
  const viewBox = `${Math.max(viewX, Math.min(viewX + viewWidth - zoomedWidth, panX))} ${viewY} ${zoomedWidth} ${zoomedHeight}`;
  const selected = tables.find((table) => table.id === selectedId) || tables[0];
  const nextId = (prefix, items) => {
    const numbers = items.map((item) => Number(String(item.id).replace(prefix, ""))).filter(Number.isFinite);
    return `${prefix}${Math.max(0, ...numbers) + 1}`;
  };

  const switchFloor = (value) => {
    setFloor(value);
    setTables(loadFloorLayout(value, FLOOR_DATA[value].tables));
    setSelectedId(FLOOR_DATA[value].tables[0].id);
    setZoom(1);
    setPanX(0);
    setSaved(false);
  };

  const updateSelected = (key, value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return;
    setTables((current) => current.map((table) => (
      table.id === selected.id ? { ...table, [key]: numericValue } : table
    )));
    setSaved(false);
  };

  const selectTable = (table) => {
    setSelectedId(table.id);
  };

  const addTable = () => {
    const id = nextId(floor === "venue17" ? "M" : floor === "first" ? "P" : "N", tables);
    const table = {
      id,
      numero: Number(id.replace(/\D/g, "")),
      zona: floor === "first" ? "Primer piso" : "Interior",
      capacidad: 2,
      tipo: "standard",
      equivalenciaMesas: 1,
      x: Math.round(viewX + viewWidth / 2),
      y: Math.round(viewY + viewHeight / 2),
      rotacion: 0,
      ancho: 52,
      alto: 38,
      activa: true,
      unible: true,
      piso: floor,
    };
    setTables((current) => [...current, table]);
    selectTable(table);
    setSaved(false);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey) || !["c", "v"].includes(event.key.toLowerCase())) return;
      if (event.target.matches("input, textarea")) return;
      event.preventDefault();
      if (event.key.toLowerCase() === "c") {
        if (selected) setClipboard({ type: "table", item: selected });
        return;
      }
      if (!clipboard) return;
      const copy = { ...clipboard.item, id: `${clipboard.item.id}-c${Date.now()}`, x: clipboard.item.x + 20, y: clipboard.item.y + 20 };
      setTables((current) => [...current, copy]);
      setSelectedId(copy.id);
      setSaved(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clipboard, selected]);

  const getSvgPosition = (event) => {
    const svg = event.currentTarget.tagName === "svg"
      ? event.currentTarget
      : event.currentTarget.ownerSVGElement;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(svg.getScreenCTM().inverse());
  };

  const moveTable = (event, table) => {
    const transformed = getSvgPosition(event);
    setSelectedId(table.id);
    setDraggingId(table.id);
    setTables((current) => current.map((item) => (
      item.id === table.id ? { ...item, x: Math.round(transformed.x), y: Math.round(transformed.y) } : item
    )));
    setSaved(false);
  };

  const dragTable = (event) => {
    if (!draggingId) return;
    const transformed = getSvgPosition(event);
    setTables((current) => current.map((item) => (
      item.id === draggingId ? { ...item, x: Math.round(transformed.x), y: Math.round(transformed.y) } : item
    )));
    setSaved(false);
  };

  const persist = async () => {
    try {
      await saveFloorLayout(floor, tables);
      setSaved(true);
      setSaveError("");
    } catch {
      setSaved(false);
      setSaveError("No se pudieron guardar los cambios en la base de datos. Comprueba que el servidor est? iniciado.");
    }
  };

  const restore = async () => {
    try {
      await clearFloorLayout(floor);
      setTables(FLOOR_DATA[floor].tables);
      setSaved(false);
      setSaveError("");
    } catch {
      setSaveError("No se pudo restaurar el plano en la base de datos.");
    }
  };
  const handleWheel = (event) => {
    if (!event.ctrlKey && !event.altKey) return;
    event.preventDefault();
    if (event.ctrlKey) {
      setZoom((current) => Math.min(3, Math.max(1, current + (event.deltaY < 0 ? 0.1 : -0.1))));
    } else {
      setPanX((current) => Math.max(viewX, Math.min(viewX + viewWidth - zoomedWidth, current + event.deltaY)));
    }
  };


  return (
    <main className="admin-floor-editor">
      <header className="admin-floor-editor__header">
        <div><p>ADMINISTRACIÓN</p><h1>Editor de mesas</h1></div>
        <a href={`/reserva/mesa?sede=${venue}`}>Volver a reservas</a>
      </header>
      <div className="admin-floor-editor__toolbar">
        <label>Sede <select value={venue} onChange={(event) => { setVenue(event.target.value); switchFloor(event.target.value === "17" ? "venue17" : "second"); }}><option value="17">Sede 17</option><option value="20">Sede 20</option></select></label>
        {Object.entries(FLOOR_DATA).filter(([id]) => venue === "17" ? id === "venue17" : id !== "venue17").map(([id, value]) => (
          <button key={id} type="button" className={floor === id ? "is-selected" : ""} onClick={() => switchFloor(id)}>{value.label}</button>
        ))}
        {saved && <span role="status">Cambios guardados</span>}
        {saveError && <span role="alert">{saveError}</span>}
      </div>
      <div className="admin-floor-editor__workspace">
        <section className="admin-floor-editor__canvas">
          <p>Arrastra mesas y zonas hasta su posición real. Usa los botones o <b>Ctrl + rueda</b> para zoom y <b>Alt + rueda</b> para moverte horizontalmente.</p>
          <div className="admin-floor-editor__zoom-controls" aria-label="Controles de zoom">
            <button type="button" onClick={() => setZoom((current) => Math.min(3, current + 0.25))}>+</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((current) => Math.max(1, current - 0.25))}>−</button>
            <button type="button" onClick={() => { setZoom(1); setPanX(0); }}>Restablecer vista</button>
            <button type="button" onClick={addTable}>Agregar mesa</button>
          </div>
          <svg
            viewBox={viewBox}
            role="application"
            aria-label={`Editor del ${data.label}`}
            onWheel={handleWheel}
            onPointerMove={(event) => {
              dragTable(event);
            }}
            onPointerUp={() => {
              setDraggingId(null);
            }}
            onPointerLeave={() => {
              setDraggingId(null);
            }}
          >
            <FloorPlanBackground floor={floor} />
            {tables.map((table) => (
              <g
                key={table.id}
                className={`admin-floor-table ${selected.id === table.id ? "is-selected" : ""}`}
                transform={`translate(${table.x} ${table.y})`}
                onPointerDown={(event) => {
                  event.currentTarget.ownerSVGElement.setPointerCapture(event.pointerId);
                  moveTable(event, table);
                }}
                onClick={() => selectTable(table)}
                role="button"
                tabIndex="0"
                aria-label={`Editar mesa ${table.id}`}
              >
                <rect x={-table.ancho / 2} y={-table.alto / 2} width={table.ancho} height={table.alto} rx="8" transform={`rotate(${table.rotacion})`} />
                <text textAnchor="middle" dominantBaseline="middle">{table.piso === "first" ? table.numero : table.id}</text>
              </g>
            ))}
          </svg>
        </section>
        <aside className="admin-floor-editor__panel">
          <h2>Mesa {selected?.id}</h2>
          <label>X<input type="number" value={selected?.x || 0} onChange={(event) => updateSelected("x", event.target.value)} /></label>
          <label>Y<input type="number" value={selected?.y || 0} onChange={(event) => updateSelected("y", event.target.value)} /></label>
          <label>Rotación<input type="number" value={selected?.rotacion || 0} onChange={(event) => updateSelected("rotacion", event.target.value)} /></label>
          <label>Ancho<input type="number" value={selected?.ancho || 0} onChange={(event) => updateSelected("ancho", event.target.value)} /></label>
          <label>Alto<input type="number" value={selected?.alto || 0} onChange={(event) => updateSelected("alto", event.target.value)} /></label>
          <p className="admin-floor-editor__hint">Los cambios se guardan en la base de datos del proyecto y se aplican al selector de reservas.</p>
          <div className="admin-floor-editor__actions">
            <button type="button" onClick={persist}>Guardar cambios</button>
            <button type="button" onClick={restore}>Restaurar este piso</button>
          </div>
        </aside>
      </div>
    </main>
  );
};
