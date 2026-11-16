import { ADJACENCY_LINES, FAMILY_HALVES } from "../config/layout.config";
import { TABLE_BY_ID, TABLES } from "../config/tables.config";
import { TABLE_SELECTION_RULES } from "../config/rules.config";

const areVenue17Neighbors = (a, b, config) => config.adjacencyLines.some((line) => {
  const index = line.tables.indexOf(a);
  return index >= 0 && Math.abs(index - line.tables.indexOf(b)) === 1 && line.tables.includes(b);
});

const isVenue17Connected = (ids, config) => {
  const visited = new Set([ids[0]]);
  const pending = [ids[0]];
  while (pending.length) {
    const current = pending.pop();
    for (const id of ids) {
      if (!visited.has(id) && areVenue17Neighbors(current, id, config)) {
        visited.add(id);
        pending.push(id);
      }
    }
  }
  return visited.size === ids.length;
};

const getVenue17Groups = (partySize, config, reservedIds) => {
  const byId = Object.fromEntries(config.tables.map((table) => [table.id, table]));
  return config.groups.filter((group) => partySize <= group.maxPartySize).flatMap((group) => {
    const options = [];
    for (let mask = 1; mask < 2 ** group.tables.length; mask++) {
      const ids = group.tables.filter((_, index) => mask & (1 << index));
      if (ids.some((id) => !byId[id]?.activa || reservedIds.includes(id) || (ids.length > 1 && !byId[id].unible))) continue;
      const capacity = ids.reduce((sum, id) => sum + byId[id].capacidad, 0);
      if (capacity < partySize || !isVenue17Connected(ids, config)) continue;
      if (ids.some((id) => capacity - byId[id].capacidad >= partySize)) continue;
      options.push(ids);
    }
    return options;
  });
};

export const getFirstFloorWindows = (partySize, floorConfig, reservedIds = []) => {
  if (partySize < 1 || partySize > floorConfig.maxPartySize) return [];
  if (floorConfig.id === "venue17") return getVenue17Groups(partySize, floorConfig, reservedIds);
  const byId = Object.fromEntries(floorConfig.tables.map((table) => [table.id, table]));
  const windows = [];
  for (const line of floorConfig.adjacencyLines) {
    for (let start = 0; start < line.tables.length; start++) {
      let capacity = 0;
      for (let end = start; end < line.tables.length; end++) {
        const table = byId[line.tables[end]];
        if (!table?.activa || reservedIds.includes(table.id)) break;
        if (end > start && (!table.unible || !byId[line.tables[start]].unible)) break;
        capacity += table.capacidad;
        if (capacity >= partySize) {
          // Keep only contiguous groups that actually need every table.
          if (end === start || capacity - byId[line.tables[start]].capacidad < partySize) {
            windows.push(line.tables.slice(start, end + 1));
          }
          break;
        }
        if (!table.unible) break;
      }
    }
  }
  return windows;
};

export const getRequiredTables = (partySize, floorConfig = null, selection = [], reservedIds = []) => {
  if (["first", "venue17"].includes(floorConfig?.id)) {
    const options = getFirstFloorWindows(partySize, floorConfig, reservedIds)
      .filter((window) => selection.every((id) => window.includes(id)));
    const counts = options.map((window) => window.length);
    const count = counts.length ? Math.min(...counts) : 0;
    const maxCount = counts.length ? Math.max(...counts) : 0;
    return { mode: maxCount > 1 ? "multiple" : "single", count, maxCount, capacity: partySize };
  }
  if (partySize <= 4) return { mode: "single", count: 1, capacity: 4 };
  if (partySize <= 8) return { mode: "multiple", count: 2, capacity: 8 };
  if (partySize <= 12) return { mode: "multiple", count: 3, capacity: 12 };
  if (partySize <= 16) return { mode: "multiple", count: 4, capacity: 16 };
  if (partySize <= 20) return { mode: "multiple", count: 5, capacity: 20 };
  if (partySize <= 24) return { mode: "special", count: 0, capacity: 24 };
  return { mode: "contact", count: 0, capacity: 0 };
};

export const getTableCapacity = (tableId) => {
  const parentId = tableId.replace(/[ab]$/, "");
  return tableId.match(/[ab]$/) ? 4 : TABLE_BY_ID[parentId]?.capacidad || 0;
};

export const canTableAcceptParty = (table, partySize) =>
  table.activa &&
  (table.tipo !== "small" || partySize <= 2) &&
  (table.tipo !== "family"
    ? table.capacidad >= Math.min(partySize, 4)
    : partySize >= 5 || TABLE_SELECTION_RULES.familyTablesForSmallParties);

export const getAdjacentTables = (tableId, direction) =>
  ADJACENCY_LINES.flatMap((line) => {
    if (direction && line.direction !== direction) return [];
    const index = line.tables.indexOf(tableId);
    return index < 0
      ? []
      : [line.tables[index - 1], line.tables[index + 1]].filter(Boolean);
  });

export const getValidWindows = (count, reservedIds = [], partySize = count * 4, tables = TABLES, adjacencyLines = ADJACENCY_LINES) => {
  const reserved = new Set(reservedIds);
  const tableById = Object.fromEntries(tables.map((table) => [table.id, table]));
  return adjacencyLines.filter((line) => line.tables.length >= count)
    .flatMap((line) =>
      line.tables.slice(0, line.tables.length - count + 1).map((_, index) => line.tables.slice(index, index + count)),
    )
    .filter((window) => window.every((id) => !reserved.has(id)))
    .filter((window) => window.every((id) => canTableAcceptParty(tableById[id], count === 1 ? partySize : 2)))
    .filter((window) => window.reduce((sum, id) => sum + tableById[id].capacidad, 0) >= partySize)
    .filter((window) => {
      const zone = tableById[window[0]]?.zona?.[0];
      return !TABLE_SELECTION_RULES.maxTablesByZone[zone] || window.length <= TABLE_SELECTION_RULES.maxTablesByZone[zone];
    })
    .filter((window) => !window.some((id) => TABLE_SELECTION_RULES.blockedForLargeGroups.includes(id)));
};

export const getSelectionOrientation = (selection, adjacencyLines = ADJACENCY_LINES) => {
  if (selection.length < 2) return null;
  return adjacencyLines.find((line) => selection.every((id) => line.tables.includes(id)))?.direction || null;
};

export const getValidNextTables = (selection, partySize, reservedIds = [], floorConfig = null) => {
  if (["first", "venue17"].includes(floorConfig?.id)) {
    if (isSelectionComplete(selection, partySize, floorConfig)) return [];
    const windows = getFirstFloorWindows(partySize, floorConfig, reservedIds)
      .filter((window) => selection.every((id) => window.includes(id)));
    return [...new Set(windows.flat())].filter((id) => !selection.includes(id) && (
      !selection.length || (floorConfig.id === "venue17" && selection.some((selected) => areVenue17Neighbors(selected, id, floorConfig))) || (floorConfig.id !== "venue17" && floorConfig.adjacencyLines.some((line) => {
        const indices = [...selection, id].map((selected) => line.tables.indexOf(selected)).sort((a, b) => a - b);
        return indices[0] >= 0 && indices.every((index, position) => !position || index === indices[position - 1] + 1);
      }))
    ));
  }
  const tables = floorConfig?.tables || TABLES;
  const adjacencyLines = floorConfig?.adjacencyLines || ADJACENCY_LINES;
  const required = getRequiredTables(partySize, floorConfig);
  if (!selection.length) {
    if (required.count === 1) return tables.filter((table) => canTableAcceptParty(table, partySize)).map((table) => table.id);
    return [...new Set(getValidWindows(required.count, reservedIds, partySize, tables, adjacencyLines).flat())];
  }
  const direction = getSelectionOrientation(selection, adjacencyLines);
  const candidates = new Set(adjacencyLines.flatMap((line) => {
    if (direction && line.direction !== direction) return [];
    return selection.flatMap((id) => {
      const index = line.tables.indexOf(id);
      return index < 0 ? [] : [line.tables[index - 1], line.tables[index + 1]].filter(Boolean);
    });
  }));
  return [...candidates].filter((id) => !selection.includes(id)).filter((id) =>
    getValidWindows(required.count, reservedIds, partySize, tables, adjacencyLines).some((window) => selection.every((selected) => window.includes(selected)) && window.includes(id)),
  );
};

export const isSelectionComplete = (selection, partySize, floorConfig = null) => {
  const required = getRequiredTables(partySize, floorConfig);
  if (["first", "venue17"].includes(floorConfig?.id)) {
    return new Set(selection).size === selection.length && getFirstFloorWindows(partySize, floorConfig)
      .some((window) => window.length === selection.length && window.every((id) => selection.includes(id)));
  }
  if (required.mode === "single") return selection.length === 1;
  if (partySize >= 9 && partySize <= 12) {
    return selection.length === 3 || (selection.length === 2 && selection.some((id) => /[ab]$/.test(id)));
  }
  if (partySize >= 13 && partySize <= 16 && selection.length === 2 && selection.every((id) => ["I23", "I24"].includes(id))) return true;
  if (required.mode === "multiple") return selection.length === required.count;
  return false;
};

export const splitFamilyTable = (tableId) => FAMILY_HALVES[tableId] || [];

export const getLargeGroupOptions = (partySize) => {
  if (partySize < 21 || partySize > 24) return [];
  return ["U", "GRUPAL"];
};

export const getTableStatus = ({ table, partySize, selection, reservedIds, validNextIds, floorConfig = null }) => {
  if (!table.activa) return { status: "inactive", reason: "No disponible temporalmente" };
  if (reservedIds.includes(table.id)) return { status: "reserved", reason: "Ocupada en este horario" };
  if (["first", "venue17"].includes(floorConfig?.id)) {
    if (selection.includes(table.id)) return { status: "selected", reason: "Seleccionada" };
    return validNextIds.includes(table.id)
      ? { status: "available", reason: "Disponible" }
      : { status: "distribution-blocked", reason: "No forma un grupo de mesas contiguas con capacidad suficiente" };
  }
  const capacityCheckSize = ["first", "venue17"].includes(floorConfig?.id) ? Math.min(partySize, 2) : partySize;
  if (!canTableAcceptParty(table, capacityCheckSize)) return { status: "capacity-blocked", reason: "No tiene capacidad para tu grupo" };
  if (partySize >= 9 && table.zona === "Balcón") return { status: "distribution-blocked", reason: "El balcón admite hasta dos mesas juntas" };
  if (TABLE_SELECTION_RULES.blockedForLargeGroups.includes(table.id)) return { status: "distribution-blocked", reason: "No disponible para grupos grandes" };
  if (selection.includes(table.id)) return { status: "selected", reason: "Seleccionada" };
  if (!selection.length && partySize >= 5 && partySize <= 16 && table.tipo === "family") return { status: "available", reason: "Disponible" };
  if (selection.length === 1 && partySize >= 13 && partySize <= 16 && table.tipo === "family" && !selection.includes(table.id)) return { status: "available", reason: "Disponible" };
  if (selection.length && !validNextIds.includes(table.id)) return { status: "inactive", reason: "No forma una línea válida" };
  return { status: "available", reason: "Disponible" };
};
