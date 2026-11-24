export const phase3Schema = `
CREATE TABLE IF NOT EXISTS phase3_migrations (name TEXT PRIMARY KEY);
ALTER TABLE carta_productos ADD COLUMN IF NOT EXISTS stock_disponible INTEGER;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='carta_productos' AND column_name='stock') THEN
  EXECUTE 'UPDATE carta_productos SET stock_disponible=stock WHERE stock_disponible IS NULL';
 ELSE
  UPDATE carta_productos SET stock_disponible=0 WHERE stock_disponible IS NULL;
 END IF;
END $$;
ALTER TABLE carta_productos ADD COLUMN IF NOT EXISTS es_mas_vendido BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE carta_productos ADD COLUMN IF NOT EXISTS seed_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS carta_seed_idx ON carta_productos(seed_key);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='carta_productos_turno_check') THEN
  ALTER TABLE carta_productos ADD CONSTRAINT carta_productos_turno_check CHECK (turno IN ('dia','noche','bar','todos'));
 END IF;
END $$;
ALTER TABLE carta_productos ALTER COLUMN stock_disponible SET DEFAULT 0;
ALTER TABLE carta_productos ALTER COLUMN stock_disponible SET NOT NULL;
CREATE OR REPLACE FUNCTION sync_carta_stock() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.stock_disponible=0 AND NEW.stock<>0 THEN NEW.stock_disponible=NEW.stock; ELSE NEW.stock=NEW.stock_disponible; END IF;
 ELSIF NEW.stock_disponible IS DISTINCT FROM OLD.stock_disponible THEN NEW.stock=NEW.stock_disponible;
 ELSIF NEW.stock IS DISTINCT FROM OLD.stock THEN NEW.stock_disponible=NEW.stock;
 END IF;
 IF NEW.stock_disponible<0 THEN RAISE EXCEPTION 'Stock negativo'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS carta_stock_sync ON carta_productos;
CREATE TRIGGER carta_stock_sync BEFORE INSERT OR UPDATE ON carta_productos FOR EACH ROW EXECUTE FUNCTION sync_carta_stock();
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS request_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS reservas_request_key_idx ON reservas(request_key);
ALTER TABLE sede_mesas_croquis ADD COLUMN IF NOT EXISTS layout_data JSONB;
ALTER TABLE sede_mesas_croquis ADD COLUMN IF NOT EXISTS activa BOOLEAN NOT NULL DEFAULT TRUE;
CREATE TABLE IF NOT EXISTS reserva_mesas (
 reserva_id INTEGER REFERENCES reservas(id), mesa_id INTEGER REFERENCES sede_mesas_croquis(id),
 liberada BOOLEAN NOT NULL DEFAULT FALSE, PRIMARY KEY(reserva_id,mesa_id)
);
INSERT INTO reserva_mesas(reserva_id,mesa_id) SELECT id,mesa_id FROM reservas WHERE mesa_id IS NOT NULL ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS sesiones_mesa_vivo (
 id SERIAL PRIMARY KEY, sede_id INTEGER NOT NULL DEFAULT 20 REFERENCES sedes(id) CHECK(sede_id=20),
 piso INTEGER NOT NULL DEFAULT 2 CHECK(piso=2), mesa_id INTEGER REFERENCES sede_mesas_croquis(id),
 reserva_id INTEGER REFERENCES reservas(id), cliente_nombre TEXT NOT NULL, cantidad_personas INTEGER NOT NULL CHECK(cantidad_personas>0),
 whatsapp VARCHAR(30), estado TEXT NOT NULL DEFAULT 'reservado_negro' CHECK(estado IN ('reservado_negro','ocupado_rojo','sucia_azul','libre_verde')),
 hora_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(), hora_ingreso_rojo TIMESTAMPTZ,
 hora_salida_azul TIMESTAMPTZ, hora_limpieza_verde TIMESTAMPTZ, tiempo_espera_minutos INTEGER,
 atendido_por INTEGER REFERENCES admin_users(id), revision INTEGER NOT NULL DEFAULT 0, request_key TEXT UNIQUE
);
CREATE UNIQUE INDEX IF NOT EXISTS una_sesion_por_mesa ON sesiones_mesa_vivo(mesa_id) WHERE estado<>'libre_verde';
CREATE INDEX IF NOT EXISTS sesiones_fecha_idx ON sesiones_mesa_vivo(hora_registro);
CREATE UNIQUE INDEX IF NOT EXISTS sesion_reserva_mesa_idx ON sesiones_mesa_vivo(reserva_id,mesa_id);
CREATE TABLE IF NOT EXISTS pedidos_online (
 id SERIAL PRIMARY KEY, tipo_pedido TEXT NOT NULL CHECK(tipo_pedido IN ('delivery','preorden_reserva')),
 reserva_id INTEGER REFERENCES reservas(id), sede_id INTEGER NOT NULL REFERENCES sedes(id),
 cliente_nombre TEXT NOT NULL, cliente_telefono TEXT NOT NULL, direccion_entrega TEXT,
 total NUMERIC(10,2) NOT NULL CHECK(total>=0), estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente','preparando','entregado')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), request_key TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS pedido_items (
 id SERIAL PRIMARY KEY, pedido_id INTEGER NOT NULL REFERENCES pedidos_online(id),
 producto_id INTEGER NOT NULL REFERENCES carta_productos(id), cantidad INTEGER NOT NULL CHECK(cantidad>0), precio_unitario NUMERIC(10,2) NOT NULL
);
INSERT INTO configuracion_web(clave,valor) VALUES ('limite_platos_pedido','15') ON CONFLICT DO NOTHING;
`;

const examples = [
 ['Ceviche clásico','Pescado fresco, limón, ají limo y camote dulce.',32,'Entradas',true,'photo-1519708227418-c8fd9a32b7a2'],
 ['Tiradito al ají amarillo','Láminas de pescado bañadas en una cremosa salsa de ají amarillo.',30,'Entradas',false,'photo-1559847844-5315695dadae'],
 ['Leche de tigre','Cítricos, pescado y el toque picante de nuestra casa.',18,'Entradas',false,'photo-1547592180-85f173990554'],
 ['Arroz con mariscos','Arroz al punto con mariscos salteados y un fondo lleno de sabor.',38,'Platos de Fondo',true,'photo-1516714435131-44d6b64dc6a2'],
 ['Jalea mixta','Pescado y mariscos crocantes con yuca y salsa criolla.',42,'Platos de Fondo',true,'photo-1504674900247-0877df9cc836'],
 ['Lomo saltado','Lomo salteado al wok con tomate, cebolla, papas y arroz.',36,'Platos de Fondo',true,'photo-1544025162-d76694265947'],
 ['Ají de gallina','Gallina deshilachada en salsa de ají amarillo, con papa y arroz.',28,'Platos de Fondo',false,'photo-1547592166-23ac45744acd'],
 ['Chaufa de mariscos','Arroz salteado al wok con mariscos, huevo y cebollita china.',34,'Platos de Fondo',false,'photo-1603133872878-684f208fb84b'],
 ['Chicha morada','Maíz morado, piña y especias, servida bien fría.',10,'Bebidas',false,'photo-1544145945-f90425340c7e'],
 ['Pisco sour','Pisco peruano, limón fresco y una espuma delicada.',22,'Carta Bar',false,'photo-1513558161293-cdaf765edfd7'],
];
export async function initializePhase3(pool) {
 const client=await pool.connect();
 try {
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(290003)");
  const done=(await client.query("SELECT to_regclass('phase3_migrations') AS name")).rows[0].name && (await client.query("SELECT 1 FROM phase3_migrations WHERE name='phase3-v1'")).rowCount;
  await client.query(phase3Schema);
  if (!done) {
   for(const [i,p] of examples.entries()) await client.query(`INSERT INTO carta_productos(titulo,descripcion,precio,categoria,sede_id,turno,stock_disponible,stock,es_mas_vendido,imagen_url,seed_key)
    VALUES($1,$2,$3,$4,20,$5,10,10,$6,$7,$8) ON CONFLICT(seed_key) DO NOTHING`,[...p.slice(0,4),p[3]==='Carta Bar'?'bar':'todos',p[4],`https://images.unsplash.com/${p[5]}?auto=format&fit=crop&w=640&q=75`,`phase3-example-${i+1}`]);
   await client.query("INSERT INTO phase3_migrations(name) VALUES ('phase3-v1') ON CONFLICT DO NOTHING");
  }  await client.query('COMMIT');
 } catch(error) { await client.query('ROLLBACK'); throw error; } finally {client.release();}
}
