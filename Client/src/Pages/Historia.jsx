import React from "react";
import restaurantImage from "../assets/Image/Restaurante.jpg";
import "./Historia.css";

const Historia = () => {
  return (
    <main className="history-page">
      <section
        className="history-image"
        style={{ backgroundImage: `url(${restaurantImage})` }}
        aria-label="Punto 29 restaurante"
      />
      <section className="history-copy">
        <div>
          <p className="history-kicker">Desde San Juan de Lurigancho</p>
          <h1>
            Nuestra
            <br />
            <em>historia.</em>
          </h1>
          <p>
            Punto 29 nació con una idea sencilla: crear un lugar donde el sabor
            peruano y los buenos momentos siempre tengan una mesa reservada.
          </p>
          <p>
            Desde nuestros primeros platos hasta cada nueva reunión, cocinamos
            con cercanía, generosidad y el orgullo de compartir lo nuestro.
          </p>
          <div className="history-mark">
            <span>29</span>
            <p>
              Sabores que reúnen,
              <br />
              momentos que permanecen.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Historia;
