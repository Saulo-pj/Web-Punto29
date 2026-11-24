import 'dotenv/config';
import process from 'node:process';
import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import ExcelJS from 'exceljs';
import { initializePhase3 } from './phase3Schema.js';
import { availableIds, changeTableState, confirmDelivery, confirmReservation, registerGuest, verifyArrival } from './phase3Service.js';
import { importColumns, importProducts, makeWorkbook, parseWorkbook } from './phase3Excel.js';

test('Excel: plantilla, tipos, formato y rechazo de fórmulas',async()=>{
 const bytes=await makeWorkbook(importColumns,[['Ceviche','Fresco',32,'Entradas',20,'dia',10,'SI','']],'Plantilla');
 const rows=await parseWorkbook(bytes);assert.equal(rows.length,1);assert.equal(rows[0].precio,32);
 const book=new ExcelJS.Workbook();await book.xlsx.load(bytes);assert.equal(book.worksheets[0].getRow(1).font.bold,true);assert.equal(book.worksheets[0].views[0].state,'frozen');
 book.worksheets[0].getCell('C2').value={formula:'1+1',result:2};await assert.rejects(parseWorkbook(await book.xlsx.writeBuffer()),/sin fórmulas/);
});

test('PostgreSQL: carreras, rollback, sincronización y compatibilidad', {skip:!process.env.DATABASE_URL},async t=>{
 // A separate generated schema is visible to concurrent connections; public is never in search_path.
 const schema=`p29_phase3_test_${crypto.randomBytes(8).toString('hex')}`;
 const options={connectionString:process.env.DATABASE_URL,ssl:process.env.PGSSLMODE==='disable'?false:{rejectUnauthorized:false},connectionTimeoutMillis:10000};
 const owner=new pg.Client(options);await owner.connect();
 let pool;
 try{
  await owner.query(`CREATE SCHEMA ${schema}`);
  pool=new pg.Pool({...options,max:6,options:`-c search_path=${schema},pg_catalog`});
  await pool.query(`
   CREATE TABLE sedes(id INTEGER PRIMARY KEY,nombre TEXT,activa BOOLEAN DEFAULT TRUE,tiene_carta_dia BOOLEAN DEFAULT TRUE,tiene_carta_noche BOOLEAN DEFAULT TRUE,tiene_carta_bar BOOLEAN DEFAULT TRUE);
   INSERT INTO sedes(id,nombre) VALUES(17,'Sede 17'),(20,'Sede 20');
   CREATE TABLE admin_users(id INTEGER PRIMARY KEY);INSERT INTO admin_users VALUES(1);
   CREATE TABLE sede_mesas_croquis(id SERIAL PRIMARY KEY,sede_id INTEGER REFERENCES sedes(id),piso INTEGER,numero_mesa TEXT,capacidad INTEGER,layout_data JSONB,activa BOOLEAN DEFAULT TRUE,estado_actual TEXT DEFAULT 'libre');
   INSERT INTO sede_mesas_croquis(sede_id,piso,numero_mesa,capacidad,layout_data) VALUES(20,2,'1',8,'{"id":"I1","activa":true}'),(20,2,'2',8,'{"id":"I2","activa":true}'),(20,2,'3',8,'{"id":"I3","activa":true}'),(17,1,'1',4,'{"id":"M1","activa":true}');
   CREATE TABLE reservas(id SERIAL PRIMARY KEY,codigo_reserva TEXT UNIQUE,sede_id INTEGER REFERENCES sedes(id),mesa_id INTEGER REFERENCES sede_mesas_croquis(id),fecha_reserva DATE,turno TEXT,hora_reserva TEXT,cantidad_personas INTEGER,cliente_nombre TEXT,cliente_telefono TEXT,cliente_email TEXT,motivo_reserva TEXT,es_cumpleanos BOOLEAN DEFAULT FALSE,cortesia_id INTEGER,cumpleanero_nombre TEXT,cumpleanero_dni TEXT,cumpleanero_fecha_nac DATE,estado TEXT DEFAULT 'pendiente',verificada_at TIMESTAMPTZ,created_at TIMESTAMPTZ DEFAULT NOW());
   CREATE TABLE carta_productos(id SERIAL PRIMARY KEY,sede_id INTEGER REFERENCES sedes(id),turno TEXT CHECK(turno IN ('dia','noche','bar')),titulo TEXT,descripcion TEXT,categoria TEXT,precio NUMERIC(12,2),stock INTEGER DEFAULT 0,imagen_url TEXT,activo BOOLEAN DEFAULT TRUE);
   CREATE TABLE configuracion_web(clave TEXT PRIMARY KEY,valor TEXT);
  `);
  await initializePhase3(pool);await initializePhase3(pool);
  assert.equal((await pool.query('SELECT count(*)::int n FROM carta_productos')).rows[0].n,10);
  const product=(await pool.query("SELECT * FROM carta_productos WHERE turno='todos' ORDER BY id LIMIT 1")).rows[0];
  const order=()=>({request_key:crypto.randomUUID(),tipo_pedido:'delivery',sede_id:20,turno:'dia',cliente_nombre:'Prueba',cliente_telefono:'999999999',direccion_entrega:'Dirección de prueba',items:[{producto_id:product.id,cantidad:1}]});
  const day=(await pool.query("SELECT (NOW() AT TIME ZONE 'America/Lima')::date::text d")).rows[0].d;
  const reservation=()=>({request_key:crypto.randomUUID(),sede_id:20,turno:'Turno día',fecha_reserva:day,hora_reserva:'13:00',mesa_ids:['I1'],cantidad_personas:2,cliente_nombre:'Reserva prueba',cliente_telefono:'999999999'});
  await t.test('último plato: un ganador, sin stock negativo ni pedido parcial',async()=>{
   await pool.query('UPDATE carta_productos SET stock_disponible=1 WHERE id=$1',[product.id]);
   const results=await Promise.allSettled([confirmDelivery(pool,order()),confirmDelivery(pool,order())]);
   assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
   const p=(await pool.query('SELECT stock,stock_disponible FROM carta_productos WHERE id=$1',[product.id])).rows[0];assert.equal(p.stock_disponible,0);assert.equal(p.stock,0);
   assert.equal((await pool.query('SELECT count(*)::int n FROM pedidos_online')).rows[0].n,1);
  });
  await t.test('idempotencia, límite y sede del carrito',async()=>{
   await pool.query('UPDATE carta_productos SET stock_disponible=10 WHERE id=$1',[product.id]);
   const body=order();const results=await Promise.all([confirmDelivery(pool,body),confirmDelivery(pool,body)]);assert.equal(results[0].id,results[1].id);
   assert.equal((await pool.query('SELECT stock_disponible FROM carta_productos WHERE id=$1',[product.id])).rows[0].stock_disponible,9);
   await assert.rejects(confirmDelivery(pool,{...order(),items:[{producto_id:product.id,cantidad:16}]}),/hasta 15/);
   await assert.rejects(confirmDelivery(pool,{...order(),sede_id:17}),/esta carta/);
  });
  await t.test('preorden sin stock revierte reserva, mesas y pedido',async()=>{
   const body={...reservation(),items:[{producto_id:product.id,cantidad:10}]};
   await assert.rejects(confirmReservation(pool,body),/Stock insuficiente/);
   assert.equal((await pool.query('SELECT count(*)::int n FROM reservas')).rows[0].n,0);
   assert.equal((await pool.query('SELECT count(*)::int n FROM sesiones_mesa_vivo')).rows[0].n,0);
  });
  let reserved;
  await t.test('dos reservas de la misma mesa: solo una confirmación y QR reversible',async()=>{
   const outcomes=await Promise.allSettled([confirmReservation(pool,reservation()),confirmReservation(pool,reservation())]);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
   reserved=outcomes.find(r=>r.status==='fulfilled').value;
   assert.ok((await availableIds(pool,reservation())).includes('I1'));
   await verifyArrival(pool,reserved.codigo_reserva,{id:1});
   await assert.rejects(verifyArrival(pool,reserved.codigo_reserva,{id:1}),/ya fue utilizada/);
   let s=(await pool.query('SELECT * FROM sesiones_mesa_vivo WHERE reserva_id=$1',[reserved.id])).rows[0];assert.equal(s.estado,'ocupado_rojo');
   s=await changeTableState(pool,{mesa_id:1,sesion_id:s.id,revision:s.revision,estado:'sucia_azul'},{id:1});assert.ok((await availableIds(pool,reservation())).includes('I1'));
   s=await changeTableState(pool,{mesa_id:1,sesion_id:s.id,revision:s.revision,estado:'libre_verde'},{id:1});assert.ok(!(await availableIds(pool,reservation())).includes('I1'));
   s=await changeTableState(pool,{mesa_id:1,sesion_id:s.id,revision:s.revision,estado:'ocupado_rojo'},{id:1});assert.equal(s.hora_limpieza_verde,null);assert.ok((await availableIds(pool,reservation())).includes('I1'));
  });
  await t.test('dos anfitrionas, espera y protección contra cambios obsoletos',async()=>{
   const guest=()=>({request_key:crypto.randomUUID(),cliente_nombre:'Puerta',cantidad_personas:2});
   const [a,b]=await Promise.all([registerGuest(pool,guest(),{id:1}),registerGuest(pool,guest(),{id:1})]);
   await pool.query("UPDATE sesiones_mesa_vivo SET hora_registro=NOW()-INTERVAL '7 minutes' WHERE id=ANY($1::int[])",[[a.id,b.id]]);
   const outcomes=await Promise.allSettled([a,b].map(s=>changeTableState(pool,{mesa_id:2,sesion_id:s.id,asignar:true,estado:'ocupado_rojo'},{id:1})));
   assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);const s=outcomes.find(r=>r.status==='fulfilled').value;assert.equal(s.tiempo_espera_minutos,7);
   await assert.rejects(changeTableState(pool,{mesa_id:2,sesion_id:s.id,revision:s.revision-1,estado:'libre_verde'},{id:1}),/otra tablet/);
   await assert.rejects(changeTableState(pool,{mesa_id:4,sesion_id:s.id,revision:s.revision,estado:'libre_verde'},{id:1}),/segundo piso/);
  });
  await t.test('importación completa o ninguna fila, stock compatible con Fase 2',async()=>{
   const item={titulo:'Importado',descripcion:'Prueba',precio:20,categoria:'Entradas',sede:20,turno:'dia',stock_disponible:7,es_mas_vendido:'NO',imagen_url:'',line:2};
   await assert.rejects(importProducts(pool,[item,{...item,sede:999,line:3}]),/sede desconocida/);
   assert.equal((await pool.query("SELECT count(*)::int n FROM carta_productos WHERE titulo='Importado'")).rows[0].n,0);
   await importProducts(pool,[item]);await importProducts(pool,[{...item,stock_disponible:4}]);
   const p=(await pool.query("SELECT * FROM carta_productos WHERE titulo='Importado'")).rows[0];assert.equal(p.stock,4);
   await pool.query('UPDATE carta_productos SET stock=9 WHERE id=$1',[p.id]);assert.equal((await pool.query('SELECT stock_disponible FROM carta_productos WHERE id=$1',[p.id])).rows[0].stock_disponible,9);
  });
 }finally{
  await pool?.end();
  assert.match(schema,/^p29_phase3_test_[a-f0-9]{16}$/);
  await owner.query(`DROP SCHEMA ${schema} CASCADE`);await owner.end();
 }
});
