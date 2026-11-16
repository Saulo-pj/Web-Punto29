import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "vite";

test("first floor uses real capacities and contiguous rows", async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom" });
  try {
    const rules = await server.ssrLoadModule("/src/features/reservation/table-selection/domain/tableRules.js");
    const { FIRST_FLOOR_CONFIG: floor } = await server.ssrLoadModule("/src/features/reservation/table-selection/config/firstFloor.config.js");
    const complete = (ids, size) => rules.isSelectionComplete(ids, size, floor);
    assert(complete(["P1", "P2", "P3"], 8));
    assert(complete(["P2", "P3", "P4"], 8));
    assert(!complete(["P1", "P2"], 8));
    assert(!complete(["P7", "P6", "P5"], 8));
    assert(!complete(["P1", "P7", "P6", "P2"], 8));
    assert(complete(["P1", "P2"], 6));
    assert(complete(["P7", "P6", "P5"], 6));
    assert(!complete(["P1", "P3"], 6));
    assert(!complete(["P1", "P1"], 6));
    assert(!complete(["P1", "P2", "P3"], 9));
    assert.deepEqual(rules.getValidNextTables([], 8, [], floor), ["P1", "P2", "P3", "P4"]);
    assert.deepEqual(rules.getValidNextTables(["P1"], 8, [], floor), ["P2"]);
    assert.deepEqual(rules.getValidNextTables(["P1", "P2"], 8, [], floor), ["P3"]);
    assert.deepEqual(rules.getValidNextTables(["P1", "P2", "P3"], 8, [], floor), []);
    assert.deepEqual(rules.getValidNextTables([], 8, ["P2"], floor), []);
    assert.equal(rules.getRequiredTables(6, floor, ["P1"]).count, 2);
    assert.equal(rules.getRequiredTables(6, floor, ["P7"]).count, 3);
    const status = rules.getTableStatus({ table: floor.tables.find((t) => t.id === "P7"), partySize: 8, selection: [], reservedIds: [], validNextIds: rules.getValidNextTables([], 8, [], floor), floorConfig: floor });
    assert.equal(status.status, "distribution-blocked");
    for (let size = 1; size <= 8; size++) {
      for (const group of rules.getFirstFloorWindows(size, floor)) {
        assert(complete(group, size));
        assert.deepEqual(rules.getValidNextTables(group, size, [], floor), []);
      }
    }
    // Existing second-floor examples keep their original behavior.
    assert.equal(rules.getRequiredTables(8).count, 2);
    assert.equal(rules.getRequiredTables(12).count, 3);
    assert(rules.isSelectionComplete(["I23", "I24"], 16));
  } finally {
    await server.close();
  }
});
