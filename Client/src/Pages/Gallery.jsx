import { Link } from "react-router-dom";
import restaurantImage from "../assets/Image/Restaurante.jpg";
import "./Gallery.css";

const galleryItems = [
  {
    title: "El restaurante",
    type: "Ambiente",
    className: "gallery-card--wide",
  },
  {
    title: "Sabores del mar",
    type: "Especialidades",
    className: "gallery-card--tall",
  },
  { title: "Momentos Punto 29", type: "Experiencias", className: "" },
  { title: "Nuestra mesa", type: "Detalles", className: "" },
  {
    title: "Cocina peruana",
    type: "Tradición",
    className: "gallery-card--wide",
  },
  { title: "Noches para compartir", type: "Bar & coctelería", className: "" },
];

const Gallery = () => (
  <main className="gallery-page">
    <header className="gallery-hero">
      <div>
        <p>Archivo visual · Punto 29</p>
        <h1>
          Una galería
          <br />
          <em>para recordar.</em>
        </h1>
        <span>
          Ambientes, platos y momentos que se disfrutan alrededor de nuestra
          mesa.
        </span>
      </div>
      <Link to="/">← Volver al inicio</Link>
    </header>
    <section className="gallery-collection" aria-label="Galería de imágenes">
      <div className="gallery-intro">
        <p className="gallery-kicker">El museo de Punto 29</p>
        <h2>
          Momentos servidos
          <br />
          con intención.
        </h2>
        <p>
          Un recorrido por nuestra cocina, nuestra gente y la energía de cada
          visita.
        </p>
      </div>
      <div className="gallery-grid">
        {galleryItems.map((item, index) => (
          <article
            className={`gallery-card ${item.className}`}
            key={item.title}
          >
            <img
              src={restaurantImage}
              alt={`${item.title} en Punto 29`}
              style={{
                objectPosition: `${35 + ((index * 11) % 55)}% ${35 + ((index * 9) % 50)}%`,
              }}
            />
            <div className="gallery-card__shade" />
            <div className="gallery-card__copy">
              <span>{item.type}</span>
              <h3>{item.title}</h3>
              <b>Ver imagen ↗</b>
            </div>
          </article>
        ))}
      </div>
    </section>
  </main>
);

export default Gallery;
