import { useSiteContent } from "../../../features/site-content/useSiteContent";
import "./Recomendaciones.css";

const Recomendaciones = () => {
  const { content } = useSiteContent();
  const { kicker, title, dishes } = content.recommendations;

  return (
    <section className="recommendations-section" id="platos-recomendados">
      <div className="section-heading section-heading--split">
        <div>
          <p className="section-kicker">{kicker}</p>
          <h2>{title}</h2>
        </div>
        <a href="/carta">
          Ver carta completa <span>→</span>
        </a>
      </div>
      <div className="dish-grid">
        {dishes.map((dish) => (
          <article
            className="dish-card"
            key={dish.id}
          >
            <img className="dish-card__image" src={dish.image} alt="" />
            <div className="dish-card__info">
              <p>{dish.promotion}</p>
              <h3>{dish.name}</h3>
              <span>{dish.description}{dish.price ? ` · S/ ${dish.price}` : ""}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Recomendaciones;
