import { Link } from "react-router-dom";
import restaurantImage from "../../assets/Image/Restaurante.jpg";
import logo from "../../assets/Image/Logo.png";
import { ReservationProgress } from "./ReservationProgress";
import "./Reserva.css";

export default function Sede() {
  return (
    <main className="reservation-page reservation-flow" style={{ backgroundImage: `url(${restaurantImage})` }}>
      <div className="reservation-shade" />
      <section className="reservation-card reservation-card--flow">
        <div className="reservation-card__brand"><img src={logo} alt="Punto 29" /></div>
        <ReservationProgress currentStep={0} />
        <div className="people-content">
          <p className="reservation-kicker">Paso 1 de 7</p>
          <h1>Elige tu sede</h1>
          <p className="people-subtitle">¿Dónde quieres disfrutar tu reserva?</p>
          <div className="venue-options">
            <Link to="/reserva/personas?sede=17"><strong>Sede 17</strong><span>Un piso · Hasta 16 personas por reserva</span></Link>
            <Link to="/reserva/personas?sede=20"><strong>Sede 20</strong><span>Dos pisos · Primer piso y segundo piso</span></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
