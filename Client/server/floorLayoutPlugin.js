import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export function openLayoutDatabase(filename) {
  mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec("CREATE TABLE IF NOT EXISTS floor_layouts (floor TEXT PRIMARY KEY, tables_json TEXT NOT NULL)");
  return db;
}

export function floorLayoutPlugin() {
  const filename = fileURLToPath(new URL("../data/floor-layouts.sqlite", import.meta.url));
  const install = (server) => {
    const db = openLayoutDatabase(filename);
    server.httpServer?.once("close", () => db.close());
    server.middlewares.use("/api/floor-layouts", async (req, res) => {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      const reply = (status, body) => { res.statusCode = status; res.end(JSON.stringify(body)); };
      try {
        if (req.method === "GET") {
          const rows = db.prepare("SELECT floor, tables_json FROM floor_layouts").all();
          return reply(200, Object.fromEntries(rows.map((row) => [row.floor, JSON.parse(row.tables_json)])));
        }
        if (req.method !== "PUT") return reply(405, { error: "Method not allowed" });
        // This editor is local. Do not expose unauthenticated writes to the network.
        if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress)) return reply(403, { error: "Local editor only" });
        if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return reply(403, { error: "Invalid origin" });
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 1000000) return reply(413, { error: "Layout too large" });
        }
        const { floor, tables, onlyIfMissing } = JSON.parse(body);
        if (!["first", "second", "venue17"].includes(floor) || !Array.isArray(tables) || !tables.length || tables.length > 500 ||
            tables.some((table) => typeof table.id !== "string" || ![table.x, table.y, table.rotacion, table.ancho, table.alto].every(Number.isFinite) || table.ancho <= 0 || table.alto <= 0) ||
            new Set(tables.map((table) => table.id)).size !== tables.length) return reply(400, { error: "Invalid layout" });
        const sql = onlyIfMissing
          ? "INSERT OR IGNORE INTO floor_layouts (floor, tables_json) VALUES (?, ?)"
          : "INSERT INTO floor_layouts (floor, tables_json) VALUES (?, ?) ON CONFLICT(floor) DO UPDATE SET tables_json=excluded.tables_json";
        db.prepare(sql).run(floor, JSON.stringify(tables));
        return reply(200, { saved: true });
      } catch {
        return reply(500, { error: "Could not save layout" });
      }
    });
  };
  return { name: "floor-layout-database", configureServer: install, configurePreviewServer: install };
}
