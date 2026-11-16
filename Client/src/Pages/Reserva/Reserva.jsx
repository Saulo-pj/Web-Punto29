import restaurantImage from "../../assets/Image/Restaurante.jpg";
import logo from "../../assets/Image/Logo.png";
import { Link } from "react-router-dom";
import "./Reserva.css";

const Reserva = () => (
  <main
    className="reservation-page"
    style={{ backgroundImage: `url(${restaurantImage})` }}
  >
    <div className="reservation-shade" />
    <section className="reservation-card" aria-labelledby="reservation-title">
      <div className="reservation-card__brand">
        <img src={logo} alt="Punto 29" />
      </div>
      <div className="reservation-welcome">
        <p className="reservation-kicker">Tu mesa te espera</p>
        <h1 id="reservation-title">Bienvenido</h1>
        <p>
          Reserva una experiencia para compartir sabores, conversaciones y
          buenos momentos.
        </p>
        <Link className="reservation-start" to="/reserva/sede">
          ✦ Hacer una reserva
        </Link>
        <small>Atendemos todos los días · 9:00 a.m. a 11:00 p.m.</small>
      </div>
    </section>
  </main>
);

export default Reserva;
