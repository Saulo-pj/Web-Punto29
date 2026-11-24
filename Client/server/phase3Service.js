import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
export const operationEvents=new EventEmitter();
operationEvents.setMaxListeners(0);
export const STATES=['reservado_negro','ocupado_rojo','sucia_azul','libre_verde'];
export const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export const turnoCode=value=>value==='Turno noche'||value==='noche'?'noche':value==='Turno dÃ­a'||value==='Turno día'||value==='dia'?'dia':value;
export const integer=(value,min=1,max=10000)=>Number.isInteger(Number(value))&&Number(value)>=min&&Number(value)<=max;
export const keyCheck=key=>{if(typeof key!=='string'||key.length<10||key.length>100)fail(400,'Falta la clave de confirmación.');};
export async function transaction(pool,work){
 const client=await pool.connect();
 try{await client.query('BEGIN');const value=await work(client);await client.query('COMMIT');operationEvents.emit('updated');return value;}
 catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function limitFor(db){const r=await db.query("SELECT valor FROM configuracion_web WHERE clave='limite_platos_pedido'");const n=Number(r.rows[0]?.valor);return integer(n,10,20)?n:15;}
export async function lockKey(db,key){keyCheck(key);await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[key]);}

export async function placeOrder(db,body,reservation=null){
 const type=reservation?'preorden_reserva':'delivery';
 if(!reservation&&body.tipo_pedido!=='delivery')fail(400,'La preorden se confirma junto con la reserva.');
 const sede=Number(reservation?.sede_id||body.sede_id), turno=turnoCode(reservation?.turno||body.turno);
 if(!integer(sede)||!['dia','noche','bar'].includes(turno))fail(400,'Selecciona sede y turno.');
 const items=body.items;
 if(!Array.isArray(items)||!items.length||items.length>20||items.some(x=>!integer(x.producto_id)||!integer(x.cantidad,1,20)))fail(400,'Revisa los productos del carrito.');
 const counts=new Map();for(const item of items)counts.set(Number(item.producto_id),(counts.get(Number(item.producto_id))||0)+Number(item.cantidad));
 const limit=await limitFor(db);if([...counts.values()].reduce((a,b)=>a+b,0)>limit)fail(400,`Puedes pedir hasta ${limit} platos por pedido.`);
 const sedeRow=(await db.query('SELECT * FROM sedes WHERE id=$1',[sede])).rows[0];
 if(!sedeRow?.activa||!sedeRow[`tiene_carta_${turno}`])fail(409,'Esta carta no está disponible en la sede.');
 const products=(await db.query('SELECT * FROM carta_productos WHERE id=ANY($1::int[]) ORDER BY id FOR UPDATE',[[...counts.keys()]])).rows;
 if(products.length!==counts.size)fail(409,'Un producto ya no está disponible.');
 let cents=0;
 for(const p of products){
  if(!p.activo||p.sede_id!==sede||![turno,'todos'].includes(p.turno))fail(409,`${p.titulo} no está disponible en esta carta.`);
  if(p.stock_disponible<counts.get(p.id))fail(409,`Stock insuficiente: ${p.titulo}. Disponible: ${p.stock_disponible}.`);
  cents+=Math.round(Number(p.precio)*100)*counts.get(p.id);
 }
 const name=String(reservation?.cliente_nombre||body.cliente_nombre||'').trim(),phone=String(reservation?.cliente_telefono||body.cliente_telefono||'').trim();
 if(!name||name.length>200||!/^\+?[\d\s()-]{7,25}$/.test(phone))fail(400,'Completa nombre y teléfono.');
 if(type==='delivery'&&!String(body.direccion_entrega||'').trim())fail(400,'Ingresa la dirección de entrega.');
 const order=(await db.query(`INSERT INTO pedidos_online(tipo_pedido,reserva_id,sede_id,cliente_nombre,cliente_telefono,direccion_entrega,total,request_key)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[type,reservation?.id||null,sede,name,phone,type==='delivery'?String(body.direccion_entrega).slice(0,1000):null,cents/100,body.request_key])).rows[0];
 for(const p of products){await db.query('UPDATE carta_productos SET stock_disponible=stock_disponible-$1 WHERE id=$2',[counts.get(p.id),p.id]);await db.query('INSERT INTO pedido_items(pedido_id,producto_id,cantidad,precio_unitario) VALUES($1,$2,$3,$4)',[order.id,p.id,counts.get(p.id),p.precio]);}
 return order;
}
export async function confirmDelivery(pool,body){return transaction(pool,async db=>{
 await lockKey(db,body.request_key);const old=(await db.query('SELECT id,total,estado FROM pedidos_online WHERE request_key=$1',[body.request_key])).rows[0];
 return old||placeOrder(db,body);
});}

export async function availableIds(db,body){
 const {sede_id,fecha_reserva,hora_reserva}=body,turno=turnoCode(body.turno);
 if(!integer(sede_id)||!/^\d{4}-\d{2}-\d{2}$/.test(fecha_reserva||''))fail(400,'Selecciona fecha y sede.');
 const result=await db.query(`SELECT DISTINCT COALESCE(m.layout_data->>'id',m.numero_mesa) AS id FROM sede_mesas_croquis m
 WHERE m.sede_id=$1 AND m.activa=TRUE AND ((m.sede_id=20 AND m.piso=2 AND (EXISTS(SELECT 1 FROM sesiones_mesa_vivo s WHERE s.mesa_id=m.id AND s.estado<>'libre_verde') OR EXISTS(SELECT 1 FROM reserva_mesas rm JOIN reservas r ON r.id=rm.reserva_id WHERE rm.mesa_id=m.id AND r.sede_id=20 AND r.fecha_reserva=(NOW() AT TIME ZONE 'America/Lima')::date AND r.estado<>'cancelada')))
 OR EXISTS(SELECT 1 FROM reserva_mesas rm JOIN reservas r ON r.id=rm.reserva_id WHERE rm.mesa_id=m.id AND NOT rm.liberada
 AND r.estado<>'cancelada' AND r.fecha_reserva=$2::date AND (r.turno=$3 OR r.turno=$4) AND r.hora_reserva=$5))`,[sede_id,fecha_reserva,turno,turno==='dia'?'Turno día':'Turno noche',hora_reserva]);
 return result.rows.map(r=>r.id).filter(Boolean);
}
export async function lockReservationTables(db,body){
 const ids=[...new Set((body.mesa_ids||[]).map(id=>String(id).replace(/^(I23|I24)[ab]$/,'$1')))];
 if(!ids.length){if(['U','GRUPAL'].includes(body.configuracion))return [];fail(400,'Selecciona una mesa.');}
 if(ids.length>20)fail(400,'Demasiadas mesas.');
 const rows=(await db.query(`SELECT * FROM sede_mesas_croquis WHERE sede_id=$1 AND activa=TRUE AND COALESCE(layout_data->>'id',numero_mesa)=ANY($2::text[]) ORDER BY id FOR UPDATE`,[body.sede_id,ids])).rows;
 if(rows.length!==ids.length)fail(409,'Una mesa cambió. Vuelve al mapa.');
 const blocked=await availableIds(db,body);if(ids.some(id=>blocked.includes(id)))fail(409,'Una mesa acaba de ocuparse. Elige otra ubicación.');
 if(rows.some(r=>r.layout_data?.activa===false))fail(409,'Una mesa no está habilitada.');
 if(rows.reduce((sum,r)=>sum+r.capacidad,0)<Number(body.cantidad_personas))fail(400,'Las mesas no tienen capacidad suficiente.');
 return rows;
}
export async function confirmReservation(pool,body){return transaction(pool,async db=>{
 await lockKey(db,body.request_key);
 const old=(await db.query('SELECT * FROM reservas WHERE request_key=$1',[body.request_key])).rows[0];if(old)return old;
 if(!String(body.cliente_nombre||'').trim()||!integer(body.cantidad_personas,1,200)||!['dia','noche'].includes(turnoCode(body.turno))||!/^\d{1,2}:\d{2}(?:\s?[ap]\.?m\.?)?$/i.test(body.hora_reserva||''))fail(400,'Revisa los datos de la reserva.');
 if(body.es_cumpleanos&&(!/^\d{8}$/.test(body.cumpleanero_dni||'')||!body.cumpleanero_nombre||!/^\d{4}-\d{2}-\d{2}$/.test(body.cumpleanero_fecha_nac||'')))fail(400,'Completa los datos del cumpleañero.');
 const tables=await lockReservationTables(db,body);
 const reservation=(await db.query(`INSERT INTO reservas(codigo_reserva,sede_id,mesa_id,fecha_reserva,turno,hora_reserva,cantidad_personas,cliente_nombre,cliente_telefono,cliente_email,motivo_reserva,es_cumpleanos,cortesia_id,cumpleanero_nombre,cumpleanero_dni,cumpleanero_fecha_nac,request_key)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,[
 `P29-${crypto.randomBytes(5).toString('hex').toUpperCase()}`,body.sede_id,tables[0]?.id||null,body.fecha_reserva,body.turno,body.hora_reserva,body.cantidad_personas,body.cliente_nombre,body.cliente_telefono,body.cliente_email,body.motivo_reserva,Boolean(body.es_cumpleanos),body.cortesia_id||null,body.cumpleanero_nombre||null,body.cumpleanero_dni||null,body.cumpleanero_fecha_nac||null,body.request_key])).rows[0];
 const today=(await db.query("SELECT (NOW() AT TIME ZONE 'America/Lima')::date::text AS day")).rows[0].day;
 for(const table of tables){
  await db.query('INSERT INTO reserva_mesas(reserva_id,mesa_id) VALUES($1,$2)',[reservation.id,table.id]);
  if(table.sede_id===20&&table.piso===2&&body.fecha_reserva===today)await db.query(`INSERT INTO sesiones_mesa_vivo(mesa_id,reserva_id,cliente_nombre,cantidad_personas,whatsapp,estado) VALUES($1,$2,$3,$4,$5,'reservado_negro') ON CONFLICT(reserva_id,mesa_id) DO NOTHING`,[table.id,reservation.id,body.cliente_nombre,Math.min(table.capacidad,body.cantidad_personas),body.cliente_telefono]);
 }
 if(body.items?.length)await placeOrder(db,{...body,tipo_pedido:'preorden_reserva'},reservation);
 return reservation;
});}

export async function registerGuest(pool,body,user){return transaction(pool,async db=>{
 await lockKey(db,body.request_key);
 const old=(await db.query('SELECT * FROM sesiones_mesa_vivo WHERE request_key=$1',[body.request_key])).rows[0];if(old)return old;
 if(!String(body.cliente_nombre||'').trim()||!integer(body.cantidad_personas,1,200)||String(body.whatsapp||'').length>30)fail(400,'Revisa nombre y personas.');
 return (await db.query(`INSERT INTO sesiones_mesa_vivo(cliente_nombre,cantidad_personas,whatsapp,atendido_por,request_key) VALUES($1,$2,$3,$4,$5) RETURNING *`,[body.cliente_nombre.trim(),body.cantidad_personas,body.whatsapp||null,user.id,body.request_key])).rows[0];
});}
export async function changeTableState(pool,body,user){return transaction(pool,async db=>{
 if(!integer(body.mesa_id)||!STATES.includes(body.estado))fail(400,'Mesa o estado inválido.');
 const table=(await db.query('SELECT * FROM sede_mesas_croquis WHERE id=$1 AND sede_id=20 AND piso=2 AND activa=TRUE FOR UPDATE',[body.mesa_id])).rows[0];
 if(!table)fail(404,'Esta mesa no pertenece al segundo piso de Sede 20.');
 const latest=(await db.query('SELECT * FROM sesiones_mesa_vivo WHERE mesa_id=$1 ORDER BY id DESC LIMIT 1 FOR UPDATE',[table.id])).rows[0];
 let session;
 if(body.asignar){
  if(latest&&latest.estado!=='libre_verde')fail(409,'Esta mesa acaba de ocuparse.');
  session=(await db.query('SELECT * FROM sesiones_mesa_vivo WHERE id=$1 FOR UPDATE',[body.sesion_id])).rows[0];
  if(!session||session.estado==='libre_verde')fail(409,'Este cliente ya tiene una mesa o se cerró su registro.');
  if(session.mesa_id&&session.mesa_id!==table.id)fail(409,'Este cliente ya tiene una mesa asignada.');
  if(table.capacidad<session.cantidad_personas)fail(400,'La mesa no tiene capacidad para este grupo.');
 }else{
  session=latest;
  if(!session)fail(400,'Registra un cliente para ocupar la mesa.');
  if(Number(body.sesion_id)!==session.id||Number(body.revision)!==session.revision)fail(409,'La mesa cambió en otra tablet. Revisa su estado actualizado.');
 }
 const updated=(await db.query(`UPDATE sesiones_mesa_vivo SET mesa_id=$1,estado=$2,atendido_por=$3,revision=revision+1,
 hora_ingreso_rojo=CASE WHEN $2='ocupado_rojo' THEN COALESCE(hora_ingreso_rojo,NOW()) WHEN $2='reservado_negro' THEN NULL ELSE hora_ingreso_rojo END,
 tiempo_espera_minutos=CASE WHEN $2='ocupado_rojo' THEN GREATEST(0,FLOOR(EXTRACT(EPOCH FROM (COALESCE(hora_ingreso_rojo,NOW())-hora_registro))/60))::int WHEN $2='reservado_negro' THEN NULL ELSE tiempo_espera_minutos END,
 hora_salida_azul=CASE WHEN $2='sucia_azul' THEN COALESCE(hora_salida_azul,NOW()) WHEN $2 IN ('reservado_negro','ocupado_rojo') THEN NULL ELSE hora_salida_azul END,
 hora_limpieza_verde=CASE WHEN $2='libre_verde' THEN NOW() ELSE NULL END WHERE id=$4 RETURNING *`,[body.estado==='libre_verde'?null:table.id,body.estado,user.id,session.id])).rows[0];
 await db.query('UPDATE sede_mesas_croquis SET estado_actual=$1 WHERE id=$2',[body.estado,table.id]);
 if(session.reserva_id){
  await db.query('UPDATE reserva_mesas SET liberada=$1 WHERE reserva_id=$2 AND mesa_id=$3',[body.estado==='libre_verde',session.reserva_id,table.id]);
  if(body.estado==='ocupado_rojo')await db.query("UPDATE reservas SET estado='verificada_en_local',verificada_at=COALESCE(verificada_at,NOW()) WHERE id=$1",[session.reserva_id]);
 }
 operationEvents.emit('updated');
 return updated;
});}

export async function assignGuestTables(pool,body,user){return transaction(pool,async db=>{
 const ids=[...new Set(body.mesa_ids||[])].map(Number).sort((a,b)=>a-b);
 if(!ids.length||ids.length>30||ids.some(id=>!integer(id)))fail(400,'Selecciona las mesas del grupo.');
 const tables=(await db.query('SELECT * FROM sede_mesas_croquis WHERE id=ANY($1::int[]) AND sede_id=20 AND piso=2 AND activa ORDER BY id FOR UPDATE',[ids])).rows;
 if(tables.length!==ids.length)fail(409,'Una mesa ya no está disponible.');
 const busy=await db.query("SELECT id FROM sesiones_mesa_vivo WHERE mesa_id=ANY($1::int[]) AND estado<>'libre_verde' FOR UPDATE",[ids]);
 if(busy.rowCount)fail(409,'Una de las mesas se ocupó. Elige otra.');
 const session=(await db.query('SELECT * FROM sesiones_mesa_vivo WHERE id=$1 FOR UPDATE',[body.sesion_id])).rows[0];
 if(!session||session.estado==='libre_verde')fail(409,'Este registro ya fue asignado.');
 if(session.mesa_id&&session.mesa_id!==ids[0])fail(409,'Este registro ya fue asignado.');
 if(tables.reduce((sum,t)=>sum+t.capacidad,0)<session.cantidad_personas)fail(400,'Selecciona mesas con capacidad suficiente.');
 let remaining=session.cantidad_personas;
 for(const [index,table]of tables.entries()){
  if(remaining<=0)fail(400,'Quita las mesas que el grupo no necesita.');
  const count=Math.min(remaining,table.capacidad);remaining-=count;
  if(index===0)await db.query(`UPDATE sesiones_mesa_vivo SET mesa_id=$1,cantidad_personas=$2,estado='ocupado_rojo',hora_ingreso_rojo=NOW(),tiempo_espera_minutos=GREATEST(0,FLOOR(EXTRACT(EPOCH FROM(NOW()-hora_registro))/60))::int,atendido_por=$3,revision=revision+1 WHERE id=$4`,[table.id,count,user.id,session.id]);
  else await db.query(`INSERT INTO sesiones_mesa_vivo(mesa_id,cliente_nombre,cantidad_personas,whatsapp,estado,hora_registro,hora_ingreso_rojo,tiempo_espera_minutos,atendido_por,request_key)
    VALUES($1,$2,$3,$4,'ocupado_rojo',$5,NOW(),GREATEST(0,FLOOR(EXTRACT(EPOCH FROM(NOW()-$5::timestamptz))/60))::int,$6,$7)`,[table.id,session.cliente_nombre,count,session.whatsapp,session.hora_registro,user.id,`${session.request_key}:mesa${table.id}`]);
  await db.query("UPDATE sede_mesas_croquis SET estado_actual='ocupado_rojo' WHERE id=$1",[table.id]);
 }
 operationEvents.emit('updated');
 return {saved:true};
});}

export async function promoteTodayReservations(pool){return transaction(pool,async db=>{
 const tables=(await db.query(`SELECT DISTINCT m.id FROM reserva_mesas rm JOIN reservas r ON r.id=rm.reserva_id JOIN sede_mesas_croquis m ON m.id=rm.mesa_id
 WHERE m.sede_id=20 AND m.piso=2 AND m.activa AND NOT rm.liberada AND r.estado<>'cancelada' AND r.fecha_reserva=(NOW() AT TIME ZONE 'America/Lima')::date`)).rows;
 for(const t of tables){
  await db.query('SELECT id FROM sede_mesas_croquis WHERE id=$1 FOR UPDATE',[t.id]);
  await db.query(`INSERT INTO sesiones_mesa_vivo(mesa_id,reserva_id,cliente_nombre,cantidad_personas,whatsapp)
   SELECT rm.mesa_id,r.id,COALESCE(r.cliente_nombre,'Reserva'),GREATEST(1,COALESCE(r.cantidad_personas,1)),r.cliente_telefono
   FROM reserva_mesas rm JOIN reservas r ON r.id=rm.reserva_id WHERE rm.mesa_id=$1 AND NOT rm.liberada AND r.estado<>'cancelada'
   AND r.fecha_reserva=(NOW() AT TIME ZONE 'America/Lima')::date
   AND NOT EXISTS(SELECT 1 FROM sesiones_mesa_vivo s WHERE s.mesa_id=$1 AND s.estado<>'libre_verde')
   AND NOT EXISTS(SELECT 1 FROM sesiones_mesa_vivo s WHERE s.mesa_id=$1 AND s.reserva_id=r.id)
   ORDER BY r.hora_reserva LIMIT 1 ON CONFLICT DO NOTHING`,[t.id]);
 }
});}

export async function verifyArrival(pool,code,user){return transaction(pool,async db=>{
 const lookup=(await db.query('SELECT id FROM reservas WHERE codigo_reserva=$1',[code])).rows[0];if(!lookup)fail(404,'La reserva no existe.');
 const tables=(await db.query('SELECT m.* FROM sede_mesas_croquis m JOIN reserva_mesas rm ON rm.mesa_id=m.id WHERE rm.reserva_id=$1 ORDER BY m.id FOR UPDATE OF m',[lookup.id])).rows;
 const r=(await db.query('SELECT * FROM reservas WHERE id=$1 FOR UPDATE',[lookup.id])).rows[0];
 if(r.estado==='cancelada'||r.estado==='verificada_en_local')fail(409,r.estado==='cancelada'?'Esta reserva fue cancelada.':'Esta reserva ya fue utilizada.');
 for(const t of tables.filter(t=>t.sede_id===20&&t.piso===2)){
  const busy=(await db.query("SELECT * FROM sesiones_mesa_vivo WHERE mesa_id=$1 AND estado<>'libre_verde' FOR UPDATE",[t.id])).rows[0];
  if(busy&&busy.reserva_id!==r.id)fail(409,'La mesa está ocupada por otro cliente.');
  if(!busy)await db.query(`INSERT INTO sesiones_mesa_vivo(mesa_id,reserva_id,cliente_nombre,cantidad_personas,whatsapp,atendido_por) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(reserva_id,mesa_id) DO NOTHING`,[t.id,r.id,r.cliente_nombre||'Reserva',r.cantidad_personas||1,r.cliente_telefono,user.id]);
  await db.query(`UPDATE sesiones_mesa_vivo SET estado='ocupado_rojo',hora_ingreso_rojo=NOW(),hora_salida_azul=NULL,hora_limpieza_verde=NULL,tiempo_espera_minutos=GREATEST(0,FLOOR(EXTRACT(EPOCH FROM(NOW()-hora_registro))/60))::int,atendido_por=$1,revision=revision+1 WHERE reserva_id=$2 AND mesa_id=$3`,[user.id,r.id,t.id]);
  await db.query("UPDATE sede_mesas_croquis SET estado_actual='ocupado_rojo' WHERE id=$1",[t.id]);
  await db.query('UPDATE reserva_mesas SET liberada=FALSE WHERE reserva_id=$1 AND mesa_id=$2',[r.id,t.id]);
 }
 return(await db.query("UPDATE reservas SET estado='verificada_en_local',verificada_at=NOW() WHERE id=$1 RETURNING *",[r.id])).rows[0];
});}
