import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "vite";

test("venue 17 respects individual table capacities", async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom" });
  try {
    const rules = await server.ssrLoadModule("/src/features/reservation/table-selection/domain/tableRules.js");
    const { VENUE17_CONFIG: floor } = await server.ssrLoadModule("/src/features/reservation/table-selection/config/venue17.config.js");
    const capacity = Object.fromEntries(floor.tables.map((table) => [table.id, table.capacidad]));

    assert.equal(capacity.M4, 2);
    assert.equal(capacity.M6, 2);
    assert.equal(capacity.M5, 2);
    assert.equal(capacity.M10, 3);
    assert.equal(capacity.M11, 3);
    assert.equal(capacity.M12, 3);
    assert.equal(capacity.M13, 3);

    assert(!rules.getFirstFloorWindows(4, floor).some((window) => window.length === 1 && window[0] === "M4"));
    assert(!rules.getFirstFloorWindows(4, floor).some((window) => window.length === 1 && ["M5", "M6"].includes(window[0])));
    assert(!rules.getFirstFloorWindows(4, floor).some((window) => window.length === 1 && ["M10", "M11", "M12", "M13"].includes(window[0])));
    assert(rules.getFirstFloorWindows(4, floor).some((window) => window.length === 2 && window.includes("M4") === false && ["M5", "M6"].every((id) => window.includes(id))));
    assert(rules.getFirstFloorWindows(4, floor).some((window) => window.length === 2 && ["M10", "M11"].every((id) => window.includes(id))));
  } finally {
    await server.close();
  }
});
