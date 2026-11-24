import { useEffect, useState } from 'react';
import { FloorPlanBackground } from '../reservation/table-selection/components/FloorPlanBackground';
import { initializeFloorLayouts, loadFloorLayout, saveFloorLayout } from '../reservation/table-selection/services/floorLayoutStorage';
import './venue-editors.css';

const adminHeaders = () => {
  let session;
  try { session = JSON.parse(localStorage.getItem('punto29-admin-session') || 'null'); } catch { /* No session */ }
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.token || ''}` };
};
async function request(url, method = 'GET', body, signal) {
  const response = await fetch(url, { method, headers: adminHeaders(), body: body === undefined ? undefined : JSON.stringify(body), signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No se pudo guardar. Intenta nuevamente.');
  return data;
}
const venueFloor = (sede, piso) => Number(sede) === 20 ? (piso === 1 ? 'first' : 'second') : Number(sede) === 17 && piso === 1 ? 'venue17' : `sede-${sede}-piso-${piso}`;

export function VenueCroquis({ sede, onBack }) {
  const [piso, setPiso] = useState(1);
  const [layouts, setLayouts] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [drag, setDrag] = useState(null);
  const [dirty, setDirty] = useState([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const floor = venueFloor(sede.id, piso);
  const tables = layouts?.[floor] || [];
  const selected = tables.find(t => t.id === selectedId);
  useEffect(() => {
    let cancelled = false;
    initializeFloorLayouts().then(() => {
      if (!cancelled) setLayouts(Object.fromEntries([1,2].map(p => { const key = venueFloor(sede.id, p); return [key, loadFloorLayout(key, [])]; })));
    }).catch(error => { if (!cancelled) setStatus(error.message); });
    return () => { cancelled = true; };
  }, [sede.id]);
  const change = (next) => {
    setLayouts(current => ({ ...current, [floor]: next }));
    setDirty(current => [...new Set([...current, floor])]);
    setStatus('Cambios sin guardar');
  };
  const update = (patch) => change(tables.map(t => t.id === selectedId ? { ...t, ...patch, ...(patch.numero !== undefined ? { displayLabel: String(patch.numero) } : {}) } : t));
  const add = () => {
    const numero = Math.max(0, ...tables.map(t => Number(t.numero) || 0)) + 1;
    const prefix = floor === 'venue17' ? 'M' : piso === 1 ? 'P' : 'N';
    let id = `${prefix}${numero}`;
    while (tables.some(t => t.id === id)) id += 'n';
    change([...tables, { id, numero, capacidad: 2, zona: `Piso ${piso}`, forma: 'cuadrada', x: 300, y: 400, ancho: 48, alto: 48, rotacion: 0, activa: true, unible: true, tipo: 'standard', equivalenciaMesas: 1, piso: floor }]);
    setSelectedId(id);
  };
  const save = async () => {
    setBusy(true);
    try {
      for (const key of dirty) await saveFloorLayout(key, layouts[key]);
      setDirty([]); setStatus('Croquis guardado. Reservas y Mesas en Vivo actualizados.');
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  };
  return <div className="phase2-panel venue-editor">
    <button type="button" onClick={onBack}>← Volver a Sedes</button>
    <h1>Editar croquis · {sede.nombre}</h1>
    <p role="status">{status || (!layouts ? 'Cargando croquis…' : 'Selecciona una mesa para editarla o arrástrala en el mapa.')}</p>
    <fieldset disabled={busy || !layouts}>
      <div className="venue-toolbar">{[1,2].map(p => <button type="button" key={p} aria-pressed={piso === p} onClick={() => { setPiso(p); setSelectedId(null); }}>Piso {p}</button>)}<button type="button" onClick={add}>Agregar mesa</button><button type="button" onClick={save} disabled={!dirty.length}>Guardar Croquis</button></div>
      <div className="venue-workspace">
        <svg className="venue-map" viewBox={floor === 'venue17' ? '80 30 452 710' : '0 0 632 884'} aria-label={`Croquis de ${sede.nombre}, piso ${piso}`} onPointerMove={event => {
          if (!drag || busy) return;
          const point = event.currentTarget.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
          const position = point.matrixTransform(event.currentTarget.getScreenCTM().inverse());
          change(tables.map(t => t.id === drag ? { ...t, x: Math.round(position.x), y: Math.round(position.y) } : t));
        }} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}>
          {['first','second','venue17'].includes(floor) && <FloorPlanBackground floor={floor} />}
          {tables.map(t => <g key={t.id} transform={`translate(${t.x} ${t.y}) rotate(${t.rotacion})`} tabIndex={0} role="button" aria-label={`Mesa ${t.numero ?? t.id}`} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setSelectedId(t.id); }} onPointerDown={event => { if (busy) return; setSelectedId(t.id); setDrag(t.id); event.currentTarget.ownerSVGElement.setPointerCapture(event.pointerId); }}>
            <rect x={-t.ancho/2} y={-t.alto/2} width={t.ancho} height={t.alto} rx={t.forma === 'redonda' ? Math.min(t.ancho,t.alto)/2 : 5} fill={t.id === selectedId ? '#eaad41' : '#fff3cf'} stroke="#68391e" strokeWidth="3" />
            <text textAnchor="middle" dominantBaseline="middle" fill="#271b0d">{t.numero ?? t.id}</text>
          </g>)}
        </svg>
        <aside>{selected ? <>
          <h2>Mesa {selected.numero ?? selected.id}</h2>
          {[['numero','Número de mesa',1],['capacidad','Capacidad',1],['x','Posición X'],['y','Posición Y'],['ancho','Ancho',1],['alto','Alto',1],['rotacion','Rotación']].map(([key,label,min]) => <label key={key}>{label}<input type="number" min={min} value={selected[key] ?? ''} onChange={event => update({ [key]: Number(event.target.value) })} /></label>)}
          <label>Zona<input value={selected.zona || ''} onChange={event => update({ zona: event.target.value })} /></label>
          <label>Forma<select value={selected.forma || 'cuadrada'} onChange={event => update({ forma: event.target.value, ...(event.target.value !== 'rectangular' ? { alto: selected.ancho } : {}) })}><option value="cuadrada">Cuadrada</option><option value="rectangular">Rectangular</option><option value="redonda">Redonda</option></select></label>
          <button type="button" onClick={() => { change(tables.filter(t => t.id !== selectedId)); setSelectedId(null); }}>Eliminar mesa</button>
        </> : <p>Selecciona una mesa. Puedes editar ambos pisos antes de guardar.</p>}</aside>
      </div>
    </fieldset>
  </div>;
}

const turns = [['dia','Día'],['noche','Noche'],['bar','Bar']];
const emptyProduct = () => ({ titulo: '', categoria: '', descripcion: '', precio: '', stock: 0, imagen_url: '', activo: true });
export function VenueCarta({ sede, onBack, onUpdate, ImageInput }) {
  const [venue, setVenue] = useState(sede);
  const [turno, setTurno] = useState(turns.find(([key]) => sede[`tiene_carta_${key}`])?.[0] || 'dia');
  const [products, setProducts] = useState([]);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [version, setVersion] = useState(0);
  const activeTurns = turns.filter(([key]) => venue[`tiene_carta_${key}`]);
  const url = `/api/admin/carta-productos?sede_id=${sede.id}&turno=${turno}`;
  useEffect(() => {
    const controller = new AbortController();
    request(url, 'GET', undefined, controller.signal).then(setProducts).catch(error => { if (error.name !== 'AbortError') setStatus(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [url, version]);
  const run = async (action) => { setBusy(true); setStatus(''); try { await action(); } catch (error) { setStatus(error.message); } finally { setBusy(false); } };
  const refresh = () => { setLoading(true); setVersion(v => v + 1); };
  return <div className="phase2-panel venue-editor">
    <button type="button" onClick={onBack}>← Volver a Sedes</button><h1>Personalizar Carta · {venue.nombre}</h1>
    <p role="status">{status}</p>
    <fieldset disabled={busy}>
      <div className="venue-toolbar">{turns.map(([key,label]) => <label key={key}><input type="checkbox" role="switch" checked={venue[`tiene_carta_${key}`]} onChange={event => {
        const next = { ...venue, [`tiene_carta_${key}`]: event.target.checked };
        run(async () => {
          const saved = await request(`/api/admin/sedes/${sede.id}/cartas`, 'PATCH', next);
          setVenue(saved); onUpdate(saved); setDraft(null);
          if (!saved[`tiene_carta_${turno}`]) { setTurno(turns.find(([k]) => saved[`tiene_carta_${k}`])?.[0] || 'dia'); setLoading(true); refresh(); }
          setStatus('Disponibilidad de cartas guardada.');
        });
      }} />Carta {label}</label>)}</div>
      <div className="venue-toolbar" role="tablist" aria-label="Cartas activas">{activeTurns.map(([key,label]) => <button type="button" role="tab" aria-selected={turno === key} key={key} onClick={() => { if (key === turno) return; setTurno(key); setDraft(null); setProducts([]); setLoading(true); }}>{label}</button>)}</div>
      {!activeTurns.length ? <p>Activa una carta para administrar sus productos.</p> : <>
        <button type="button" onClick={() => setDraft(emptyProduct())}>Agregar plato o bebida</button>
        <div className="phase2-grid"><section>
          {loading ? <p role="status">Cargando productos…</p> : products.map(product => <article className="phase2-list-item" key={product.id}>
            {product.imagen_url && <img loading="lazy" className="venue-product-image" src={product.imagen_url} alt={product.titulo} />}
            <div><strong>{product.titulo}</strong><p>{product.categoria} · S/ {Number(product.precio).toFixed(2)} · Stock: {product.stock}</p></div>
            <button type="button" onClick={() => setDraft(product)}>Editar</button>
            <button type="button" onClick={() => run(async () => { await request(url,'PUT',{ ...product, activo: !product.activo }); refresh(); })}>{product.activo ? 'Desactivar' : 'Activar'}</button>
            <button type="button" onClick={() => run(async () => { await request(url,'DELETE',{ id: product.id }); if (draft?.id === product.id) setDraft(null); refresh(); })}>Eliminar</button>
          </article>)}
          {!loading && !products.length && <p>No hay productos en esta carta.</p>}
        </section>{draft && <form onSubmit={event => { event.preventDefault(); run(async () => { await request(url, draft.id ? 'PUT' : 'POST', draft); setDraft(null); refresh(); setStatus('Producto guardado.'); }); }}>
          <h2>{draft.id ? 'Editar producto' : 'Nuevo producto'}</h2>
          <label>Título<input required value={draft.titulo} onChange={event => setDraft({ ...draft, titulo: event.target.value })} /></label>
          <label>Categoría<input value={draft.categoria} onChange={event => setDraft({ ...draft, categoria: event.target.value })} /></label>
          <label>Descripción<textarea value={draft.descripcion} onChange={event => setDraft({ ...draft, descripcion: event.target.value })} /></label>
          <label>Precio (S/)<input required type="number" min="0" step="0.01" value={draft.precio} onChange={event => setDraft({ ...draft, precio: event.target.value })} /></label>
          <label>Stock<input required type="number" min="0" step="1" value={draft.stock} onChange={event => setDraft({ ...draft, stock: event.target.value })} /></label>
          <ImageInput label="Foto del producto" value={draft.imagen_url} onChange={value => setDraft({ ...draft, imagen_url: value })} />
          <label><input type="checkbox" checked={draft.activo} onChange={event => setDraft({ ...draft, activo: event.target.checked })} />Producto activo</label>
          <button type="submit">Guardar producto</button><button type="button" onClick={() => setDraft(null)}>Cancelar</button>
        </form>}</div>
      </>}
    </fieldset>
  </div>;
}

export function VenueLiveTables() {
  const [sedes, setSedes] = useState([]);
  const [sede, setSede] = useState('');
  const [tables, setTables] = useState([]);
  const [status, setStatus] = useState('');
  useEffect(() => {
    request('/api/admin/sedes').then(rows => { setSedes(rows); setSede(String(rows[0]?.id || '')); }).catch(error => setStatus(error.message));
  }, []);
  useEffect(() => {
    if (!sede) return;
    let cancelled = false;
    const refresh = () => request(`/api/admin/sedes/${sede}/mesas`).then(rows => { if (!cancelled) { setTables(rows); setStatus(''); } }).catch(error => { if (!cancelled) setStatus(error.message); });
    refresh();
    const events = new EventSource('/api/floor-layout-events');
    events.onmessage = refresh;
    const timer = setInterval(refresh, 15000);
    return () => { cancelled = true; clearInterval(timer); events.close(); };
  }, [sede]);
  return <div className="phase2-panel"><h1>Mesas en Vivo</h1><p role="status">{status}</p><label>Sede<select value={sede} onChange={event => { setSede(event.target.value); setTables([]); }}>{sedes.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>{[1,2].map(piso => <section key={piso}><h2>Piso {piso}</h2><div className="phase2-grid">{tables.filter(t => t.piso === piso).map(t => <article className="phase2-list-item" key={t.id}><strong>Mesa {t.numero_mesa}</strong><span>{t.capacidad} personas · {t.zona} · {t.estado_actual}</span></article>)}</div></section>)}</div>;
}
