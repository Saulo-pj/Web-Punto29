// Geometry from the supplied 13-table plan; rear capacities confirmed by the restaurant.
const RAW = [
  [9,148,131,104,51,4], [8,148,218,104,51,4], [7,148,305,104,51,4],
  [3,463,125,104,51,4], [2,463,211,104,51,4], [1,463,298,104,51,4],
  [6,305,181,45,46,2], [5,305,280,45,46,2], [4,276,383,103,51,2],
  [10,191,540,45,45,3], [11,276,540,45,45,3], [12,364,540,45,45,3], [13,400,624,45,46,3],
];

export const VENUE17_TABLES = RAW.map(([numero,x,y,ancho,alto,capacidad]) => ({
  id: `M${numero}`, numero, x, y, ancho, alto, capacidad, rotacion: 0,
  zona: numero >= 10 ? "Salón interior" : "Salón principal",
  tipo: "standard", activa: true, unible: true, equivalenciaMesas: 1, piso: "venue17",
}));

export const VENUE17_CONFIG = {
  id: "venue17", name: "Sede 17", tables: VENUE17_TABLES, maxPartySize: 16,
  groups: [
    { tables: ["M3", "M2", "M1", "M9", "M8", "M7"], maxPartySize: 16 },
    { tables: ["M10", "M11", "M12", "M13"], maxPartySize: 12 },
    { tables: ["M6", "M5"], maxPartySize: 4 },
    { tables: ["M4"], maxPartySize: 4 },
  ],
  adjacencyLines: [
    { direction: "V", tables: ["M3", "M2", "M1"], maxPartySize: 16 },
    { direction: "V", tables: ["M9", "M8", "M7"], maxPartySize: 16 },
    { direction: "V", tables: ["M6", "M5"], maxPartySize: 16 },
    { direction: "H", tables: ["M9", "M3"], maxPartySize: 16 },
    { direction: "H", tables: ["M8", "M2"], maxPartySize: 16 },
    { direction: "H", tables: ["M7", "M1"], maxPartySize: 16 },
    { direction: "H", tables: ["M10", "M11", "M12", "M13"], maxPartySize: 12 },
    { direction: "H", tables: ["M4"], maxPartySize: 16 },
    { direction: "H", tables: ["M13"], maxPartySize: 12 },
  ],
};
