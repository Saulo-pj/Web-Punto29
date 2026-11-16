const interiorRows = [
  ["I22", "I21", "I20", "I19"],
  ["I18", "I17", "I16", "I15"],
  ["I14", "I13", "I12", "I11"],
  ["I10", "I9", "I8", "I7", "I6"],
  ["I5", "I4", "I3", "I2", "I1"],
];

const interiorColumns = [
  ["I22", "I18", "I14", "I10", "I5"],
  ["I21", "I17", "I13", "I9", "I4"],
  ["I20", "I16", "I12", "I8", "I3"],
  ["I19", "I15", "I11", "I7", "I2"],
  ["I6", "I1"],
];

export const ADJACENCY_LINES = [
  ...interiorRows.map((tables) => ({ direction: "H", tables })),
  ...interiorColumns.map((tables) => ({ direction: "V", tables })),
  { direction: "V", tables: ["B10", "B9", "B8", "B7", "B6", "B5", "B4", "B3", "B2", "B1"] },
  { direction: "H", tables: ["T1", "T2", "T3", "T4", "T5"] },
  { direction: "H", tables: ["T9", "T1"] },
  { direction: "H", tables: ["T8", "T2"] },
  { direction: "V", tables: ["T9", "T8"] },
  { direction: "V", tables: ["T7", "T6"] },
];

export const SPECIAL_CONFIGURATIONS = [
  { id: "U", name: "Distribución en U", capacity: 24, description: "Mesas y espacio central para grupos grandes." },
  { id: "GRUPAL", name: "Mesa grupal central", capacity: 24, description: "Una mesa larga para compartir sin separaciones." },
];

export const FAMILY_HALVES = {
  I23: ["I23a", "I23b"],
  I24: ["I24a", "I24b"],
};
