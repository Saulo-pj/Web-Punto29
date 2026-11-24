import { useEffect, useRef, useState } from "react";
import { FiCamera, FiGlobe, FiPlus, FiSave, FiUserPlus } from "react-icons/fi";
import { VenueCarta, VenueCroquis } from './VenueEditors';

const permissions = [
  "Dashboard",
  "Sedes y Cartas",
  "Croquis de Mesas",
  "Reservas y Escáner QR",
  "Cortesías Cumpleaños",
  "Mesas en Vivo",
  "Lista de Espera",
  "Carta y Stock",
  "Reseñas y Galería",
];

const getSession = () => {
  try { return JSON.parse(localStorage.getItem("punto29-admin-session") || "null"); } catch { return null; }
};

const authHeaders = () => {
  const session = getSession();
  return {
    "Content-Type": "application/json",
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
  };
};

const parsePermissions = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const ImageInput = ({ label, value, onChange }) => {
  const inputRef = useRef(null);
  const [error, setError] = useState("");
  const choose = (file) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setError("Usa JPG, PNG, WebP o GIF de máximo 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { onChange(String(reader.result)); setError(""); };
    reader.readAsDataURL(file);
  };
  return (
    <div className="phase2-image-input">
      <button type="button" onClick={() => inputRef.current?.click()}><FiCamera aria-hidden="true" /> {label}</button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => choose(event.target.files?.[0])} hidden />
      <label><FiGlobe aria-hidden="true" /> URL directa<input type="url" value={(value?.startsWith("data:image/") || value?.startsWith("/api/sedes/")) ? "" : value || ""} onChange={(event) => onChange(event.target.value)} placeholder="https://..." /></label>
      {value && <img loading="lazy" src={value} alt="" onError={(event) => { event.currentTarget.src = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=700&q=85"; }} />}
      {error && <small role="alert">{error}</small>}
    </div>
  );
};

let venuePanelCache = null;
export const SedesPanel = () => {
  const [sedes, setSedes] = useState(() => venuePanelCache?.sedes || []);
  const [editor, setEditor] = useState(null);
  const [selected, setSelected] = useState(null);
  const [config, setConfig] = useState(() => venuePanelCache?.config || {});
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = async () => {
    try {
      const venueResponse = await fetch("/api/admin/sedes", { headers: authHeaders() });
      if (!venueResponse.ok) throw new Error(`Sedes: ${venueResponse.status}`);
      const venueData = await venueResponse.json();
      venuePanelCache = { ...venuePanelCache, sedes: safeArray(venueData) };
      setSedes(venuePanelCache.sedes);
      setLoadError('');
    } catch (error) {
      setLoadError(error.message || "No se pudieron cargar las sedes.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/configuracion', { headers: authHeaders(), signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('No se pudo cargar el fondo de reservas.');
      const data = await response.json();
      venuePanelCache = { ...venuePanelCache, config: data };
      setConfig(data);
    }).catch(error => { if (error.name !== 'AbortError') setStatus(error.message); });
    return () => controller.abort();
  }, []);

  const save = async (event) => {
    event.preventDefault();
    const response = await fetch("/api/admin/sedes", { method: "POST", headers: authHeaders(), body: JSON.stringify(selected) });
    if (!response.ok) throw new Error("No se pudo guardar la sede.");
    setSelected(await response.json());
    setStatus("Sede guardada.");
    load();
  };

  const saveBackground = async () => {
    const response = await fetch("/api/admin/configuracion", { method: "PUT", headers: authHeaders(), body: JSON.stringify(config) });
    if (response.ok) setStatus("Fondo de reservas actualizado.");
  };

  if (editor?.type === 'croquis') return <VenueCroquis sede={editor.sede} onBack={() => setEditor(null)} />;
  if (editor?.type === 'carta') return <VenueCarta sede={editor.sede} ImageInput={ImageInput} onBack={() => setEditor(null)} onUpdate={sede => {
    setSedes(current => {
      const next = current.map(item => item.id === sede.id ? sede : item);
      venuePanelCache = { ...venuePanelCache, sedes: next };
      return next;
    });
    if (selected?.id === sede.id) setSelected(current => ({ ...current, tiene_carta_dia: sede.tiene_carta_dia, tiene_carta_noche: sede.tiene_carta_noche, tiene_carta_bar: sede.tiene_carta_bar }));
  }} />;

  return (
    <div className="phase2-panel">
      <header><div><p>Módulo operativo</p><h1>Sedes y Cartas</h1></div><button type="button" onClick={() => setSelected({ nombre: "", direccion: "", google_maps_url: "", imagen_url: "", tiene_carta_dia: true, tiene_carta_noche: true, tiene_carta_bar: true, activa: true })}><FiPlus />Nueva sede</button></header>
      {status && <p className="phase2-status" role="status">{status}</p>}
      {loading && <p className="phase2-status" role="status">Cargando sedes…</p>}
      {loadError && <p className="phase2-error" role="alert">{loadError}</p>}
      <div className="phase2-grid">
        <section>
          <h2>Ver sedes activas</h2>
          {loading && !sedes.length && <div role="status" aria-label="Cargando sedes"><div className="venue-skeleton" /><div className="venue-skeleton" /></div>}
          {safeArray(sedes).map((sede) => (
            <div className={`phase2-list-item${selected?.id === sede.id ? " is-active" : ""}`} key={sede.id}>
              <button type="button" className="phase2-venue-select" onClick={() => setSelected(sede)}>
                <strong>{sede.nombre}</strong><span>{sede.direccion}</span>
              </button>
              <button
                type="button"
                className="phase2-croquis-link"
                onClick={() => setEditor({ type: 'croquis', sede })}
              >
                Editar croquis
              </button>
              <button type="button" onClick={() => setEditor({ type: 'carta', sede })}>Personalizar Carta</button>
            </div>
          ))}
          {!loading && safeArray(sedes).length === 0 && <p>No hay sedes registradas.</p>}
        </section>
        {selected && (
          <form onSubmit={(event) => { save(event).catch((error) => setStatus(error.message)); }}>
            <h2>{selected.id ? `Editar ${selected.nombre}` : "Nueva sede"}</h2>
            <label>Nombre<input value={selected.nombre || ""} onChange={(event) => setSelected({ ...selected, nombre: event.target.value })} required /></label>
            <label>Dirección<input value={selected.direccion || ""} onChange={(event) => setSelected({ ...selected, direccion: event.target.value })} /></label>
            <label>Google Maps<input type="url" value={selected.google_maps_url || ""} onChange={(event) => setSelected({ ...selected, google_maps_url: event.target.value })} /></label>
            <ImageInput label="Fotografía de la sede" value={selected.imagen_url || ""} onChange={(value) => setSelected({ ...selected, imagen_url: value })} />
            <div className="phase2-checks">
              {["tiene_carta_dia", "tiene_carta_noche", "tiene_carta_bar", "activa"].map((key) => (
                <label key={key}><input type="checkbox" checked={Boolean(selected[key])} onChange={(event) => setSelected({ ...selected, [key]: event.target.checked })} />{key.replace("tiene_carta_", "Carta ").replace("activa", "Sede activa")}</label>
              ))}
            </div>
            <button type="submit" className="phase2-save"><FiSave />Guardar sede</button>
          </form>
        )}
      </div>
      <section className="phase2-background">
        <h2>Fondo de reservas</h2>
        <ImageInput label="Cambiar fondo" value={config.fondo_reservas_url || ""} onChange={(value) => setConfig({ ...config, fondo_reservas_url: value })} />
        <button type="button" onClick={saveBackground} className="phase2-save"><FiSave />Guardar fondo</button>
      </section>
    </div>
  );
};

export const UsersPanel = () => {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState({ nombre_rol: "", permisos_json: {} });
  const [user, setUser] = useState({ username: "", password: "", role_id: "", activo: true });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [roleResponse, userResponse] = await Promise.all([
        fetch("/api/admin/roles", { headers: authHeaders() }),
        fetch("/api/admin/users", { headers: authHeaders() }),
      ]);
      if (!roleResponse.ok) throw new Error(`Roles: ${roleResponse.status}`);
      if (!userResponse.ok) throw new Error(`Usuarios: ${userResponse.status}`);
      const [roleData, userData] = await Promise.all([roleResponse.json(), userResponse.json()]);
      setRoles(safeArray(roleData).map((item) => ({ ...item, permisos_json: parsePermissions(item.permisos_json) })));
      setUsers(safeArray(userData));
    } catch (error) {
      setRoles([]);
      setUsers([]);
      setLoadError(error.message || "No se pudieron cargar usuarios y perfiles.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const saveRole = async () => {
    const response = await fetch("/api/admin/roles", { method: "POST", headers: authHeaders(), body: JSON.stringify(role) });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.error || "No se pudo guardar el perfil.");
    }
    setStatus("Perfil guardado.");
    load();
  };
  const saveUser = async () => {
    const response = await fetch("/api/admin/users", { method: "POST", headers: authHeaders(), body: JSON.stringify(user) });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.error || "No se pudo guardar el usuario.");
    }
    setStatus("Usuario guardado.");
    load();
  };
  return (
    <div className="phase2-panel">
      <header><div><p>Accesos administrativos</p><h1>Usuarios y Permisos</h1></div></header>
      {status && <p className="phase2-status" role="status">{status}</p>}
      {loading && <p className="phase2-status" role="status">Cargando perfiles y usuarios…</p>}
      {loadError && <p className="phase2-error" role="alert">{loadError}</p>}
      <div className="phase2-grid">
        <section>
          <h2>Nuevo perfil</h2>
          <label>Nombre del perfil<input value={role.nombre_rol} onChange={(event) => setRole({ ...role, nombre_rol: event.target.value })} /></label>
          <div className="phase2-permissions">
            {permissions.map((permission) => (
              <label key={permission}><input type="checkbox" checked={Boolean(role.permisos_json[permission])} onChange={(event) => setRole({ ...role, permisos_json: { ...role.permisos_json, [permission]: event.target.checked } })} />{permission}</label>
            ))}
          </div>
          <button type="button" className="phase2-save" onClick={() => saveRole().catch((error) => setStatus(error.message))}><FiPlus />Guardar perfil</button>
          <h2>Perfiles existentes</h2>
          {safeArray(roles).map((item) => (
            <button
              type="button"
              className="phase2-list-item"
              key={item.id}
              onClick={() => setRole({ nombre_rol: item.nombre_rol, permisos_json: parsePermissions(item.permisos_json) })}
            >
              <strong>{item.nombre_rol}</strong>
              <span>{Object.values(parsePermissions(item.permisos_json)).filter(Boolean).length} permisos activos</span>
            </button>
          ))}
          {!loading && safeArray(roles).length === 0 && <p>No hay perfiles registrados.</p>}
          <h2>Usuarios</h2>
          {safeArray(users).map((item) => <div className="phase2-list-item" key={item.id}><strong>{item.username}</strong><span>{item.nombre_rol} · {item.activo ? "Activo" : "Inactivo"}</span></div>)}
        </section>
        <section>
          <h2>Crear usuario</h2>
          <label>Usuario<input value={user.username} onChange={(event) => setUser({ ...user, username: event.target.value })} /></label>
          <label>Contraseña<input type="password" value={user.password} onChange={(event) => setUser({ ...user, password: event.target.value })} /></label>
          <label>Perfil<select value={user.role_id} onChange={(event) => setUser({ ...user, role_id: Number(event.target.value) })}><option value="">Selecciona un perfil</option>{safeArray(roles).map((item) => <option key={item.id} value={item.id}>{item.nombre_rol}</option>)}</select></label>
          <label><input type="checkbox" checked={user.activo} onChange={(event) => setUser({ ...user, activo: event.target.checked })} />Usuario activo</label>
          <button type="button" className="phase2-save" onClick={() => saveUser().catch((error) => setStatus(error.message))}><FiUserPlus />Guardar usuario</button>
        </section>
      </div>
    </div>
  );
};

export const SecurityPanel = () => {
  const [username, setUsername] = useState(getSession()?.user?.username || "");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const save = async () => {
    const response = await fetch("/api/admin/account", { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ username, password }) });
    if (!response.ok) throw new Error("No se pudieron guardar las credenciales.");
    setStatus("Credenciales actualizadas.");
  };
  return (
    <div className="phase2-panel">
      <header><div><p>Protección de cuenta</p><h1>Mi Cuenta / Seguridad</h1></div></header>
      {status && <p className="phase2-status" role="status">{status}</p>}
      <div className="phase2-security">
        <label>Usuario<input value={username} onChange={(event) => setUsername(event.target.value)} /></label>
        <label>Nueva contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Deja vacío para conservarla" /></label>
        <button type="button" className="phase2-save" onClick={() => save().catch((error) => setStatus(error.message))}><FiSave />Guardar credenciales</button>
      </div>
    </div>
  );
};
