import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import restaurantImage from "../../assets/Image/Restaurante.jpg";
import logo from "../../assets/Image/Logo.png";
import { ReservationProgress } from "./ReservationProgress";
import "./Reserva.css";

export default function Sede() {
  const [sedes, setSedes] = useState([]);
  const [background, setBackground] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/sedes").then((response) => response.ok ? response.json() : []),
      fetch("/api/configuracion").catch(() => null),
    ])
      .then(async ([venues, configResponse]) => {
        setSedes(venues);
        if (configResponse?.ok) {
          const config = await configResponse.json();
          setBackground(config.fondo_reservas_url || "");
        }
      })
      .catch(() => setSedes([]));
  }, []);

  return (
    <main className="reservation-page reservation-flow" style={{ backgroundImage: `url(${background || restaurantImage})` }}>
      <div className="reservation-shade" />
      <section className="reservation-card reservation-card--flow">
        <div className="reservation-card__brand"><img src={logo} alt="Punto 29" /></div>
        <ReservationProgress currentStep={0} />
        <div className="people-content">
          <p className="reservation-kicker">Paso 1 de 7</p>
          <h1>Elige tu sede</h1>
          <p className="people-subtitle">¿Dónde quieres disfrutar tu reserva?</p>
          <div className="venue-options">
            {sedes.map((sede) => (
              <Link to={`/reserva/personas?sede=${encodeURIComponent(sede.id)}`} key={sede.id} className="venue-option">
                {sede.imagen_url && (
                  <img
                    loading="lazy" src={sede.imagen_url}
                    alt={sede.nombre}
                    className="object-cover"
                    onError={(event) => { event.currentTarget.src = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=85"; }}
                  />
                )}
                <strong>{sede.nombre}</strong>
                <span>{sede.direccion}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
