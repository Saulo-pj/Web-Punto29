const makeFirstFloorTable = (id, x, y, capacidad, rotacion = 0) => ({
  id,
  numero: Number(id.slice(1)),
  zona: "Primer piso",
  capacidad,
  tipo: "standard",
  equivalenciaMesas: 1,
  x,
  y,
  rotacion,
  ancho: 52,
  alto: 38,
  activa: true,
  unible: true,
  piso: "first",
});

export const FIRST_FLOOR_TABLES = [
  makeFirstFloorTable("P1", 468, 408, 3, -8),
  makeFirstFloorTable("P2", 484, 493, 3, -8),
  makeFirstFloorTable("P3", 496, 591, 3, -8),
  makeFirstFloorTable("P4", 484, 688, 3, -8),
  makeFirstFloorTable("P5", 409, 665, 2, 0),
  makeFirstFloorTable("P6", 419, 574, 2, 0),
  makeFirstFloorTable("P7", 411, 471, 2, -8),
];

export const FIRST_FLOOR_LINES = [
  { direction: "V", tables: ["P1", "P2", "P3", "P4"] },
  { direction: "V", tables: ["P7", "P6", "P5"] },
];

export const FIRST_FLOOR_CONFIG = {
  id: "first",
  name: "Primer piso",
  tables: FIRST_FLOOR_TABLES,
  adjacencyLines: FIRST_FLOOR_LINES,
  maxPartySize: 8,
};
