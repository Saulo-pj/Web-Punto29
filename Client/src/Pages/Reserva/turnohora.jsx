import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import restaurantImage from "../../assets/Image/Restaurante.jpg";
import logo from "../../assets/Image/Logo.png";
import "./Reserva.css";
import { ReservationProgress } from "./ReservationProgress";

const getPeruDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const getPeruMinutes = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  return hour * 60 + minute;
};

const today = getPeruDate();
const hoursByTurn = {
  dia: [
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
  ],
  noche: [
    "17:00",
    "17:30",
    "18:00",
    "18:30",
    "19:00",
    "19:30",
    "20:00",
    "20:30",
    "21:00",
    "21:30",
    "22:00",
    "22:30",
    "23:00",
    "23:30",
  ],
};

const TurnoHora = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [date, setDate] = useState(params.get("fecha") || "");
  const [turn, setTurn] = useState(
    params.get("turno") === "Turno noche"
      ? "noche"
      : params.get("turno") === "Turno día"
        ? "dia"
        : "",
  );
  const [time, setTime] = useState(params.get("hora") || "");
  const sede = params.get("sede");
  const people = params.get("personas") || "2";
  const mesa = params.get("mesa") || "";
  const availableHours = (value) => {
    const hours = hoursByTurn[value] || [];
    if (date !== today) return hours;
    const nowMinutes = getPeruMinutes();
    return hours.filter((hour) => {
      const [hourPart, minutePart] = hour.split(":").map(Number);
      return hourPart * 60 + minutePart > nowMinutes;
    });
  };

  const selectDate = (value) => {
    setDate(value);
    setTurn("");
    setTime("");
  };

  const selectTurn = (value) => {
    setTurn(value);
    setTime("");
  };
  const turnName =
    turn === "dia"
      ? "Turno día"
      : turn === "noche"
        ? "Turno noche"
        : "Selecciona un turno";
  const hours = turn ? availableHours(turn) : [];
  const continueReservation = () =>
    navigate(
      `/reserva/mesa?${new URLSearchParams({ sede, personas: people, mesa, fecha: date, turno: turnName, hora: time }).toString()}`,
    );

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
          currentStep={date ? (turn ? (time ? 5 : 4) : 3) : 2}
          completedSteps={[
            1,
            ...(date ? [2] : []),
            ...(turn ? [3] : []),
            ...(time ? [4] : []),
          ]}
          paths={["/reserva/personas"]}
        />
        <div className="people-content reservation-time">
          <p className="reservation-kicker">Pasos 3–5 de 7</p>
          <h1>Fecha, turno y hora</h1>
          <p className="people-subtitle">Elige cuándo quieres visitarnos.</p>
          <label className="reservation-field">
            Día de reserva
            <input
              type="date"
              min={today}
              value={date}
              onChange={(event) => selectDate(event.target.value)}
            />
          </label>
          <div className="turn-options">
            <button
              type="button"
              className={turn === "dia" ? "is-selected" : ""}
              disabled={!date || !availableHours("dia").length}
              onClick={() => selectTurn("dia")}
            >
              <b>Turno día</b>
              <span>11:30 a.m. – 5:00 p.m.</span>
            </button>
            <button
              type="button"
              className={turn === "noche" ? "is-selected" : ""}
              disabled={!date || !availableHours("noche").length}
              onClick={() => selectTurn("noche")}
            >
              <b>Turno noche</b>
              <span>5:30 p.m. – 11:30 p.m.</span>
            </button>
          </div>
          <label className="reservation-field">
            Hora disponible · {turnName}
            <select
              value={time}
              disabled={!turn || !hours.length}
              onChange={(event) => setTime(event.target.value)}
            >
              <option value="" disabled>Selecciona una hora</option>
              {hours.map((hour) => (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              ))}
            </select>
          </label>
          <div className="floor-actions">
            <Link to={`/reserva/personas?sede=${sede}&personas=${people}`}>← Cambiar personas</Link>
            <button type="button" disabled={!date || !turn || !time} onClick={continueReservation}>
              Continuar <span>→</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default TurnoHora;
