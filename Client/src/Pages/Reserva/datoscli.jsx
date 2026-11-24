import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { MenuPicker } from '../../features/operations/Shop';
import restaurantImage from "../../assets/Image/Restaurante.jpg";
import logo from "../../assets/Image/Logo.png";
import "./Reserva.css";
import { ReservationProgress } from "./ReservationProgress";
import { getBirthdayCourtesies, RESERVATION_REASONS } from "./reservationOptions";

const DatosCliente = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const people = params.get("personas") || "2";
    const mesa = params.get("mesa") || "por confirmar";
    const [reason, setReason] = useState(params.get("motivo") || "");
    const [birthdayCourtesies, setBirthdayCourtesies] = useState([]);
    const [preorder,setPreorder]=useState(false);
    const [preorderItems,setPreorderItems]=useState([]);
    const [preorderSummary,setPreorderSummary]=useState({invalid:false});
    const [submitError,setSubmitError]=useState('');
    const [saving,setSaving]=useState(false);
    const requestKey=useRef(crypto.randomUUID());
    useEffect(() => {
        const sedeId = params.get("sede");
        const turno = params.get("turno") === "Turno noche" ? "noche" : "dia";
        fetch(`/api/cortesias?sede_id=${encodeURIComponent(sedeId)}&turno=${turno}`)
            .then((response) => response.ok ? response.json() : [])
            .then((items) => setBirthdayCourtesies(Array.isArray(items) ? items : []))
            .catch(() => setBirthdayCourtesies(getBirthdayCourtesies(sedeId, params.get("turno")).map((titulo_cortesia) => ({ titulo_cortesia }))));
    }, [params]);
    const isBirthday = reason === "cumpleanos";
    const submit = async (event) => {
        event.preventDefault();
        if(saving)return;
        setSaving(true);setSubmitError('');
        const query = new URLSearchParams(params);
        const form = new FormData(event.currentTarget);
        form.forEach((value, key) =>
            query.set(key, value),
        );
        const venueId = Number(params.get("sede"));
        const courtship = birthdayCourtesies.find((item) => item.titulo_cortesia === form.get("cortesia"));
        const birthDate = form.get("cumpleanero_fecha_nac");
        try {
            const reservationResponse = await fetch("/api/operaciones/reservas/confirmar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sede_id: venueId,
                    mesa_ids: params.get('mesas') ? JSON.parse(params.get('mesas')) : (params.get('configuracion')?[]:(params.get('mesa')||'').split('-').filter(Boolean)),
                    configuracion: params.get('configuracion'),
                    request_key: requestKey.current,
                    items: preorder ? preorderItems : [],
                    fecha_reserva: params.get("fecha"),
                    turno: params.get("turno"),
                    hora_reserva: params.get("hora"),
                    cantidad_personas: Number(people),
                    cliente_nombre: `${form.get("nombres") || ""} ${form.get("apellidos") || ""}`.trim(),
                    cliente_telefono: form.get("telefono"),
                    cliente_email: form.get("correo"),
                    motivo_reserva: form.get("motivo"),
                    es_cumpleanos: isBirthday,
                    cortesia_id: courtship?.id || null,
                    cumpleanero_nombre: isBirthday ? form.get("cumpleanero_nombre") : null,
                    cumpleanero_dni: isBirthday ? form.get("cumpleanero_dni") : null,
                    cumpleanero_fecha_nac: isBirthday ? birthDate : null,
                }),
            });
            const reservation = await reservationResponse.json();
            if(!reservationResponse.ok)throw new Error(reservation.error||'No se pudo confirmar la reserva.');
            if (reservation?.codigo_reserva) query.set("codigo", reservation.codigo_reserva);
            if(preorder&&preorderItems.length)query.set('preorden','confirmada');
            navigate(`/reserva/confirmacion?${query.toString()}`);
        } catch (error) {
            setSubmitError(error.message||'No se pudo confirmar. Intenta nuevamente.');
        } finally {setSaving(false);}
    };

    return (
        <main
            className="reservation-page reservation-flow"
            style={{ backgroundImage: `url(${restaurantImage})` }}
        >
            <div className="reservation-shade" />
            <section className="reservation-card reservation-card--flow">
                <div className="reservation-card__brand">
                    <img src={logo} alt="Punto 29" />
                </div>
                <ReservationProgress
                    currentStep={6}
                    paths={["/reserva/personas", `/reserva/turno-hora?${params.toString()}`, `/reserva/mesa?${params.toString()}`]}
                />
                <form className="people-content client-form" onSubmit={submit}>
                    <p className="reservation-kicker">Paso 7 de 7</p>
                    <h1>Tus datos</h1>
                    <p className="people-subtitle">
                        Completa tus datos para confirmar la reserva.
                    </p>
                    <div className="reservation-summary">
                        <span>Sede {params.get("sede")}</span>
                        <span>{params.get("fecha")}</span>
                        <span>
                            {params.get("turno")} · {params.get("hora")}
                        </span>
                        <span>
                            {people} personas · Mesa {mesa}
                        </span>
                    </div>
                    <div className="client-form__grid">
                        <fieldset className="client-form__full reservation-reason">
                            <legend>¿Cuál es el motivo de tu reserva?</legend>
                            <div className="reservation-reason__options">
                                {RESERVATION_REASONS.map((option) => (
                                    <label
                                        className={`reservation-reason__option${reason === option.value ? " is-selected" : ""}`}
                                        key={option.value}
                                    >
                                        <input
                                            required
                                            type="radio"
                                            name="motivo"
                                            value={option.value}
                                            checked={reason === option.value}
                                            onChange={(event) => setReason(event.target.value)}
                                        />
                                        <span aria-hidden="true">{option.icon}</span>
                                        <b>{option.label}</b>
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                        {isBirthday && (
                            <fieldset className="client-form__full reservation-courtesy">
                                <legend>Cortesía de cumpleaños</legend>
                                <p>Selecciona la cortesía preparada para tu sede y turno.</p>
                                <div className="reservation-courtesy__options">
                                    {birthdayCourtesies.map((courtesy) => (
                                        <label key={courtesy.id || courtesy.titulo_cortesia}>
                                            <input required type="radio" name="cortesia" value={courtesy.titulo_cortesia} />
                                            {courtesy.imagen_url && (
                                                <img
                                                    src={courtesy.imagen_url}
                                                    alt=""
                                                    className="object-cover"
                                                    onError={(event) => { event.currentTarget.src = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=700&q=85"; }}
                                                />
                                            )}
                                            <b>{courtesy.titulo_cortesia}</b>
                                            {courtesy.descripcion && <span>{courtesy.descripcion}</span>}
                                        </label>
                                    ))}
                                </div>
                                <div className="birthday-details">
                                    <label>Nombre completo del cumpleañero<input required name="cumpleanero_nombre" autoComplete="name" /></label>
                                    <label>DNI del cumpleañero<input required name="cumpleanero_dni" inputMode="numeric" minLength={8} maxLength={8} pattern="[0-9]{8}" onChange={(event) => { event.target.value = event.target.value.replace(/\D/g, "").slice(0, 8); }} /></label>
                                    <label>Fecha de nacimiento<input required name="cumpleanero_fecha_nac" type="date" /></label>
                                </div>
                                <p className="birthday-dni-alert">Recuerda traer tu DNI físico el día de tu reserva para validar tu cortesía.</p>
                            </fieldset>
                        )}
                        <label>
                            Nombres completos
                            <input required name="nombres" autoComplete="given-name" />
                        </label>
                        <label>
                            Apellidos completos
                            <input required name="apellidos" autoComplete="family-name" />
                        </label>
                        <label>
                            DNI
                            <input
                                required
                                name="dni"
                                type="text"
                                inputMode="numeric"
                                autoComplete="off"
                                minLength={8}
                                maxLength={8}
                                pattern="[0-9]{8}"
                                placeholder="12345678"
                                onChange={(e) => {
                                    e.target.value = e.target.value.replace(/\D/g, "");
                                }}
                            />
                        </label>

                        <label>
                            Celular
                            <input
                                required
                                name="telefono"
                                type="text"
                                inputMode="numeric"
                                autoComplete="tel"
                                minLength={9}
                                maxLength={9}
                                pattern="[0-9]{9}"
                                placeholder="999999999"
                                onChange={(e) => {
                                    e.target.value = e.target.value.replace(/\D/g, "");
                                }}
                            />
                        </label>
                        <label className="client-form__full">
                            Correo electrónico
                            <input
                                required
                                name="correo"
                                type="email"
                                autoComplete="email"
                                placeholder="nombre@correo.com"
                            />
                        </label>
                        <label className="client-form__full">
                            Observaciones
                            <textarea
                                name="observaciones"
                                placeholder="Alergias, celebración o alguna solicitud especial (opcional)"
                                rows="3"
                            />
                        </label>
                    </div>
                    <section className="ops-preorder">
                        <label className="reservation-check"><input type="checkbox" checked={preorder} onChange={event=>setPreorder(event.target.checked)} disabled={saving}/>¿Deseas adelantar tus platos para tenerlos listos al llegar?</label>
                        {preorder&&<fieldset disabled={saving}><MenuPicker sede={params.get('sede')} turno={params.get('turno')} onChange={setPreorderItems} onSummary={setPreorderSummary}/></fieldset>}
                    </section>
                    {submitError&&<p role="alert" className="ops-error">{submitError}</p>}
                    <label className="reservation-check">
                        <input required type="checkbox" />
                        Acepto que Punto 29 use mis datos únicamente para gestionar esta
                        reserva.
                    </label>
                    <div className="floor-actions">
                        <Link to={`/reserva/turno-hora?${params.toString()}`}>
                            ← Cambiar horario
                        </Link>
                        <button type="submit" disabled={saving||(preorder&&preorderItems.length>0&&preorderSummary.invalid)}>
                            {saving?'Confirmando…':'Confirmar reserva'} <span>→</span>
                        </button>
                    </div>
                </form>
            </section>
        </main>
    );
};

export default DatosCliente;
