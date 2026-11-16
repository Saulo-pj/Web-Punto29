import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import restaurantImage from "../../assets/Image/Restaurante.jpg";
import logo from "../../assets/Image/Logo.png";
import "./Reserva.css";
import { ReservationProgress } from "./ReservationProgress";

const Personas = () => {
  const [params] = useSearchParams();
  const sede = params.get("sede");
  const maxPeople = sede === "17" ? 16 : 40;
  const [people, setPeople] = useState(() => Math.max(1, Math.min(maxPeople, Number(params.get("personas")) || 2)));
  const navigate = useNavigate();
  const update = (value) => setPeople(Math.max(1, Math.min(maxPeople, Math.trunc(value))));

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
        <ReservationProgress currentStep={1} />
        <div className="people-content">
          <p className="reservation-kicker">Paso 2 de 7</p>
          <h1>¿Cuántos comensales?</h1>
          <p className="people-subtitle">Sede {sede}. Selecciona el tamaño de tu grupo.</p>
          <div className="quick-people">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((number) => (
              <button
                key={number}
                type="button"
                className={people === number ? "is-selected" : ""}
                onClick={() => update(number)}
              >
                <b>{number}</b>
                <span>{number === 1 ? "persona" : "personas"}</span>
              </button>
            ))}
          </div>
          <div className="people-counter">
            <span>Tamaño personalizado</span>
            <div>
              <button type="button" onClick={() => update(people - 1)}>
                −
              </button>
              <p>
                <b
                  contentEditable
                  suppressContentEditableWarning
                  role="spinbutton"
                  aria-label="Cantidad de personas"
                  onBlur={(event) => {
                    const value = Number(event.currentTarget.textContent);
                    if (Number.isFinite(value)) update(value);
                    else event.currentTarget.textContent = String(people);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                  }}
                >
                  {people}
                </b>
                <small>{people === 1 ? "persona" : "personas"}</small>
              </p>
              <button type="button" disabled={people >= maxPeople} onClick={() => update(people + 1)}>
                +
              </button>
            </div>
            <small>{sede === "17" ? "Sede 17: máximo 16 personas. Salón interior: hasta 12." : "Para grupos de 25 o más coordinamos por WhatsApp"}</small>
          </div>
          <button
            type="button"
            className="flow-continue"
            onClick={() => navigate(`/reserva/turno-hora?sede=${sede}&personas=${people}`)}
          >
            Continuar con {people} {people === 1 ? "comensal" : "comensales"}{" "}
            <span>→</span>
          </button>
        </div>
      </section>
    </main>
  );
};

export default Personas;
