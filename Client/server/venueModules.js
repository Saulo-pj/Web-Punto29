import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { FIRST_FLOOR_TABLES } from "../src/features/reservation/table-selection/config/firstFloor.config.js";
import { TABLES } from "../src/features/reservation/table-selection/config/tables.config.js";
import { VENUE17_TABLES } from "../src/features/reservation/table-selection/config/venue17.config.js";
import { EventEmitter } from 'node:events';
import { operationEvents, transaction } from './phase3Service.js';
export const layoutEvents = new EventEmitter();
layoutEvents.setMaxListeners(0);

export const venueSchema = `
ALTER TABLE sede_mesas_croquis ADD COLUMN IF NOT EXISTS layout_data JSONB;
ALTER TABLE sede_mesas_croquis ADD COLUMN IF NOT EXISTS activa BOOLEAN NOT NULL DEFAULT TRUE;
CREATE TABLE IF NOT EXISTS venue_layout_versions (floor TEXT PRIMARY KEY);
CREATE INDEX IF NOT EXISTS croquis_sede_floor_idx ON sede_mesas_croquis(sede_id, layout_floor);
CREATE TABLE IF NOT EXISTS carta_productos (
 id SERIAL PRIMARY KEY, sede_id INTEGER NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
 turno VARCHAR(10) NOT NULL CHECK (turno IN ('dia','noche','bar')),
 titulo TEXT NOT NULL, categoria TEXT NOT NULL DEFAULT '', descripcion TEXT NOT NULL DEFAULT '',
 precio NUMERIC(12,2) NOT NULL CHECK (precio >= 0), stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
 imagen_url TEXT NOT NULL DEFAULT '', activo BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS carta_sede_turno_idx ON carta_productos(sede_id, turno);
`;

export function floorIdentity(floor) {
  if (floor === 'venue17') return [17, 1];
  if (floor === 'first') return [20, 1];
  if (floor === 'second') return [20, 2];
  const match = /^sede-(\d+)-piso-([12])$/.exec(floor);
  return match ? [Number(match[1]), Number(match[2])] : null;
}

export async function writeLayout(pool, floor, tables) {
  const [sede, piso] = floorIdentity(floor);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM sedes WHERE id=$1 FOR UPDATE', [sede]);
    const current = await client.query('SELECT id, layout_data, numero_mesa FROM sede_mesas_croquis WHERE sede_id=$1 AND piso=$2 FOR UPDATE', [sede, piso]);
    const kept = [];
    for (const table of tables) {
      const old = current.rows.find(row => row.layout_data?.id === table.id || (!row.layout_data && row.numero_mesa === String(table.numero ?? table.id)));
      const values = [sede, piso, String(table.numero ?? table.id), table.capacidad, table.zona || '', table.x, table.y, table.forma || 'cuadrada', floor, JSON.stringify(table)];
      const result = old
        ? await client.query(`UPDATE sede_mesas_croquis SET numero_mesa=$3,capacidad=$4,zona=$5,pos_x=$6,pos_y=$7,forma=$8,layout_floor=$9,layout_data=$10::jsonb,activa=TRUE WHERE id=$11 AND sede_id=$1 AND piso=$2 RETURNING id`, [...values, old.id])
        : await client.query(`INSERT INTO sede_mesas_croquis (sede_id,piso,numero_mesa,capacidad,zona,pos_x,pos_y,forma,layout_floor,layout_data) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) RETURNING id`, values);
      kept.push(result.rows[0].id);
    }
    // Retain referenced IDs for reservation history, but remove them from active maps.
    await client.query('UPDATE sede_mesas_croquis SET activa=FALSE WHERE sede_id=$1 AND piso=$2 AND NOT (id=ANY($3::int[]))', [sede, piso, kept]);
    await client.query('INSERT INTO venue_layout_versions(floor) VALUES ($1) ON CONFLICT DO NOTHING', [floor]);
    await client.query('COMMIT');
    layoutEvents.emit('updated');
    operationEvents.emit('updated');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function initializeVenueLayouts(pool) {
  await pool.query(venueSchema);
  const defaults = { first: FIRST_FLOOR_TABLES, second: TABLES, venue17: VENUE17_TABLES };
  const filename = fileURLToPath(new URL('../data/floor-layouts.sqlite', import.meta.url));
  if (existsSync(filename)) {
    const db = new DatabaseSync(filename, { readOnly: true });
    try {
      if (db.prepare("SELECT name FROM sqlite_master WHERE name='floor_layouts'").get()) {
        for (const row of db.prepare('SELECT floor,tables_json FROM floor_layouts').all()) {
          if (floorIdentity(row.floor)) defaults[row.floor] = JSON.parse(row.tables_json);
        }
      }
    } finally { db.close(); }
  }
  for (const [floor, tables] of Object.entries(defaults)) {
    const initialized = await pool.query('SELECT floor FROM venue_layout_versions WHERE floor=$1', [floor]);
    if (initialized.rowCount) continue;
    const [sede, piso] = floorIdentity(floor);
    const existing = await pool.query('SELECT * FROM sede_mesas_croquis WHERE sede_id=$1 AND piso=$2', [sede, piso]);
    await writeLayout(pool, floor, existing.rowCount ? existing.rows.map(row => row.layout_data || {
      id: row.numero_mesa, numero: row.numero_mesa, capacidad: row.capacidad, zona: row.zona,
      x: row.pos_x, y: row.pos_y, forma: row.forma, ancho: 52, alto: 38, rotacion: 0,
      activa: true, unible: true, tipo: 'standard', equivalenciaMesas: 1, piso: floor,
    }) : tables);
  }
}

export async function layoutApi(req, res, pool, reply, readJson, authorize) {
  if (req.method === 'GET') {
    const result = await pool.query(`SELECT v.floor, COALESCE(jsonb_agg(m.layout_data ORDER BY m.id) FILTER (WHERE m.id IS NOT NULL), '[]'::jsonb) AS tables
      FROM venue_layout_versions v LEFT JOIN sede_mesas_croquis m ON m.layout_floor=v.floor AND m.activa=TRUE GROUP BY v.floor`);
    return reply(res, 200, Object.fromEntries(result.rows.map(row => [row.floor, row.tables])));
  }
  if (req.method !== 'PUT') return reply(res, 405, { error: 'Método no permitido.' });
  if (!await authorize()) return reply(res, 403, { error: 'Sin permiso para editar croquis.' });
  const { floor, tables } = await readJson(req);
  if (!floorIdentity(floor) || !Array.isArray(tables) || tables.length > 500 ||
      tables.some(t => typeof t.id !== 'string' || !t.id || ![t.x,t.y,t.ancho,t.alto,t.rotacion].every(Number.isFinite) || t.ancho <= 0 || t.alto <= 0 || !Number.isInteger(t.capacidad) || t.capacidad < 1) ||
      new Set(tables.map(t => t.id)).size !== tables.length) {
    return reply(res, 400, { error: 'Revisa los identificadores únicos, capacidad y coordenadas de las mesas.' });
  }
  await writeLayout(pool, floor, tables);
  return reply(res, 200, { saved: true });
}

export async function cartaApi(req, res, pool, reply, readJson) {
  const url = new URL(req.url, 'http://localhost');
  const sede = Number(url.searchParams.get('sede_id'));
  const turno = url.searchParams.get('turno');
  if (!Number.isInteger(sede) || sede <= 0 || !['dia','noche','bar'].includes(turno)) return reply(res, 400, { error: 'Sede o turno inválido.' });
  if (req.method === 'GET') {
    const result = await pool.query('SELECT * FROM carta_productos WHERE sede_id=$1 AND turno=$2 ORDER BY categoria,id', [sede, turno]);
    return reply(res, 200, result.rows);
  }
  const body = await readJson(req);
  if (req.method === 'DELETE') {
    let result;
    try { result = await pool.query('DELETE FROM carta_productos WHERE id=$1 AND sede_id=$2 AND turno=$3 RETURNING id', [body.id, sede, turno]); }
    catch(error) {
      if(error.code!=='23503')throw error;
      // Ordered products remain in historical receipts, but leave the public menu.
      result=await pool.query('UPDATE carta_productos SET activo=FALSE WHERE id=$1 AND sede_id=$2 AND turno=$3 RETURNING id',[body.id,sede,turno]);
    }
    operationEvents.emit('updated');
    return reply(res, result.rowCount ? 200 : 404, { saved: Boolean(result.rowCount) });
  }
  if (!['POST','PUT'].includes(req.method)) return reply(res, 405, { error: 'Método no permitido.' });
  if (!String(body.titulo || '').trim() || !Number.isFinite(Number(body.precio)) || Number(body.precio) < 0 || !Number.isInteger(Number(body.stock)) || Number(body.stock) < 0) return reply(res, 400, { error: 'Revisa título, precio y stock.' });
  const values = [sede, turno, body.titulo.trim(), body.categoria || '', body.descripcion || '', Number(body.precio), Number(body.stock), body.imagen_url || '', body.activo !== false];
  const result = await transaction(pool, async db=>{
    if(body.id)await db.query('SELECT id FROM carta_productos WHERE id=$1 FOR UPDATE',[body.id]);
    return body.id
      ? db.query(`UPDATE carta_productos SET titulo=$3,categoria=$4,descripcion=$5,precio=$6,stock=$7,stock_disponible=$7,imagen_url=$8,activo=$9 WHERE sede_id=$1 AND turno=$2 AND id=$10 RETURNING *`, [...values,body.id])
      : db.query(`INSERT INTO carta_productos(sede_id,turno,titulo,categoria,descripcion,precio,stock,stock_disponible,imagen_url,activo) VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8,$9) RETURNING *`, values);
  });
  return reply(res, result.rowCount ? 200 : 404, result.rows[0] || { error: 'Producto no encontrado.' });
}
