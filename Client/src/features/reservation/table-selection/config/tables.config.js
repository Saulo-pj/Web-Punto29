const makeTable = (id, numero, zona, x, y, extra = {}) => ({
  id,
  numero,
  zona,
  capacidad: extra.capacidad || 4,
  tipo: extra.tipo || "standard",
  equivalenciaMesas: extra.equivalenciaMesas || 1,
  x,
  y,
  rotacion: extra.rotacion || 0,
  ancho: extra.ancho || 58,
  alto: extra.alto || 38,
  activa: extra.activa !== false,
  unible: extra.unible !== false,
});

export const TABLES = [
  makeTable("I26", 26, "Interior", 198, 46, { tipo: "small", capacidad: 2, ancho: 36, alto: 36 }),
  makeTable("I25", 25, "Interior", 404, 46, { tipo: "small", capacidad: 2, ancho: 36, alto: 36 }),
  makeTable("I24", 24, "Interior", 241, 141, { tipo: "family", capacidad: 8, ancho: 106, alto: 38, rotacion: 21 }),
  makeTable("I23", 23, "Interior", 350, 181, { tipo: "family", capacidad: 8, ancho: 106, alto: 38, rotacion: 21 }),
  ...[
    ["I22", 199, 212], ["I21", 259, 235], ["I20", 320, 256], ["I19", 382, 277],
    ["I18", 172, 281], ["I17", 236, 297], ["I16", 301, 322], ["I15", 362, 345],
    ["I14", 150, 349], ["I13", 210, 372], ["I12", 282, 390], ["I11", 343, 405],
    ["I10", 134, 402], ["I9", 190, 432], ["I8", 246, 462], ["I7", 302, 492], ["I6", 358, 522],
    ["I5", 118, 472], ["I4", 170, 505], ["I3", 222, 538], ["I2", 274, 571], ["I1", 326, 604],
  ].map(([id, x, y]) => makeTable(id, Number(id.slice(1)), "Interior", x, y, { rotacion: 19 })),
  ...[
    ["B10", 148, 141, 17], ["B9", 127, 198, 17], ["B8", 106, 261, 17],
    ["B7", 85, 324, 17], ["B6", 64, 389, 17], ["B5", 56, 480, 0],
    ["B4", 77, 535, 30], ["B3", 138, 570, 30], ["B2", 204, 607, 30], ["B1", 270, 648, 30],
  ].map(([id, x, y, rotacion]) => makeTable(id, Number(id.slice(1)), "Balcón", x, y, { rotacion, ancho: rotacion === 30 ? 34 : 54, alto: rotacion === 30 ? 58 : 34 })),
  ...[
    ["T9", 463, 515], ["T1", 538, 509], ["T8", 459, 572], ["T2", 531, 566],
    ["T3", 527, 624], ["T7", 445, 663], ["T4", 522, 684], ["T6", 437, 721], ["T5", 517, 747],
  ].map(([id, x, y]) => makeTable(id, Number(id.slice(1)), "Terraza", x, y, { ancho: 48, alto: 34 })),
];

export const TABLE_BY_ID = Object.fromEntries(TABLES.map((table) => [table.id, table]));
