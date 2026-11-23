import { Buffer } from "node:buffer";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_SITE_CONTENT } from "../src/features/site-content/defaultSiteContent.js";

export function openLayoutDatabase(filename) {
  mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec("CREATE TABLE IF NOT EXISTS floor_layouts (floor TEXT PRIMARY KEY, tables_json TEXT NOT NULL)");
  db.exec("CREATE TABLE IF NOT EXISTS site_content (id INTEGER PRIMARY KEY CHECK (id = 1), content_json TEXT NOT NULL)");
  return db;
}

const isLocalRequest = (req) => ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress);

const isImageSource = (value) => typeof value === "string" && value.length <= 12_000_000 &&
  (!value || value.startsWith("/") || /^https?:\/\//i.test(value) || /^data:image\/(?:jpeg|png|webp|gif);base64,/i.test(value));
const isRequiredImage = (value) => typeof value === "string" && value.length > 0 && isImageSource(value);

const isText = (value) => typeof value === "string" && value.length <= 5000;
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const hasUniqueIds = (items) => items.every((item) => isRecord(item) && typeof item.id === "string" && item.id.length > 0) &&
  new Set(items.map((item) => item.id)).size === items.length;

export const isValidSiteContent = (content) => {
  if (!isRecord(content)) return false;
  const { general, recommendations, chefs, happyHour } = content;
  if (![general, recommendations, chefs, happyHour].every(isRecord)) return false;
  if (![
    "heroTitle", "heroSubtitle", "heroNotice", "aboutKicker", "aboutTitleFirst", "aboutTitleSecond",
    "aboutDescription", "aboutFollowup", "locationsEyebrow", "locationsTitle", "openingDays",
    "openingHours", "footerSchedule",
  ].every((key) => isText(general[key]))) return false;
  if (!isImageSource(general.heroImage) || !isRequiredImage(general.aboutImage)) return false;
  if (!isText(recommendations.kicker) || !isText(recommendations.title) ||
      !Array.isArray(recommendations.dishes) || recommendations.dishes.length < 1 ||
      recommendations.dishes.length > 30 || !hasUniqueIds(recommendations.dishes) ||
      recommendations.dishes.some((dish) => !isRecord(dish) || !isText(dish.name) || !isText(dish.description) ||
        !isText(dish.price) || !isText(dish.promotion) || !isRequiredImage(dish.image))) return false;
  if (!isText(chefs.kicker) || !isText(chefs.title) ||
      !Array.isArray(chefs.people) || chefs.people.length < 1 || chefs.people.length > 20 ||
      !hasUniqueIds(chefs.people) ||
      chefs.people.some((chef) => !isRecord(chef) || !isText(chef.name) || !isText(chef.specialty) ||
        !isText(chef.bio) || !isRequiredImage(chef.image))) return false;
  if (!Array.isArray(happyHour.slides) || happyHour.slides.length < 3 || happyHour.slides.length > 20 ||
      !hasUniqueIds(happyHour.slides) ||
      happyHour.slides.some((slide) => !isRecord(slide) || !isRequiredImage(slide.image) || !isText(slide.kicker) ||
        !isText(slide.title) || !isText(slide.emphasis) || !isText(slide.schedule) ||
        !isText(slide.description) || !Array.isArray(slide.offers) || slide.offers.length > 12 ||
        slide.offers.some((offer) => !isRecord(offer) || !isText(offer.price) || !isText(offer.details)))) return false;
  return true;
};

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
    server.middlewares.use("/api/site-content", async (req, res) => {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      const reply = (status, body) => { res.statusCode = status; res.end(JSON.stringify(body)); };
      try {
        if (req.method === "GET") {
          const row = db.prepare("SELECT content_json FROM site_content WHERE id = 1").get();
          return reply(200, row ? JSON.parse(row.content_json) : DEFAULT_SITE_CONTENT);
        }
        if (req.method !== "PUT") return reply(405, { error: "Method not allowed" });
        if (!isLocalRequest(req)) return reply(403, { error: "Para guardar, abre el administrador en esta computadora." });
        if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) {
          return reply(403, { error: "Origen no permitido." });
        }
        const chunks = [];
        let bodySize = 0;
        for await (const chunk of req) {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          bodySize += buffer.length;
          if (bodySize > 30_000_000) return reply(413, { error: "El contenido supera el límite permitido de 30 MB." });
          chunks.push(buffer);
        }
        const content = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (!isValidSiteContent(content)) return reply(400, { error: "El contenido está incompleto o tiene un formato no válido." });
        db.prepare("INSERT INTO site_content (id, content_json) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET content_json=excluded.content_json")
          .run(JSON.stringify(content));
        return reply(200, { saved: true });
      } catch (error) {
        if (error instanceof SyntaxError) return reply(400, { error: "El contenido enviado no es JSON válido." });
        return reply(500, { error: "No se pudo guardar el contenido en SQLite." });
      }
    });
  };
  return { name: "floor-layout-database", configureServer: install, configurePreviewServer: install };
}
