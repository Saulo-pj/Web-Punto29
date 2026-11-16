import React from "react";
import "./Resena.css";

const reviews = [
  {
    quote:
      "El ceviche estuvo increíble y la atención fue excelente. Sin duda, un lugar para volver y compartir.",
    author: "María Gonzales",
    initials: "MG",
    rating: "5.0",
  },
  {
    quote:
      "Un ambiente genial para compartir y platos muy bien servidos. Todo llegó a la mesa con mucho sabor.",
    author: "Carlos Ramírez",
    initials: "CR",
    rating: "5.0",
  },
  {
    quote:
      "Volvería por el arroz con mariscos y los cócteles. El equipo nos hizo sentir como en casa.",
    author: "Andrea Pérez",
    initials: "AP",
    rating: "5.0",
  },
];

const Resena = () => {
  return (
    <section className="reviews-section">
      <div className="section-heading">
        <p className="section-kicker">Lo que dicen de nosotros</p>
        <h2>Reseñas de nuestros clientes</h2>
      </div>
      <div className="reviews-grid">
        {reviews.map((review) => (
          <article className="review-card" key={review.author}>
            <div className="review-card__top">
              <span className="review-avatar">{review.initials}</span>
              <div>
                <h3>{review.author}</h3>
                <p className="review-stars">
                  ★ <b>{review.rating}</b>
                </p>
              </div>
            </div>
            <blockquote>“{review.quote}”</blockquote>
            <a href="#contacto">
              Conocer más <span>→</span>
            </a>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Resena;
