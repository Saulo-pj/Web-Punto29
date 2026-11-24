import { useCallback, useEffect, useRef, useState } from 'react';
import { FloorPlanBackground } from '../reservation/table-selection/components/FloorPlanBackground';
import { api, subscribeOperations, timeText } from './api';
import './operations.css';
const states=[['libre_verde','Libre','✓','#22C55E'],['reservado_negro','Reservado','◷','#18181B'],['ocupado_rojo','Ocupado','●','#EF4444'],['sucia_azul','Por limpiar','✦','#3B82F6']];
const fresh=()=>({cliente_nombre:'',cantidad_personas:2,whatsapp:'',request_key:crypto.randomUUID()});
export function LiveTables(){
 const [data,setData]=useState({mesas:[],espera:[]}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[step,setStep]=useState(null),[guest,setGuest]=useState(fresh),[session,setSession]=useState(null),[menu,setMenu]=useState(null),[large,setLarge]=useState(false),[zoom,setZoom]=useState(1),[online,setOnline]=useState(false);
 const [chosen,setChosen]=useState([]),[groupMode,setGroupMode]=useState(false);
 const root=useRef(null);
 const refresh=useCallback(()=>api('/api/admin/operaciones/mesas').then(d=>{setData(d);setMenu(current=>current?d.mesas.find(t=>t.id===current.id)||null:null);setOnline(true);}).catch(e=>{setError(e.message);setOnline(false);}),[]);
 useEffect(()=>{refresh();return subscribeOperations(refresh);},[refresh]);
 const action=async fn=>{setBusy(true);setError('');try{await fn();await refresh();}catch(e){setError(e.message);await refresh();}finally{setBusy(false);}};
 const next=()=>action(async()=>{
  const saved=session?await api(`/api/admin/operaciones/sesiones/${session.id}`,'PATCH',guest):await api('/api/admin/operaciones/sesiones','POST',guest);
  setSession(saved);setGuest(saved);setChosen([]);setGroupMode(saved.cantidad_personas>8);setStep(3);
 });
 const assign=table=>action(async()=>{
  await api('/api/admin/operaciones/estado','PATCH',{...(groupMode?{mesa_ids:chosen}:{mesa_id:table.id}),sesion_id:session.id,asignar:true,estado:'ocupado_rojo'});
  setStep(null);setSession(null);setGuest(fresh());
 });
 const change=state=>action(async()=>{
  await api('/api/admin/operaciones/estado','PATCH',{mesa_id:menu.id,sesion_id:menu.sesion_id,revision:menu.revision,estado:state});setMenu(null);
 });
 const isChoosing=step===3;
 const selectTable=table=>{if(groupMode)setChosen(ids=>ids.includes(table.id)?ids.filter(id=>id!==table.id):[...ids,table.id]);else assign(table);};
 const chosenCapacity=data.mesas.filter(t=>chosen.includes(t.id)).reduce((sum,t)=>sum+t.capacidad,0);
 return <section ref={root} className={`ops live-tables ${isChoosing?'live-tables--customer':''}`}>
  <header className="ops-heading"><div><p>SEDE 20 · SEGUNDO PISO</p><h1>Mesas en Vivo</h1></div><div className="ops-actions"><span className={online?'ops-online':'ops-offline'}>{online?'● Conectado':'Sin conexión'}</span>{step===null?<button className="ops-primary" onClick={()=>{setGuest(fresh());setSession(null);setStep(0);setMenu(null);}}>+ Nuevo cliente</button>:<button onClick={()=>setStep(null)}>Volver al control</button>}</div></header>
  {error&&<p className="ops-error" role="alert">{error}<button onClick={()=>{setError('');refresh();}}>Actualizar</button></p>}
  {step!==null&&<nav className="ops-stepper" aria-label="Recepción">{['Cliente','Personas','WhatsApp (Opcional)','Elegir mesa'].map((label,i)=><button key={label} aria-current={step===i?'step':undefined} disabled={busy} onClick={()=>setStep(i)}><b>{i+1}</b>{label}</button>)}</nav>}
  {step===0&&<div className="ops-reception"><h2>Nombre del cliente</h2><input autoFocus aria-label="Nombre del cliente" value={guest.cliente_nombre} onChange={e=>setGuest({...guest,cliente_nombre:e.target.value})} maxLength={200}/><button className="ops-primary" disabled={!guest.cliente_nombre.trim()} onClick={()=>setStep(1)}>Siguiente →</button></div>}
  {step===1&&<div className="ops-reception"><h2>¿Cuántas personas?</h2><div className="ops-numpad">{[1,2,3,4,5,6,7,8].map(n=><button key={n} onClick={()=>{setGuest({...guest,cantidad_personas:n});setStep(2);}}>{n}</button>)}<button onClick={()=>setLarge(true)}>+8</button></div>{large&&<label>Personas<input type="number" inputMode="numeric" min="9" max="200" value={guest.cantidad_personas} onChange={e=>setGuest({...guest,cantidad_personas:Number(e.target.value)})}/></label>}<button className="ops-primary" disabled={!Number.isInteger(guest.cantidad_personas)||guest.cantidad_personas<1||guest.cantidad_personas>200} onClick={()=>setStep(2)}>Siguiente →</button></div>}
  {step===2&&<div className="ops-reception"><h2>WhatsApp <small>(Opcional)</small></h2><input type="tel" inputMode="tel" aria-label="WhatsApp opcional" maxLength={30} value={guest.whatsapp} onChange={e=>setGuest({...guest,whatsapp:e.target.value})}/><button className="ops-primary" disabled={busy||!online} onClick={next}>{busy?'Registrando…':guest.whatsapp?'Continuar →':'Omitir / Continuar →'}</button></div>}
  {(step===null||isChoosing)&&<>
   <div className="ops-map-toolbar"><div className="ops-legend">{states.map(([key,label,icon,color])=><span key={key}><i style={{background:color}}>{icon}</i>{label}</span>)}</div><div className="ops-actions"><button onClick={()=>setZoom(v=>v===1?1.5:v===1.5?2:1)}>Zoom {zoom}×</button><button onClick={()=>{if(document.fullscreenElement)document.exitFullscreen?.();else root.current?.requestFullscreen?.().catch(()=>{});}}>Pantalla completa</button></div></div>
   {isChoosing&&<><h2 className="ops-selection-title">{guest.cantidad_personas} personas · Toca una mesa verde</h2>{groupMode&&<p className="ops-selection-title">Seleccionadas: {chosen.length} · Capacidad: {chosenCapacity}</p>}</>}
   <div className="ops-live-grid"><div className="ops-map-scroll"><svg className="ops-map" style={{width:`${zoom*100}%`}} viewBox="0 0 632 884" aria-label="Mesas de Sede 20 segundo piso">
    <FloorPlanBackground floor="second"/>
    {data.mesas.map(table=>{const t=table.layout_data||{},state=states.find(s=>s[0]===(table.estado||'libre_verde')),available=state[0]==='libre_verde',disabled=busy||!online||(isChoosing&&(!available||(!groupMode&&table.capacidad<guest.cantidad_personas)));return <g key={table.id} transform={`translate(${table.pos_x} ${table.pos_y}) rotate(${t.rotacion||0})`} role="button" aria-disabled={disabled} tabIndex={disabled?-1:0} aria-label={`Mesa ${t.id||table.numero_mesa}, ${state[1]}, ${table.capacidad} personas`} onKeyDown={e=>{if(!disabled&&(e.key==='Enter'||e.key===' ')){e.preventDefault();if(isChoosing)selectTable(table);else setMenu(table);}}} onClick={()=>{if(disabled)return;if(isChoosing)selectTable(table);else setMenu(table);}} style={{cursor:disabled?'default':'pointer',opacity:(isChoosing&&disabled)?0.55:1}}>
     <rect x={-Math.max(52,t.ancho||52)/2} y={-Math.max(52,t.alto||52)/2} width={Math.max(52,t.ancho||52)} height={Math.max(52,t.alto||52)} fill="transparent"/>
     <rect x={-(t.ancho||52)/2} y={-(t.alto||40)/2} width={t.ancho||52} height={t.alto||40} rx={table.forma==='redonda'?30:6} fill={state[3]} stroke={chosen.includes(table.id)?'#fde047':'#fff'} strokeWidth={chosen.includes(table.id)?6:2}/>
     <text fill="white" textAnchor="middle" y="-2" dominantBaseline="middle">{t.displayLabel||t.id||table.numero_mesa}</text><text fill="white" textAnchor="middle" y="13" fontSize="11">{state[2]} {table.capacidad}p</text>
    </g>;})}
   </svg></div>{isChoosing&&groupMode&&<div className="ops-group-confirm"><button className="ops-primary" disabled={busy||!chosen.length||chosenCapacity<guest.cantidad_personas} onClick={()=>assign(data.mesas.find(t=>chosen.includes(t.id)))}>{busy?'Asignando…':`Asignar ${chosen.length} mesas`}</button></div>}{!isChoosing&&<aside className="ops-waiting"><h2>En espera <span>{data.espera.length}</span></h2>{data.espera.map(s=><button key={s.id} onClick={()=>{setSession(s);setGuest({...s,request_key:s.request_key});setGroupMode(s.cantidad_personas>8);setChosen([]);setStep(3);}}><strong>{s.cliente_nombre}</strong><span>{s.cantidad_personas} personas · {timeText(s.hora_registro)}</span><b>Asignar mesa →</b></button>)}{!data.espera.length&&<p>Sin clientes en espera</p>}</aside>}</div>
  </>}
  {menu&&<div className="ops-modal-backdrop" onClick={()=>setMenu(null)}><section className="ops-modal" role="dialog" aria-modal="true" aria-label="Estado de mesa" onClick={e=>e.stopPropagation()}><header><h2>Mesa {menu.layout_data?.id||menu.numero_mesa}</h2><button onClick={()=>setMenu(null)} aria-label="Cerrar">✕</button></header><p>{menu.cliente_nombre||'Libre'} · {menu.capacidad} personas</p>{menu.sesion_id?<div className="ops-state-buttons">{states.map(([state,label,icon,color])=><button key={state} disabled={busy||!online} style={{background:color,color:'white'}} onClick={()=>change(state)}>{icon} {label}</button>)}</div>:<button className="ops-primary" onClick={()=>{setMenu(null);setGuest(fresh());setSession(null);setStep(0);}}>Registrar cliente</button>}</section></div>}
 </section>;
}
