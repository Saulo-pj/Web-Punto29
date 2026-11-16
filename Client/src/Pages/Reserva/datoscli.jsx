import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
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
    const birthdayCourtesies = getBirthdayCourtesies(params.get("sede"), params.get("turno"));
    const isBirthday = reason === "cumpleanos";
    const submit = (event) => {
        event.preventDefault();
        const query = new URLSearchParams(params);
        new FormData(event.currentTarget).forEach((value, key) =>
            query.set(key, value),
        );
        navigate(`/reserva/confirmacion?${query.toString()}`);
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
                                <legend>Elige una cortesía para el cumpleañero</legend>
                                <p>La prepararemos según la sede y el turno elegido.</p>
                                <div className="reservation-courtesy__options">
                                    {birthdayCourtesies.map((courtesy) => (
                                        <label key={courtesy}>
                                            <input required type="radio" name="cortesia" value={courtesy} />
                                            <span>{courtesy}</span>
                                        </label>
                                    ))}
                                </div>
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
                    <label className="reservation-check">
                        <input required type="checkbox" />
                        Acepto que Punto 29 use mis datos únicamente para gestionar esta
                        reserva.
                    </label>
                    <div className="floor-actions">
                        <Link to={`/reserva/turno-hora?${params.toString()}`}>
                            ← Cambiar horario
                        </Link>
                        <button type="submit">
                            Confirmar reserva <span>→</span>
                        </button>
                    </div>
                </form>
            </section>
        </main>
    );
};

export default DatosCliente;
