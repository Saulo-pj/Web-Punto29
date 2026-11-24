import 'dotenv/config';
import process from 'node:process';
import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { writeLayout, layoutApi, cartaApi } from './venueModules.js';

// Only temporary tables: never alter restaurant data, including on assertion failure.
test('PostgreSQL: croquis, historial y aislamiento de cartas', { skip: !process.env.DATABASE_URL }, async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
  await client.connect();
  try {
    await client.query(`
      CREATE TEMP TABLE sedes(id INTEGER PRIMARY KEY);
      INSERT INTO sedes VALUES (17),(20);
      CREATE TEMP TABLE sede_mesas_croquis (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, sede_id INTEGER REFERENCES sedes(id), piso INTEGER,
        numero_mesa TEXT, capacidad INTEGER, zona TEXT, pos_x FLOAT, pos_y FLOAT, forma TEXT,
        layout_floor TEXT, layout_data JSONB, activa BOOLEAN DEFAULT TRUE, estado_actual TEXT DEFAULT 'libre'
      );
      CREATE TEMP TABLE reservas(id INTEGER, mesa_id INTEGER REFERENCES sede_mesas_croquis(id));
      CREATE TEMP TABLE venue_layout_versions(floor TEXT PRIMARY KEY);
      CREATE TEMP TABLE carta_productos (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, sede_id INTEGER REFERENCES sedes(id), turno TEXT,
        titulo TEXT, categoria TEXT, descripcion TEXT, precio NUMERIC(12,2), stock INTEGER, imagen_url TEXT, activo BOOLEAN
      );
    `);
    const pool = { query: (...args) => client.query(...args), connect: async () => ({ query: (...args) => client.query(...args), release() {} }) };
    const table = { id: 'P1', numero: 1, capacidad: 4, zona: 'Interior', x: 120, y: 150, ancho: 48, alto: 48, rotacion: 0, forma: 'redonda' };
    await writeLayout(pool, 'first', [table]);
    const row = (await client.query('SELECT * FROM sede_mesas_croquis')).rows[0];
    await client.query('INSERT INTO reservas VALUES (1,$1)', [row.id]);
    await writeLayout(pool, 'first', [{ ...table, numero: 42, capacidad: 6, x: 300 }]);
    const edited = (await client.query('SELECT * FROM sede_mesas_croquis')).rows[0];
    assert.equal(edited.id, row.id);
    assert.equal(edited.numero_mesa, '42');
    assert.equal(edited.pos_x, 300);
    await writeLayout(pool, 'second', [{ ...table, id: 'N1' }]);
    await writeLayout(pool, 'first', []);
    assert.equal((await client.query('SELECT activa FROM sede_mesas_croquis WHERE id=$1',[row.id])).rows[0].activa, false);
    assert.equal((await client.query('SELECT mesa_id FROM reservas')).rows[0].mesa_id, row.id);
    let result;
    const reply = (_res, status, body) => { result = { status, body }; };
    await layoutApi({ method: 'GET' }, {}, pool, reply);
    assert.deepEqual(result.body.first, []);
    assert.equal(result.body.second.length, 1);
    await layoutApi({ method: 'PUT' }, {}, pool, reply, async () => ({ floor: 'first', tables: [table, table] }), async () => true);
    assert.equal(result.status, 400);
    await layoutApi({ method: 'PUT' }, {}, pool, reply, async () => ({}), async () => false);
    assert.equal(result.status, 403);
    const call = async (sede, turno, method, body) => {
      await cartaApi({ url: `/api/admin/carta-productos?sede_id=${sede}&turno=${turno}`, method }, {}, pool, reply, async () => body);
      return result;
    };
    const product = { titulo: 'Prueba temporal', categoria: 'Platos', descripcion: 'Solo prueba', precio: 25.5, stock: 3, activo: true, imagen_url: '' };
    const created = await call(17,'dia','POST',product);
    assert.equal(created.status,200);
    const id = created.body.id;
    assert.deepEqual((await call(20,'dia','GET')).body, []);
    assert.deepEqual((await call(17,'bar','GET')).body, []);
    assert.equal((await call(20,'dia','PUT',{ ...product,id })).status,404);
    assert.equal((await call(17,'dia','PUT',{ ...product,id,activo:false,stock:0 })).body.activo,false);
    assert.equal((await call(17,'dia','POST',{ ...product,stock:-1 })).status,400);
    assert.equal((await call(17,'dia','DELETE',{ id })).status,200);
    assert.deepEqual((await call(17,'dia','GET')).body, []);
    // A failed floor write rolls back all changes, preserving the other floor.
    await assert.rejects(writeLayout(pool,'sede-999-piso-1',[table]));
    assert.equal((await client.query("SELECT COUNT(*)::int n FROM sede_mesas_croquis WHERE layout_floor='second' AND activa")).rows[0].n,1);
  } finally { await client.end(); }
});
