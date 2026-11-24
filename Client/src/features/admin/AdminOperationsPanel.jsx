import { useEffect, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { FiCamera, FiCheck, FiSave, FiX } from "react-icons/fi";

const getSession = () => {
  try { return JSON.parse(localStorage.getItem("punto29-admin-session") || "null"); } catch { return null; }
};
const headers = () => {
  const session = getSession();
  return { "Content-Type": "application/json", Authorization: `Bearer ${session?.token || ""}` };
};

const placeholder = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=700&q=85";

export const CourtesyPanel = () => {
  const [items, setItems] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [draft, setDraft] = useState({ sede_id: 17, turno: "dia", titulo_cortesia: "", descripcion: "", imagen_url: "", activa: true });
  const [status, setStatus] = useState("");
  const load = async () => {
    const [courtesy, venues] = await Promise.all([
      fetch("/api/admin/cortesias", { headers: headers() }).then((response) => response.ok ? response.json() : []),
      fetch("/api/admin/sedes", { headers: headers() }).then((response) => response.ok ? response.json() : []),
    ]);
    setItems(courtesy); setSedes(venues);
  };
  useEffect(() => { load(); }, []);
  const save = async () => {
    const response = await fetch("/api/admin/cortesias", { method: "POST", headers: headers(), body: JSON.stringify(draft) });
    if (!response.ok) throw new Error("No se pudo guardar la cortesía.");
    setStatus("Cortesía guardada.");
    setDraft({ ...draft, titulo_cortesia: "", descripcion: "", imagen_url: "" });
    load();
  };
  return (
    <div className="phase2-panel">
      <header><div><p>Celebraciones</p><h1>Cortesías Cumpleaños</h1></div></header>
      {status && <p className="phase2-status" role="status">{status}</p>}
      <div className="phase2-grid">
        <section>
          <h2>Nueva cortesía</h2>
          <label>Sede<select value={draft.sede_id} onChange={(event) => setDraft({ ...draft, sede_id: Number(event.target.value) })}>{sedes.map((sede) => <option key={sede.id} value={sede.id}>{sede.nombre}</option>)}</select></label>
          <label>Turno<select value={draft.turno} onChange={(event) => setDraft({ ...draft, turno: event.target.value })}><option value="dia">Turno día</option><option value="noche">Turno noche</option></select></label>
          <label>Título<input value={draft.titulo_cortesia} onChange={(event) => setDraft({ ...draft, titulo_cortesia: event.target.value })} /></label>
          <label>Descripción<textarea value={draft.descripcion} onChange={(event) => setDraft({ ...draft, descripcion: event.target.value })} /></label>
          <label>URL de foto<input type="url" value={draft.imagen_url} onChange={(event) => setDraft({ ...draft, imagen_url: event.target.value })} /></label>
          <label>Foto local<input type="file" accept="image/*" onChange={(event) => {
            const file = event.target.files?.[0]; if (!file) return;
            if (file.size > 2 * 1024 * 1024) { setStatus("La foto debe pesar 2 MB o menos."); return; }
            const reader = new FileReader(); reader.onload = () => setDraft({ ...draft, imagen_url: String(reader.result) }); reader.readAsDataURL(file);
          }} /></label>
          {draft.imagen_url && <img className="phase2-courtesy-preview" src={draft.imagen_url} alt="" onError={(event) => { event.currentTarget.src = placeholder; }} />}
          <label><input type="checkbox" checked={draft.activa} onChange={(event) => setDraft({ ...draft, activa: event.target.checked })} />Activa</label>
          <button type="button" className="phase2-save" onClick={() => save().catch((error) => setStatus(error.message))}><FiSave />Guardar cortesía</button>
        </section>
        <section>
          <h2>Cortesías configuradas</h2>
          {items.map((item) => (
            <article className="phase2-courtesy-item" key={item.id}>
              {item.imagen_url && <img src={item.imagen_url} alt="" onError={(event) => { event.currentTarget.src = placeholder; }} />}
              <div><strong>{item.titulo_cortesia}</strong><span>Sede {item.sede_id} · Turno {item.turno}</span><p>{item.descripcion}</p></div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
};

export const QrVerificationPanel = () => {
  const [scannerInstance, setScannerInstance] = useState(null);
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => () => {
    scannerInstance?.stop().catch(() => {});
  }, [scannerInstance]);

  const verify = async (value) => {
    setError(""); setResult(null);
    let reservationCode = value.trim();
    try {
      const url = new URL(reservationCode);
      reservationCode = url.searchParams.get("codigo") || reservationCode;
    } catch {}
    try {
      const response = await fetch(`/api/admin/reservas?codigo=${encodeURIComponent(reservationCode)}`, { headers: headers() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se encontró la reserva.");
      setResult({ reservation: data, state: "data" });
    } catch (lookupError) {
      setError(lookupError.message);
    }
  };

  const confirm = async () => {
    if (!result?.reservation?.codigo_reserva) return;
    const response = await fetch(`/api/admin/reservas?codigo=${encodeURIComponent(result.reservation.codigo_reserva)}`, { method: "PATCH", headers: headers() });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "No se pudo verificar."); return; }
    setResult({ reservation: data, state: "verified" });
  };

  const startCamera = async () => {
    if (!window.isSecureContext) { setError("La cámara requiere HTTPS o localhost."); return; }
    const scanner = new Html5Qrcode("qr-scanner");
    try {
      await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 230 }, (decoded) => {
        setCode(decoded); verify(decoded); scanner.stop().catch(() => {});
      }, () => {});
      setScannerInstance(scanner);
    } catch (cameraError) { setError(cameraError.message || "No se pudo acceder a la cámara."); }
  };

  return (
    <div className="phase2-panel">
      <header><div><p>Control de ingreso</p><h1>Verificar Reserva (QR)</h1></div></header>
      <div className="phase2-grid">
        <section>
          <button type="button" className="phase2-save" onClick={startCamera}><FiCamera />Escanear con cámara</button>
          <div id="qr-scanner" className="qr-scanner" />
          <label>Código manual<input value={code} onChange={(event) => setCode(event.target.value)} placeholder="P29-..." /></label>
          <button type="button" className="phase2-save" onClick={() => verify(code)}>Consultar reserva</button>
        </section>
        <section>
          {error && <p className="phase2-error" role="alert"><FiX />{error}</p>}
          {result && (
            <div className="phase2-verification">
              {result.state === "verified" && <div className="phase2-check"><FiCheck /></div>}
              <h2>{result.reservation.cliente_nombre || "Reserva"}</h2>
              <p><b>Código:</b> {result.reservation.codigo_reserva}</p>
              <p><b>Sede:</b> {result.reservation.sede_nombre || result.reservation.sede_id}</p>
              <p><b>Fecha:</b> {result.reservation.fecha_reserva} · {result.reservation.hora_reserva}</p>
              {result.reservation.es_cumpleanos && <p className="phase2-birthday"><b>🎂 Cumpleaños:</b> Solicitar DNI físico.</p>}
              {result.state !== "verified" && <button type="button" className="phase2-save" onClick={confirm}><FiCheck />Verificar entrada</button>}
              {result.state === "verified" && <strong>Reserva verificada en local</strong>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
