export function headers(){let session;try{session=JSON.parse(localStorage.getItem('punto29-admin-session')||'null');}catch{/* signed out */}return {'Content-Type':'application/json',Authorization:`Bearer ${session?.token||''}`};}
export async function api(path,method='GET',body,signal){
 const response=await fetch(path,{method,headers:headers(),body:body===undefined?undefined:JSON.stringify(body),signal});
 const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'No se pudo completar la operación.'),{status:response.status});return data;
}
export async function download(path,name){const response=await fetch(path,{headers:headers()});if(!response.ok){const data=await response.json();throw new Error(data.error||'No se pudo descargar.');}const url=URL.createObjectURL(await response.blob());const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function subscribeOperations(callback){const events=new EventSource('/api/operaciones/events');events.onmessage=callback;events.onopen=callback;const timer=setInterval(callback,15000);window.addEventListener('online',callback);return()=>{events.close();clearInterval(timer);window.removeEventListener('online',callback);};}
export const peruDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const timeText=value=>value?new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',hour:'2-digit',minute:'2-digit'}).format(new Date(value)):'—';
export const mealTurn=value=>value==='Turno noche'?'noche':value==='Turno día'?'dia':value;
