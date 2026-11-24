import { Link } from "react-router-dom";
import { useSiteContent } from "../features/site-content/useSiteContent";
import "./Gallery.css";

const Gallery = () => {
  const { content } = useSiteContent();
  const gallery = content.gallery || {};
  const items = gallery.items || [];
  return (
    <main className="gallery-page">
      <header className="gallery-hero">
        <div>
          <p>{gallery.eyebrow || "Archivo visual · Punto 29"}</p>
          <h1>{gallery.titleFirst || "Una galería"}<br /><em>{gallery.titleSecond || "para recordar."}</em></h1>
          <span>Ambientes, platos y momentos que se disfrutan alrededor de nuestra mesa.</span>
        </div>
        <Link to="/">← Volver al inicio</Link>
      </header>
      <section className="gallery-collection" aria-label="Galería de imágenes">
        <div className="gallery-intro">
          <p className="gallery-kicker">El museo de Punto 29</p>
          <h2>{gallery.introTitle || "Momentos servidos"}<br />{gallery.introSecond || "con intención."}</h2>
          <p>{gallery.introDescription}</p>
        </div>
        <div className="gallery-grid">
          {items.map((item, index) => (
            <article className={`gallery-card ${item.className || ""}`} key={item.id || item.title}>
              <img src={item.image} alt={`${item.title} en Punto 29`} style={{ objectPosition: `${35 + ((index * 11) % 55)}% ${35 + ((index * 9) % 50)}%` }} />
              <div className="gallery-card__shade" />
              <div className="gallery-card__copy">
                <span>{item.category}</span>
                <h3>{item.title}</h3>
                <b>Ver imagen ↗</b>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Gallery;
