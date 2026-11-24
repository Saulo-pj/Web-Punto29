import process from "node:process";
import crypto from "node:crypto";
import { config as loadEnv } from "dotenv";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { initializeVenueLayouts, layoutApi, cartaApi, layoutEvents } from "./venueModules.js";
import { Buffer } from "node:buffer";
import { initializePhase3 } from './phase3Schema.js';
import { phase3Api } from './phase3Api.js';
import { promoteTodayReservations, verifyArrival } from './phase3Service.js';

loadEnv();

const { Pool } = pg;
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
      max: 10,
    })
  : null;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

const schemas = `
CREATE TABLE IF NOT EXISTS admin_roles (
  id SERIAL PRIMARY KEY,
  nombre_rol VARCHAR(100) UNIQUE NOT NULL,
  permisos_json JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role_id INTEGER REFERENCES admin_roles(id),
  activo BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS sedes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  direccion TEXT,
  google_maps_url TEXT,
  imagen_url TEXT,
  tiene_carta_dia BOOLEAN NOT NULL DEFAULT TRUE,
  tiene_carta_noche BOOLEAN NOT NULL DEFAULT TRUE,
  tiene_carta_bar BOOLEAN NOT NULL DEFAULT TRUE,
  activa BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS sede_mesas_croquis (
  id SERIAL PRIMARY KEY,
  sede_id INTEGER NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
  piso INTEGER NOT NULL DEFAULT 1,
  numero_mesa VARCHAR(50),
  capacidad INTEGER NOT NULL DEFAULT 2,
  zona VARCHAR(100),
  pos_x DOUBLE PRECISION NOT NULL DEFAULT 50,
  pos_y DOUBLE PRECISION NOT NULL DEFAULT 50,
  forma VARCHAR(20) NOT NULL DEFAULT 'cuadrada',
  estado_actual VARCHAR(20) NOT NULL DEFAULT 'libre'
);
CREATE TABLE IF NOT EXISTS cortesias_cumpleanos (
  id SERIAL PRIMARY KEY,
  sede_id INTEGER NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
  turno VARCHAR(10) NOT NULL CHECK (turno IN ('dia','noche')),
  titulo_cortesia VARCHAR(200) NOT NULL,
  descripcion TEXT,
  imagen_url TEXT,
  activa BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS reservas (
  id SERIAL PRIMARY KEY,
  codigo_reserva VARCHAR(80) UNIQUE NOT NULL,
  sede_id INTEGER REFERENCES sedes(id),
  mesa_id INTEGER REFERENCES sede_mesas_croquis(id),
  fecha_reserva DATE,
  turno VARCHAR(30),
  hora_reserva VARCHAR(10),
  cantidad_personas INTEGER,
  cliente_nombre TEXT,
  cliente_telefono TEXT,
  cliente_email TEXT,
  motivo_reserva TEXT,
  es_cumpleanos BOOLEAN NOT NULL DEFAULT FALSE,
  cortesia_id INTEGER REFERENCES cortesias_cumpleanos(id),
  cumpleanero_nombre TEXT,
  cumpleanero_dni VARCHAR(8),
  cumpleanero_fecha_nac DATE,
  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
  verificada_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS configuracion_web (
  clave VARCHAR(150) PRIMARY KEY,
  valor TEXT
);
CREATE TABLE IF NOT EXISTS site_content (
  id INTEGER PRIMARY KEY,
  content_json JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS customer_reviews (
  id VARCHAR(100) PRIMARY KEY,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT NOT NULL,
  photo TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS verificada_at TIMESTAMPTZ;
ALTER TABLE sede_mesas_croquis ADD COLUMN IF NOT EXISTS layout_floor VARCHAR(30);
`;

const allPermissions = {
  Dashboard: true,
  "Usuarios y Permisos": true,
  "Sedes y Cartas": true,
  "Croquis de Mesas": true,
  "Reservas y Escáner QR": true,
  "Cortesías Cumpleaños": true,
  "Mesas en Vivo": true,
  "Lista de Espera": true,
  "Carta y Stock": true,
  "Reseñas y Galería": true,
};

async function initializePostgres() {
  if (!pool) throw new Error("DATABASE_URL no está configurado.");
  await pool.query(schemas);
  await pool.query(`
    INSERT INTO admin_roles (nombre_rol, permisos_json)
    VALUES ('Administrador General', $1::jsonb)
    ON CONFLICT (nombre_rol) DO UPDATE SET permisos_json = EXCLUDED.permisos_json
  `, [JSON.stringify(allPermissions)]);
  await pool.query(`
    INSERT INTO admin_users (username, password_hash, role_id, activo)
    VALUES ('admin', $1, (SELECT id FROM admin_roles WHERE nombre_rol = 'Administrador General'), TRUE)
    ON CONFLICT (username) DO NOTHING
  `, [await bcrypt.hash(".29", 12)]);
  await pool.query(`
    INSERT INTO sedes (id, nombre, direccion, google_maps_url, imagen_url, tiene_carta_dia, tiene_carta_noche, tiene_carta_bar, activa)
    VALUES
      (17, 'Sede 17', 'Av. San Hilarión Este 123, San Juan de Lurigancho 15434', 'https://maps.app.goo.gl/thu4yYCnAswdH9im8', '', TRUE, TRUE, TRUE, TRUE),
      (20, 'Sede 20', 'Av. Próceres de la Independencia, Alt. Paradero 20, San Juan de Lurigancho 15434', 'https://www.google.com/maps/place/Punto29-Sede20/@-11.9891152,-77.0106989,17z', '', TRUE, TRUE, TRUE, TRUE)
    ON CONFLICT (id) DO NOTHING
  `);
  await pool.query(`
    INSERT INTO configuracion_web (clave, valor)
    VALUES ('fondo_reservas_url', '')
    ON CONFLICT (clave) DO NOTHING
  `);
  await initializeVenueLayouts(pool);
  await initializePhase3(pool);
}

const venueColumns = `id,nombre,direccion,google_maps_url,
  CASE WHEN imagen_url LIKE 'data:image/%' THEN '/api/sedes/' || id || '/imagen' ELSE imagen_url END AS imagen_url,
  tiene_carta_dia,tiene_carta_noche,tiene_carta_bar,activa`;
let venuesCache = null;
async function readVenues() {
  if (venuesCache && venuesCache.expires > Date.now()) return venuesCache.rows;
  const result = await pool.query(`SELECT ${venueColumns} FROM sedes ORDER BY id`);
  venuesCache = { rows: result.rows, expires: Date.now() + 15000 };
  return result.rows;
}

const jsonReply = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
};

const readJson = async (req, limit = 30_000_000) => {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > limit) throw Object.assign(new Error("payload-too-large"), { status: 413 });
  }
  return body ? JSON.parse(body) : {};
};

const authToken = (req) => {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
};

const requireAuth = async (req) => {
  const token = authToken(req);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const result = await pool.query(`
      SELECT u.id, u.username, u.activo, r.nombre_rol, r.permisos_json
      FROM admin_users u JOIN admin_roles r ON r.id = u.role_id
      WHERE u.id = $1
    `, [payload.userId]);
    return result.rows[0] || null;
  } catch {
    return null;
  }
};

const hasPermission = (user, permission) => Boolean(user && (user.permisos_json?.[permission] ?? false));

const parsePermissionsJson = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};

async function handleAdminApi(req, res) {
  const method = req.method;
  if (method === "POST" && req.url === "/api/admin/login") {
    const body = await readJson(req);
    const result = await pool.query(`
      SELECT u.id, u.username, u.password_hash, u.activo, r.nombre_rol, r.permisos_json
      FROM admin_users u JOIN admin_roles r ON r.id = u.role_id
      WHERE u.username = $1
    `, [String(body.username || "").trim()]);
    const user = result.rows[0];
    if (!user || !user.activo || !(await bcrypt.compare(String(body.password || ""), user.password_hash))) {
      return jsonReply(res, 401, { error: "Usuario o contraseña incorrectos." });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "12h" });
    return jsonReply(res, 200, {
      token,
      user: { id: user.id, username: user.username, role: user.nombre_rol, permissions: parsePermissionsJson(user.permisos_json) },
    });
  }

  const user = await requireAuth(req);
  if (!user) return jsonReply(res, 401, { error: "Sesión expirada o no válida." });

  if (req.url === "/api/admin/me") return jsonReply(res, 200, { user });
  if (req.url === "/api/admin/roles") {
    if (method === "GET") {
      const result = await pool.query("SELECT id, nombre_rol, permisos_json FROM admin_roles ORDER BY id");
      return jsonReply(res, 200, result.rows.map((row) => ({ ...row, permisos_json: parsePermissionsJson(row.permisos_json) })));
    }
    if (method === "POST") {
      const body = await readJson(req);
      if (!hasPermission(user, "Usuarios y Permisos")) return jsonReply(res, 403, { error: "Sin permiso." });
      if (!String(body.nombre_rol || "").trim()) return jsonReply(res, 400, { error: "El nombre del perfil es obligatorio." });
      const result = await pool.query(
        "INSERT INTO admin_roles (nombre_rol, permisos_json) VALUES ($1, $2::jsonb) ON CONFLICT (nombre_rol) DO UPDATE SET permisos_json = EXCLUDED.permisos_json RETURNING id, nombre_rol, permisos_json",
        [body.nombre_rol, JSON.stringify(body.permisos_json || {})],
      );
      return jsonReply(res, 200, result.rows[0]);
    }
  }
  if (req.url === "/api/admin/users") {
    if (method === "GET") {
      const result = await pool.query(`
        SELECT u.id, u.username, u.activo, u.role_id, r.nombre_rol
        FROM admin_users u JOIN admin_roles r ON r.id=u.role_id ORDER BY u.id
      `);
      return jsonReply(res, 200, result.rows);
    }
    if (method === "POST") {
      if (!hasPermission(user, "Usuarios y Permisos")) return jsonReply(res, 403, { error: "Sin permiso." });
      const body = await readJson(req);
      if (!String(body.username || "").trim()) return jsonReply(res, 400, { error: "El usuario es obligatorio." });
      if (!body.role_id) return jsonReply(res, 400, { error: "Selecciona un perfil." });
      const existing = await pool.query("SELECT password_hash FROM admin_users WHERE username=$1", [body.username]);
      const passwordHash = body.password
        ? await bcrypt.hash(String(body.password), 12)
        : existing.rows[0]?.password_hash;
      if (!passwordHash) return jsonReply(res, 400, { error: "La contraseña es obligatoria para un usuario nuevo." });
      const result = await pool.query(`
        INSERT INTO admin_users (username, password_hash, role_id, activo)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (username) DO UPDATE SET password_hash=EXCLUDED.password_hash, role_id=EXCLUDED.role_id, activo=EXCLUDED.activo
        RETURNING id, username, role_id, activo
      `, [body.username, passwordHash, body.role_id, body.activo !== false]);
      return jsonReply(res, 200, result.rows[0]);
    }
  }

  if (req.url.startsWith("/api/admin/account")) {
    if (method === "PATCH") {
      const body = await readJson(req);
      let passwordHash;
      if (body.password) passwordHash = await bcrypt.hash(String(body.password), 12);
      await pool.query(
        "UPDATE admin_users SET username = COALESCE($1, username), password_hash = COALESCE($2, password_hash) WHERE id = $3",
        [body.username || null, passwordHash || null, user.id],
      );
      return jsonReply(res, 200, { saved: true });
    }
  }

  if (req.url === "/api/admin/sedes") {
    if (method === "GET") {
      return jsonReply(res, 200, await readVenues());
    }
    if (method === "POST" || method === "PUT") {
      if (!hasPermission(user, "Sedes y Cartas")) return jsonReply(res, 403, { error: "Sin permiso." });
      const body = await readJson(req);
      if (!String(body.nombre || "").trim()) return jsonReply(res, 400, { error: "El nombre de la sede es obligatorio." });
      let result;
      if (body.id) {
        result = await pool.query(`
          INSERT INTO sedes (id,nombre,direccion,google_maps_url,imagen_url,tiene_carta_dia,tiene_carta_noche,tiene_carta_bar,activa)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre,direccion=EXCLUDED.direccion,
            google_maps_url=EXCLUDED.google_maps_url,imagen_url=CASE WHEN EXCLUDED.imagen_url='/api/sedes/' || sedes.id || '/imagen' THEN sedes.imagen_url ELSE EXCLUDED.imagen_url END,
            tiene_carta_dia=EXCLUDED.tiene_carta_dia,tiene_carta_noche=EXCLUDED.tiene_carta_noche,
            tiene_carta_bar=EXCLUDED.tiene_carta_bar,activa=EXCLUDED.activa
          RETURNING *
        `, [body.id, body.nombre, body.direccion, body.google_maps_url, body.imagen_url,
          body.tiene_carta_dia !== false, body.tiene_carta_noche !== false, body.tiene_carta_bar !== false, body.activa !== false]);
      } else {
        result = await pool.query(`
          INSERT INTO sedes (nombre,direccion,google_maps_url,imagen_url,tiene_carta_dia,tiene_carta_noche,tiene_carta_bar,activa)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          RETURNING *
        `, [body.nombre, body.direccion, body.google_maps_url, body.imagen_url,
          body.tiene_carta_dia !== false, body.tiene_carta_noche !== false, body.tiene_carta_bar !== false, body.activa !== false]);
      }
      venuesCache = null;
      return jsonReply(res, 200, { ...result.rows[0], imagen_url: result.rows[0].imagen_url?.startsWith('data:image/') ? `/api/sedes/${result.rows[0].id}/imagen` : result.rows[0].imagen_url });
    }
  }

  if (req.url.startsWith('/api/admin/carta-productos?')) {
    if (!hasPermission(user, 'Sedes y Cartas')) return jsonReply(res, 403, { error: 'Sin permiso.' });
    return cartaApi(req, res, pool, jsonReply, readJson);
  }
  if (/^\/api\/admin\/sedes\/\d+\/cartas$/.test(req.url) && method === 'PATCH') {
    if (!hasPermission(user, 'Sedes y Cartas')) return jsonReply(res, 403, { error: 'Sin permiso.' });
    const body = await readJson(req);
    if (!['dia','noche','bar'].every(turno => typeof body[`tiene_carta_${turno}`] === 'boolean')) return jsonReply(res, 400, { error: 'Revisa las cartas.' });
    const result = await pool.query(`UPDATE sedes SET tiene_carta_dia=$1,tiene_carta_noche=$2,tiene_carta_bar=$3 WHERE id=$4 RETURNING ${venueColumns}`, [body.tiene_carta_dia,body.tiene_carta_noche,body.tiene_carta_bar,Number(req.url.split('/')[4])]);
    venuesCache = null;
    return jsonReply(res, result.rowCount ? 200 : 404, result.rows[0] || { error: 'Sede no encontrada.' });
  }

  if (req.url.startsWith("/api/admin/sedes/") && req.url.endsWith("/mesas")) {
    if (!hasPermission(user, "Croquis de Mesas") && !hasPermission(user, 'Sedes y Cartas') && !(method === 'GET' && hasPermission(user, 'Mesas en Vivo'))) return jsonReply(res, 403, { error: "Sin permiso." });
    const sedeId = Number(req.url.split("/")[4]);
    if (method === "GET") {
      const result = await pool.query("SELECT * FROM sede_mesas_croquis WHERE sede_id=$1 AND activa=TRUE ORDER BY piso, numero_mesa", [sedeId]);
      return jsonReply(res, 200, result.rows);
    }
    if (method === "PUT") {
      const body = await readJson(req);
      await pool.query("BEGIN");
      for (const table of body.tables || []) {
        await pool.query(`
          INSERT INTO sede_mesas_croquis (id,sede_id,piso,numero_mesa,capacidad,zona,pos_x,pos_y,forma,estado_actual)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          ON CONFLICT (id) DO UPDATE SET sede_id=EXCLUDED.sede_id,piso=EXCLUDED.piso,numero_mesa=EXCLUDED.numero_mesa,
            capacidad=EXCLUDED.capacidad,zona=EXCLUDED.zona,pos_x=EXCLUDED.pos_x,pos_y=EXCLUDED.pos_y,
            forma=EXCLUDED.forma,estado_actual=EXCLUDED.estado_actual
        `, [table.id || null, sedeId, table.piso || 1, table.numero_mesa || table.id, table.capacidad || 2,
          table.zona || "", table.pos_x ?? table.x ?? 50, table.pos_y ?? table.y ?? 50, table.forma || "cuadrada", table.estado_actual || "libre"]);
      }
      await pool.query("COMMIT");
      return jsonReply(res, 200, { saved: true });
    }
  }

  if (req.url === "/api/admin/cortesias") {
    if (method === "GET") {
      if (!hasPermission(user, "Cortesías Cumpleaños")) return jsonReply(res, 403, { error: "Sin permiso." });
      const result = await pool.query("SELECT * FROM cortesias_cumpleanos ORDER BY sede_id, turno");
      return jsonReply(res, 200, result.rows);
    }
    if (method === "POST") {
      if (!hasPermission(user, "Cortesías Cumpleaños")) return jsonReply(res, 403, { error: "Sin permiso." });
      const body = await readJson(req);
      const result = await pool.query(`
        INSERT INTO cortesias_cumpleanos (sede_id,turno,titulo_cortesia,descripcion,imagen_url,activa)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
      `, [body.sede_id, body.turno, body.titulo_cortesia, body.descripcion, body.imagen_url, body.activa !== false]);
      return jsonReply(res, 200, result.rows[0]);
    }
    if (method === "PUT") {
      if (!hasPermission(user, "Cortesías Cumpleaños")) return jsonReply(res, 403, { error: "Sin permiso." });
      const body = await readJson(req);
      const result = await pool.query(`
        INSERT INTO cortesias_cumpleanos (id,sede_id,turno,titulo_cortesia,descripcion,imagen_url,activa)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (id) DO UPDATE SET sede_id=EXCLUDED.sede_id,turno=EXCLUDED.turno,
          titulo_cortesia=EXCLUDED.titulo_cortesia,descripcion=EXCLUDED.descripcion,
          imagen_url=EXCLUDED.imagen_url,activa=EXCLUDED.activa
        RETURNING *
      `, [body.id, body.sede_id, body.turno, body.titulo_cortesia, body.descripcion, body.imagen_url, body.activa !== false]);
      return jsonReply(res, 200, result.rows[0]);
    }
  }

  if (req.url === "/api/admin/configuracion") {
    if (method === "GET") {
      const result = await pool.query("SELECT clave, valor FROM configuracion_web");
      return jsonReply(res, 200, Object.fromEntries(result.rows.map((row) => [row.clave, row.valor])));
    }
    if (method === "PUT") {
      if (!hasPermission(user, "Sedes y Cartas")) return jsonReply(res, 403, { error: "Sin permiso." });
      const body = await readJson(req);
      for (const [clave, valor] of Object.entries(body)) {
        await pool.query(`
          INSERT INTO configuracion_web (clave, valor) VALUES ($1,$2)
          ON CONFLICT (clave) DO UPDATE SET valor=EXCLUDED.valor
        `, [clave, String(valor || "")]);
      }
      return jsonReply(res, 200, { saved: true });
    }
  }

  if (req.url.startsWith("/api/admin/reservas")) {
    if (!hasPermission(user, "Reservas y Escáner QR")) return jsonReply(res, 403, { error: "Sin permiso." });
    if (method === "GET") {
      const code = new URL(req.url, "http://localhost").searchParams.get("codigo");
      const query = code
        ? "SELECT r.*, s.nombre sede_nombre FROM reservas r LEFT JOIN sedes s ON s.id=r.sede_id WHERE r.codigo_reserva=$1"
        : "SELECT r.*, s.nombre sede_nombre FROM reservas r LEFT JOIN sedes s ON s.id=r.sede_id ORDER BY r.created_at DESC";
      const result = await pool.query(query, code ? [code] : []);
      if (code && !result.rows.length) return jsonReply(res, 404, { error: "La reserva no existe." });
      return jsonReply(res, 200, code ? result.rows[0] : result.rows);
    }
    if (method === "PATCH") {
      const code = new URL(req.url, "http://localhost").searchParams.get("codigo");
      if (!code) return jsonReply(res, 400, { error: "Falta el código de reserva." });
      try { return jsonReply(res, 200, await verifyArrival(pool, code, user)); }
      catch (error) { if (error.status) return jsonReply(res,error.status,{error:error.message}); throw error; }

    }
  }
  return jsonReply(res, 404, { error: "Ruta no encontrada." });
}

export function postgresPlugin() {
  let initialization;
  const install = async (server) => {
    // Start once when installing the server, never from a request handler.
    if (pool) initialization ||= initializePostgres().then(() => null).catch(error => {
      console.error('No se pudo inicializar PostgreSQL:', error.message);
      return error;
    });
    let promoting=false;
    const promote=async()=>{if(promoting||!pool||await initialization)return;promoting=true;try{await promoteTodayReservations(pool);}catch(error){console.error('Sincronización de reservas:',error.message);}finally{promoting=false;}};
    void promote();
    const promotionTimer=setInterval(promote,60000);
    server.httpServer?.once('close',()=>clearInterval(promotionTimer));
    server.middlewares.use(async (req, res, next) => {
      try {
        if (!req.url?.startsWith("/api/")) return next();
        if (!pool) return jsonReply(res, 503, { error: "PostgreSQL no está configurado." });

        if (await initialization) return jsonReply(res, 503, { error: 'PostgreSQL no pudo inicializarse. Revisa la conexión y reinicia el servidor.' });
        if(await phase3Api(req,res,{pool,reply:jsonReply,readJson,requireAuth}))return;

        if (req.url === '/api/floor-layout-events' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
          const update = () => res.write('data: updated\n\n');
          res.write(': connected\n\n');
          layoutEvents.on('updated', update);
          const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25000);
          req.on('close', () => { clearInterval(heartbeat); layoutEvents.off('updated', update); });
          return;
        }

        if (req.url === '/api/floor-layouts') return await layoutApi(req, res, pool, jsonReply, readJson, async () => {
          const user = await requireAuth(req);
          return user?.activo && (hasPermission(user, 'Croquis de Mesas') || hasPermission(user, 'Sedes y Cartas'));
        });

        const imageMatch = /^\/api\/sedes\/(\d+)\/imagen$/.exec(req.url);
        if (imageMatch && req.method === 'GET') {
          const result = await pool.query('SELECT imagen_url FROM sedes WHERE id=$1', [Number(imageMatch[1])]);
          const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/s.exec(result.rows[0]?.imagen_url || '');
          if (!match) return jsonReply(res, 404, { error: 'Imagen no encontrada.' });
          res.setHeader('Content-Type', match[1]);
          res.setHeader('Cache-Control', 'public, max-age=60');
          return res.end(Buffer.from(match[2], 'base64'));
        }

        if (req.url === "/api/sedes") {
          if (req.method !== "GET") return jsonReply(res, 405, { error: "Method not allowed" });
          return jsonReply(res, 200, (await readVenues()).filter(sede => sede.activa));
        }

        if (req.url === "/api/site-content") {
          if (req.method === "GET") {
            const result = await pool.query("SELECT content_json FROM site_content WHERE id=1");
            return jsonReply(res, 200, result.rows[0]?.content_json || {});
          }
          if (req.method === "PUT") {
            const body = await readJson(req);
            await pool.query(`
              INSERT INTO site_content (id, content_json) VALUES (1,$1::jsonb)
              ON CONFLICT (id) DO UPDATE SET content_json=EXCLUDED.content_json
            `, [JSON.stringify(body)]);
            return jsonReply(res, 200, { saved: true });
          }
        }

        if (req.url === "/api/customer-reviews") {
          if (req.method === "GET") {
            const local = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket?.remoteAddress);
            const result = local
              ? await pool.query("SELECT * FROM customer_reviews ORDER BY created_at DESC")
              : await pool.query("SELECT * FROM customer_reviews WHERE status='approved' ORDER BY created_at DESC");
            return jsonReply(res, 200, result.rows.map((row) => ({
              id: row.id, name: row.name, rating: row.rating, comment: row.comment,
              photo: row.photo, status: row.status, createdAt: row.created_at,
            })));
          }
          if (req.method === "POST") {
            const body = await readJson(req);
            if (!body.name || !body.comment || !Number.isInteger(Number(body.rating))) {
              return jsonReply(res, 400, { error: "Revisa los datos de la reseña." });
            }
            const id = `review-${crypto.randomBytes(8).toString("hex")}`;
            await pool.query(`
              INSERT INTO customer_reviews (id,name,rating,comment,photo,status)
              VALUES ($1,$2,$3,$4,$5,'pending')
            `, [id, body.name.trim(), Number(body.rating), body.comment.trim(), body.photo || ""]);
            return jsonReply(res, 201, { saved: true, id });
          }
          if (["PATCH", "DELETE"].includes(req.method)) {
            const user = await requireAuth(req);
            if (!user) return jsonReply(res, 401, { error: "Sesión no válida." });
            const body = await readJson(req);
            if (req.method === "DELETE") {
              await pool.query("DELETE FROM customer_reviews WHERE id=$1", [body.id]);
            } else {
              await pool.query(`
                UPDATE customer_reviews SET name=COALESCE($1,name),rating=COALESCE($2,rating),
                  comment=COALESCE($3,comment),photo=COALESCE($4,photo),status=COALESCE($5,status)
                WHERE id=$6
              `, [body.name || null, body.rating || null, body.comment || null, body.photo || null, body.status || null, body.id]);
            }
            return jsonReply(res, 200, { saved: true });
          }
        }

        if (req.url === "/api/configuracion") {
          if (req.method !== "GET") return jsonReply(res, 405, { error: "Method not allowed" });
          const result = await pool.query("SELECT clave, valor FROM configuracion_web");
          return jsonReply(res, 200, Object.fromEntries(result.rows.map((row) => [row.clave, row.valor])));
        }

        if (req.url.startsWith("/api/cortesias")) {
          if (req.method !== "GET") return jsonReply(res, 405, { error: "Method not allowed" });
          const url = new URL(req.url, "http://localhost");
          const sedeId = Number(url.searchParams.get("sede_id"));
          const turno = url.searchParams.get("turno");
          const result = await pool.query(
            "SELECT * FROM cortesias_cumpleanos WHERE activa=TRUE AND sede_id=$1 AND turno=$2",
            [sedeId, turno],
          );
          return jsonReply(res, 200, result.rows);
        }

        if (req.url === "/api/reservas") {
          if (req.method !== "POST") return jsonReply(res, 405, { error: "Method not allowed" });
          const body = await readJson(req);
          const code = `P29-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
          const birthday = body.es_cumpleanos === true;
          if (Array.isArray(body.mesa_ids) && body.mesa_ids.length) {
            const mesaIds = body.mesa_ids
              .map((id) => Number(String(id).replace(/\D/g, "")))
              .filter(Number.isInteger);
            if (!mesaIds.length) return jsonReply(res, 400, { error: "Selecciona una mesa válida." });
            const conflict = await pool.query(`
              SELECT mesa_id FROM reservas
              WHERE sede_id=$1 AND fecha_reserva=$2::date AND turno=$3 AND hora_reserva=$4
                AND estado <> 'cancelada' AND mesa_id = ANY($5::int[])
            `, [body.sede_id, body.fecha_reserva, body.turno, body.hora_reserva, mesaIds]);
            if (conflict.rows.length) return jsonReply(res, 409, { error: "La mesa seleccionada ya fue reservada." });
          }
          if (birthday && (!/^\d{8}$/.test(body.cumpleanero_dni || "") || !body.cumpleanero_nombre || !body.cumpleanero_fecha_nac)) {
            return jsonReply(res, 400, { error: "Completa los datos del cumpleañero." });
          }
          const result = await pool.query(`
            INSERT INTO reservas (
              codigo_reserva,sede_id,mesa_id,fecha_reserva,turno,hora_reserva,cantidad_personas,
              cliente_nombre,cliente_telefono,cliente_email,motivo_reserva,es_cumpleanos,cortesia_id,
              cumpleanero_nombre,cumpleanero_dni,cumpleanero_fecha_nac,estado
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'pendiente')
            RETURNING *
          `, [
            code, body.sede_id, body.mesa_id || null, body.fecha_reserva || null, body.turno || null,
            body.hora_reserva || null, body.cantidad_personas || null, body.cliente_nombre || null,
            body.cliente_telefono || null, body.cliente_email || null, body.motivo_reserva || null,
            birthday, body.cortesia_id || null, body.cumpleanero_nombre || null,
            body.cumpleanero_dni || null, body.cumpleanero_fecha_nac || null,
          ]);
          return jsonReply(res, 201, result.rows[0]);
        }

        if (req.url.startsWith("/api/reservas/disponibilidad")) {
          if (req.method !== "GET") return jsonReply(res, 405, { error: "Method not allowed" });
          const url = new URL(req.url, "http://localhost");
          const sedeId = Number(url.searchParams.get("sede_id"));
          const fecha = url.searchParams.get("fecha_reserva");
          const turno = url.searchParams.get("turno");
          const hora = url.searchParams.get("hora_reserva");
          const result = await pool.query(`
            SELECT mesa_id::text AS mesa_id
            FROM reservas
            WHERE sede_id=$1 AND fecha_reserva=$2::date
              AND turno=$3 AND hora_reserva=$4
              AND estado <> 'cancelada'
              AND mesa_id IS NOT NULL
          `, [sedeId, fecha, turno, hora]);
          return jsonReply(res, 200, {
            tableIds: result.rows.map((row) => row.mesa_id),
          });
        }

        if (req.url.startsWith("/api/admin/")) return await handleAdminApi(req, res);
        return next();
      } catch (error) {
        if (error.status) return jsonReply(res, error.status, { error: "El cuerpo supera el límite permitido." });
        console.error(error);
        return jsonReply(res, 500, { error: "No se pudo conectar con PostgreSQL." });
      }
    });
  };

  return {
    name: "postgres-phase2",
    configureServer: install,
    configurePreviewServer: install,
  };
}
