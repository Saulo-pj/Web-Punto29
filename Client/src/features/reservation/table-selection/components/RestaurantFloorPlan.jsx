import { FloorPlanBackground } from "./FloorPlanBackground";
import { memo, useCallback, useState } from "react";
import { TABLES } from "../config/tables.config";

const Table = memo(({ table, status, onSelect, splitFamily, selection, reservedIds }) => {
  const handleKeyDown = useCallback((event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(table.id);
    }
  }, [onSelect, table.id]);

  if (splitFamily) {
    const halves = [`${table.id}a`, `${table.id}b`];
    const parentReserved = reservedIds.includes(table.id);
    return (
      <g transform={`translate(${table.x} ${table.y}) rotate(${table.rotacion})`}>
        {halves.map((half, index) => {
          const halfSelected = selection.includes(half);
          const halfStatus = parentReserved
            ? { status: "reserved", reason: "Ocupada en este horario" }
            : halfSelected
              ? { status: "selected", reason: "Seleccionada" }
              : { status: "available", reason: "Disponible" };
          const label = `Media mesa ${half}, Interior, ${halfStatus.reason.toLowerCase()}, capacidad 4 personas`;
          return (
            <g
              key={half}
              data-table={half}
              data-status={halfStatus.status}
              className="floor-table floor-table--family-half"
              role="button"
              tabIndex={halfStatus.status === "reserved" ? -1 : 0}
              aria-label={label}
              aria-disabled={halfStatus.status === "reserved"}
              onClick={() => onSelect(half)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(half);
                }
              }}
            >
              <rect
                className="floor-table__shape"
                x={index === 0 ? -table.ancho / 2 : 0}
                y={-table.alto / 2}
                width={table.ancho / 2}
                height={table.alto}
                rx="10"

              />
              <text className="floor-table__label" x={index === 0 ? -table.ancho / 4 : table.ancho / 4} y="0" textAnchor="middle" dominantBaseline="middle">
                {half}
              </text>
              {halfSelected && <text className="floor-table__check" x={index === 0 ? -5 : table.ancho / 2 - 5} y="-8">✓</text>}
            </g>
          );
        })}
      </g>
    );
  }

  const displayId = table.piso === "first" ? table.numero : table.id;
  const label = `Mesa ${displayId}, ${table.zona}, ${status.reason.toLowerCase()}, capacidad ${table.capacidad} personas`;
  return (
    <g
      data-table={table.id}
      data-status={status.status}
      className="floor-table"
      role="button"
      tabIndex={status.status === "reserved" ? -1 : 0}
      aria-label={label}
      aria-disabled={status.status === "reserved" || status.status === "inactive" || status.status === "capacity-blocked" || status.status === "distribution-blocked"}
      onClick={() => onSelect(table.id)}
      onKeyDown={handleKeyDown}
      transform={`translate(${table.x} ${table.y})`}
    >
      <rect className="floor-table__shape" x={-table.ancho / 2} y={-table.alto / 2} width={table.ancho} height={table.alto} rx="8" transform={`rotate(${table.rotacion})`} />
      {table.tipo === "family" && <title>Mesa familiar {table.id}, capacidad 8 personas</title>}
      {status.status === "selected" && <text className="floor-table__check" x={Math.min(table.ancho / 2, 22) - 2} y={-Math.min(table.alto / 2, 16) + 3}>✓</text>}
      <text className="floor-table__label" y={table.tipo === "family" ? -3 : 0} textAnchor="middle" dominantBaseline="middle">
        {displayId}
      </text>
    </g>
  );
});

export const RestaurantFloorPlan = ({ statuses, onSelect, partySize, selection = [], reservedIds = [], floorConfig = null, tables = TABLES }) => {
  const [showWholeFloor, setShowWholeFloor] = useState(false);
  const [showWholeSecondFloor, setShowWholeSecondFloor] = useState(false);
  if (floorConfig?.id === "venue17") {
    return (
      <div className="table-selection__map-wrap table-selection__map-wrap--venue17">
        <svg className="restaurant-floor-plan restaurant-floor-plan--venue17" viewBox="80 30 452 710" role="group" aria-label="Plano de la sede 17">
          <FloorPlanBackground floor="venue17" />
          {tables.map((table) => <Table key={table.id} table={table} status={statuses[table.id]} onSelect={onSelect} selection={selection} reservedIds={reservedIds} />)}
        </svg>
      </div>
    );
  }
  if (floorConfig?.id === "first") {
    return (
      <div className="table-selection__map-wrap">
        <button type="button" className="floor-plan-view-toggle" onClick={() => setShowWholeFloor((value) => !value)}>
          {showWholeFloor ? "Ver zona de mesas" : "Ver plano completo"}
        </button>
        <svg className="restaurant-floor-plan restaurant-floor-plan--first" viewBox={showWholeFloor ? "170 0 370 765" : "275 350 270 410"} role="img" aria-label="Croquis interactivo del primer piso">
          <FloorPlanBackground floor="first" />
          {tables.map((table) => (
            <Table key={table.id} table={table} status={statuses[table.id]} onSelect={onSelect} selection={selection} reservedIds={reservedIds} />
          ))}
        </svg>
      </div>
    );
  }

  const selectedFamily = selection.length === 1 && ["I23", "I24"].includes(selection[0]);
  const selectedHalf = selection.find((id) => /^(I23|I24)[ab]$/.test(id));
  const splitFamilyId = partySize >= 9 && partySize <= 12
    ? selectedHalf
      ? selectedHalf.slice(0, 3)
      : selectedFamily
        ? (selection[0] === "I23" ? "I24" : "I23")
        : null
    : null;

  return (
  <>
  <button type="button" className="floor-plan-view-toggle" aria-pressed={showWholeSecondFloor} onClick={() => setShowWholeSecondFloor((value) => !value)}>
    {showWholeSecondFloor ? "Ampliar mapa" : "Ver todo el mapa"}
  </button>
  <div key={showWholeSecondFloor ? "full" : "detail"} className={`table-selection__map-wrap table-selection__map-wrap--second${showWholeSecondFloor ? " is-full-map" : ""}`} tabIndex={0} role="region" aria-label={showWholeSecondFloor ? "Mapa completo del segundo piso" : "Mapa del segundo piso: desplázate horizontal y verticalmente para ver todas las mesas"}>
    <svg className="restaurant-floor-plan restaurant-floor-plan--second" viewBox="0 0 632 884" role="img" aria-label="Croquis interactivo del restaurante Punto 29">
      <FloorPlanBackground floor="second" />
      {tables.map((table) => (
        <Table
          key={table.id}
          table={table}
          status={statuses[table.id]}
          onSelect={onSelect}
          splitFamily={table.id === splitFamilyId}
          selection={selection}
          reservedIds={reservedIds}
        />
      ))}
    </svg>
  </div>
  </>
  );
};
