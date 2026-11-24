import { Buffer } from 'node:buffer';
import { assignGuestTables, availableIds, changeTableState, confirmDelivery, confirmReservation, fail, integer, limitFor, lockReservationTables, operationEvents, registerGuest, transaction } from './phase3Service.js';
import { importColumns, importProducts, makeWorkbook, parseWorkbook } from './phase3Excel.js';

const xlsx=async(res,buffer,name)=>{res.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="${name}.xlsx"`,'Cache-Control':'no-store'});res.end(Buffer.from(buffer));};
const dayFilter=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))fail(400,'Selecciona una fecha.');return value;};
export async function phase3Api(req,res,{pool,reply,readJson,requireAuth}){
 const url=new URL(req.url,'http://localhost'),path=url.pathname,method=req.method;
 const known=path==='/api/operaciones/events'||path==='/api/carta-virtual'||path==='/api/pedidos-online'||path.startsWith('/api/operaciones/reservas/')||path==='/api/reservas/disponibilidad'||path.startsWith('/api/admin/operaciones/');
 if(!known)return false;
 try{
  if(path==='/api/operaciones/events'&&method==='GET'){
   res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'});res.write(': connected\n\n');
   const send=()=>res.write('data: updated\n\n');operationEvents.on('updated',send);
   const timer=setInterval(()=>res.write(': heartbeat\n\n'),25000);req.on('close',()=>{clearInterval(timer);operationEvents.off('updated',send);});return true;
  }
  if(path==='/api/carta-virtual'&&method==='GET'){
   const sede=Number(url.searchParams.get('sede')),turno=url.searchParams.get('turno');
   if(!integer(sede)||!['dia','noche','bar'].includes(turno))fail(400,'Selecciona sede y turno.');
   const products=await pool.query(`SELECT p.* FROM carta_productos p JOIN sedes s ON s.id=p.sede_id WHERE p.sede_id=$1 AND p.turno IN ($2,'todos') AND p.activo AND s.activa
    AND CASE $2 WHEN 'dia' THEN s.tiene_carta_dia WHEN 'noche' THEN s.tiene_carta_noche ELSE s.tiene_carta_bar END ORDER BY p.es_mas_vendido DESC,p.categoria,p.titulo`,[sede,turno]);
   reply(res,200,{productos:products.rows,limite:await limitFor(pool)});return true;
  }
  if(path==='/api/pedidos-online'&&method==='POST'){reply(res,201,await confirmDelivery(pool,await readJson(req)));return true;}
  if(path==='/api/operaciones/reservas/confirmar'&&method==='POST'){reply(res,201,await confirmReservation(pool,await readJson(req)));return true;}
  if(path==='/api/operaciones/reservas/validar'&&method==='POST'){const body=await readJson(req);await transaction(pool,db=>lockReservationTables(db,body));reply(res,200,{disponible:true});return true;}
  if(path==='/api/reservas/disponibilidad'&&method==='GET'){reply(res,200,{tableIds:await availableIds(pool,Object.fromEntries(url.searchParams))});return true;}
  if(!path.startsWith('/api/admin/operaciones/'))fail(405,'Método no permitido.');
  const user=await requireAuth(req);if(!user?.activo)fail(401,'Tu sesión venció. Inicia sesión nuevamente.');
  const permissions=typeof user.permisos_json==='string'?JSON.parse(user.permisos_json):user.permisos_json||{};
  const allow=(...names)=>{if(!names.some(name=>permissions[name]))fail(403,'No tienes permiso para este módulo.');};
  const route=path.slice('/api/admin/operaciones/'.length);
  if(['mesas','sesiones','estado'].includes(route)||/^sesiones\/\d+$/.test(route))allow('Mesas en Vivo');
  else if(route.startsWith('espera'))allow('Lista de Espera','Mesas en Vivo');
  else allow('Carta y Stock','Sedes y Cartas');
  if(route==='mesas'&&method==='GET'){
   const rows=await pool.query(`SELECT m.*,COALESCE(s.estado,'libre_verde') estado,s.id sesion_id,s.cliente_nombre,s.cantidad_personas,s.revision,s.reserva_id,s.hora_registro,s.hora_ingreso_rojo FROM sede_mesas_croquis m
    LEFT JOIN LATERAL(SELECT * FROM sesiones_mesa_vivo WHERE mesa_id=m.id ORDER BY id DESC LIMIT 1)s ON TRUE WHERE m.sede_id=20 AND m.piso=2 AND m.activa ORDER BY m.id`);
   const waiting=await pool.query("SELECT * FROM sesiones_mesa_vivo WHERE mesa_id IS NULL AND estado<>'libre_verde' ORDER BY hora_registro");
   reply(res,200,{mesas:rows.rows,espera:waiting.rows});return true;
  }
  if(route==='sesiones'&&method==='POST'){reply(res,201,await registerGuest(pool,await readJson(req),user));return true;}
  if(/^sesiones\/\d+$/.test(route)&&method==='PATCH'){
   const body=await readJson(req);const id=Number(route.split('/')[1]);
   const saved=await transaction(pool,async db=>{
    const old=(await db.query('SELECT * FROM sesiones_mesa_vivo WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!old||old.mesa_id)fail(409,'El registro ya fue asignado.');
    if(!String(body.cliente_nombre||'').trim()||!integer(body.cantidad_personas,1,200))fail(400,'Revisa los datos del cliente.');
    return(await db.query('UPDATE sesiones_mesa_vivo SET cliente_nombre=$1,cantidad_personas=$2,whatsapp=$3,revision=revision+1 WHERE id=$4 RETURNING *',[body.cliente_nombre,body.cantidad_personas,String(body.whatsapp||'').slice(0,30),id])).rows[0];
   });reply(res,200,saved);return true;
  }
  if(route==='estado'&&method==='PATCH'){const body=await readJson(req);reply(res,200,await (body.asignar&&Array.isArray(body.mesa_ids)?assignGuestTables:changeTableState)(pool,body,user));return true;}
  if(['espera','espera.xlsx'].includes(route)&&method==='GET'){
   const day=dayFilter(url.searchParams.get('fecha'));
   const rows=(await pool.query(`SELECT s.*,COALESCE(m.layout_data->>'id',m.numero_mesa,'Sin asignar') mesa FROM sesiones_mesa_vivo s LEFT JOIN sede_mesas_croquis m ON m.id=s.mesa_id
    WHERE hora_registro>=($1::date::timestamp AT TIME ZONE 'America/Lima') AND hora_registro<(($1::date+1)::timestamp AT TIME ZONE 'America/Lima') ORDER BY hora_registro`,[day])).rows;
   if(route==='espera'){reply(res,200,rows);return true;}
   const time=v=>v?new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',dateStyle:'short',timeStyle:'medium'}).format(new Date(v)):'';
   const headers=['Cliente','WhatsApp','Personas','Mesa asignada','Hora registro','Hora ingreso','Espera (min)','Hora salida','Hora limpieza','Estado actual'];
   await xlsx(res,await makeWorkbook(headers,rows.map(r=>[r.cliente_nombre,r.whatsapp||'',r.cantidad_personas,r.mesa,time(r.hora_registro),time(r.hora_ingreso_rojo),r.tiempo_espera_minutos??'',time(r.hora_salida_azul),time(r.hora_limpieza_verde),r.estado]),'Lista de espera'),`espera-${day}`);return true;
  }
  if(route==='plantilla.xlsx'&&method==='GET'){await xlsx(res,await makeWorkbook(importColumns,[['Ejemplo: Ceviche','Descripción del plato',32,'Entradas',20,'dia',10,'SI','']],'Plantilla'),'plantilla-carta');return true;}
  if(route==='importar'&&method==='POST'){
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2*1024*1024)fail(413,'El Excel debe pesar hasta 2 MB.');chunks.push(Buffer.from(chunk));}
   let rows;try{rows=await parseWorkbook(Buffer.concat(chunks));}catch(error){if(error.status)throw error;fail(400,'No se pudo leer el Excel. Usa un archivo .xlsx válido.');}
   reply(res,200,await importProducts(pool,rows));return true;
  }
  if(route==='inventario'&&method==='GET'){reply(res,200,{productos:(await pool.query('SELECT p.*,s.nombre sede_nombre FROM carta_productos p JOIN sedes s ON s.id=p.sede_id ORDER BY p.sede_id,p.turno,p.titulo')).rows,limite:await limitFor(pool)});return true;}
  if(route==='inventario'&&method==='PATCH'){
   const body=await readJson(req);if(!integer(body.id)||(body.stock_disponible!==undefined&&!integer(body.stock_disponible,0,1000000)))fail(400,'Stock inválido.');
   const saved=await transaction(pool,async db=>{
    const old=(await db.query('SELECT id FROM carta_productos WHERE id=$1 FOR UPDATE',[body.id])).rows[0];if(!old)fail(404,'Producto no encontrado.');
    return(await db.query('UPDATE carta_productos SET stock_disponible=COALESCE($1,stock_disponible),es_mas_vendido=COALESCE($2,es_mas_vendido),activo=COALESCE($3,activo) WHERE id=$4 RETURNING *',[body.stock_disponible??null,typeof body.es_mas_vendido==='boolean'?body.es_mas_vendido:null,typeof body.activo==='boolean'?body.activo:null,body.id])).rows[0];
   });reply(res,200,saved);return true;
  }
  if(route==='limite'&&method==='PUT'){const body=await readJson(req);if(!integer(body.limite,10,20))fail(400,'El límite debe estar entre 10 y 20.');await pool.query("UPDATE configuracion_web SET valor=$1 WHERE clave='limite_platos_pedido'",[String(body.limite)]);operationEvents.emit('updated');reply(res,200,{limite:Number(body.limite)});return true;}
  if(route==='pedidos'&&method==='GET'){reply(res,200,(await pool.query(`SELECT p.*,COALESCE((SELECT jsonb_agg(jsonb_build_object('titulo',c.titulo,'cantidad',i.cantidad,'precio',i.precio_unitario)) FROM pedido_items i JOIN carta_productos c ON c.id=i.producto_id WHERE i.pedido_id=p.id),'[]') items FROM pedidos_online p ORDER BY p.created_at DESC LIMIT 200`)).rows);return true;}
  if(route==='pedidos'&&method==='PATCH'){const body=await readJson(req);if(!['pendiente','preparando','entregado'].includes(body.estado))fail(400,'Estado inválido.');const result=await pool.query('UPDATE pedidos_online SET estado=$1 WHERE id=$2 RETURNING id',[body.estado,body.id]);if(!result.rowCount)fail(404,'Pedido no encontrado.');reply(res,200,{saved:true});return true;}
  fail(405,'Ruta o método no permitido.');
 }catch(error){
  if(error.status)reply(res,error.status,{error:error.message});
  else if(error.code==='23505')reply(res,409,{error:'Otra operación se adelantó. Actualiza e intenta de nuevo.'});
  else{console.error('Fase 3:',error.message);reply(res,500,{error:'No se pudo completar la operación. No se guardaron cambios parciales.'});}
  return true;
 }
}
