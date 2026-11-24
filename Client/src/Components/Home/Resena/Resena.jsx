import React, { useEffect, useRef, useState } from "react";
import { FaStar } from "react-icons/fa";
import { useSiteContent } from "../../../features/site-content/useSiteContent";
import "./Resena.css";

const fallbackReviews = [
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
  const { content } = useSiteContent();
  const [reviews, setReviews] = useState(fallbackReviews);
  const [form, setForm] = useState({ name: "", rating: "5", comment: "", photo: "" });
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const photoRef = useRef(null);

  useEffect(() => {
    fetch("/api/customer-reviews", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : [])
      .then((items) => { if (Array.isArray(items) && items.length) setReviews(items); })
      .catch(() => {});
  }, []);

  const readPhoto = (file) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setStatus("La foto debe ser JPG, PNG, WebP o GIF y pesar 2 MB o menos.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, photo: reader.result }));
    reader.readAsDataURL(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus("Enviando…");
    try {
      const response = await fetch("/api/customer-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rating: Number(form.rating) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo enviar la reseña.");
      setForm({ name: "", rating: "5", comment: "", photo: "" });
      setStatus("¡Gracias! Tu reseña fue enviada y está pendiente de moderación.");
      setOpen(false);
    } catch (error) {
      setStatus(error.message);
    }
  };

  const reviewSettings = content.reviews || {};
  const photos = reviews.filter((review) => review.photo);
  return (
    <section className="reviews-section">
      <div className="section-heading">
        <p className="section-kicker">{reviewSettings.kicker || "Lo que dicen de nosotros"}</p>
        <h2>{reviewSettings.title || "Reseñas de nuestros clientes"}</h2>
        <button type="button" className="reviews-add" onClick={() => setOpen((current) => !current)}>
          {open ? "Cerrar formulario" : "Deja tu reseña"}
        </button>
      </div>
      {open && (
        <form className="reviews-form" onSubmit={submit}>
          <label>Nombre<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={80} /></label>
          <div className="reviews-rating">
            <span>Calificación</span>
            <div className="reviews-stars" role="radiogroup" aria-label="Seleccionar calificación">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  type="button"
                  key={rating}
                  className={rating <= Number(form.rating) ? "is-selected" : ""}
                  role="radio"
                  aria-checked={Number(form.rating) === rating}
                  aria-label={`${rating} ${rating === 1 ? "estrella" : "estrellas"}`}
                  onClick={() => setForm((current) => ({ ...current, rating: String(rating) }))}
                >
                  <FaStar aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
          <label className="reviews-form__comment">Comentario<textarea value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} required maxLength={500} /></label>
          <label className="reviews-form__photo">Foto de tu experiencia
            <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => readPhoto(event.target.files?.[0])} />
            <span>Subir archivo</span>
          </label>
          <label className="reviews-form__url">O pega una URL
            <input type="url" value={form.photo.startsWith("data:image/") ? "" : form.photo} onChange={(event) => setForm({ ...form, photo: event.target.value })} placeholder="https://..." />
          </label>
          {form.photo && <img className="reviews-form__preview" src={form.photo} alt="Vista previa de tu experiencia" />}
          <button type="submit">Publicar reseña</button>
        </form>
      )}
      {status && <p className="reviews-status" role="status">{status}</p>}
      <div className="reviews-grid">
        {reviews.map((review) => (
          <article className="review-card" key={review.id || review.author}>
            <div className="review-card__top">
              <span className="review-avatar">{review.initials || review.name?.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase()}</span>
              <div>
                <h3>{review.author || review.name}</h3>
                <p className="review-stars">
                  {"★".repeat(review.rating || 5)} <b>{Number(review.rating || 5).toFixed(1)}</b>
                </p>
              </div>
            </div>
            <blockquote>“{review.quote || review.comment}”</blockquote>
            {review.photo && <img className="review-card__photo" src={review.photo} alt={`Experiencia de ${review.name || review.author}`} />}
          </article>
        ))}
      </div>
      {photos.length > 0 && (
        <div className="reviews-collage" aria-label="Collage de experiencias de clientes">
          {photos.slice(0, 8).map((review, index) => (
            <figure key={review.id || index} className={`reviews-collage__item reviews-collage__item--${(index % 4) + 1}`}>
              <img src={review.photo} alt={`Experiencia compartida por ${review.name || review.author}`} />
            </figure>
          ))}
        </div>
      )}
    </section>
  );
};

export default Resena;
