import { useEffect, useState } from "react";
import { useSiteContent } from "../../../features/site-content/useSiteContent";
import "./HappyHour.css";

const HappyHour = () => {
  const { content } = useSiteContent();
  const slides = content.happyHour.slides;
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const currentIndex = activeIndex % slides.length;
  const slide = slides[currentIndex];

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(intervalId);
  }, [paused, slides.length]);

  const moveSlide = (direction) => {
    setActiveIndex((current) => (current + direction + slides.length) % slides.length);
  };

  return (
    <section
      className="happy-section"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      aria-roledescription="carrusel"
      aria-label="Promociones Happy Hour"
    >
      <div className="happy-image">
        <img key={slide.id} className="happy-image__media" src={slide.image} alt="" />
        <div className="happy-carousel-controls">
          <button type="button" onClick={() => moveSlide(-1)} aria-label="Promoción anterior">‹</button>
          <div className="happy-carousel-dots" aria-label="Seleccionar promoción">
            {slides.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={index === currentIndex ? "is-active" : ""}
                onClick={() => setActiveIndex(index)}
                aria-label={`Ver promoción ${index + 1}`}
                aria-current={index === currentIndex ? "true" : undefined}
              />
            ))}
          </div>
          <button type="button" onClick={() => moveSlide(1)} aria-label="Promoción siguiente">›</button>
        </div>
      </div>
      <div className="happy-copy">
        <p className="section-kicker">{slide.kicker}</p>
        <h2>
          {slide.title} <em>{slide.emphasis}</em>
        </h2>
        <p className="happy-time">{slide.schedule}</p>
        {slide.description && <p className="happy-description">{slide.description}</p>}
        <div className="happy-offers">
          {slide.offers.map((offer, index) => (
            <p key={`${slide.id}-offer-${index}`}>
              {offer.price && <b>{offer.price}</b>}
              <span>{offer.details}</span>
            </p>
          ))}
        </div>
        <a href="/reserva">
          Reserva tu mesa <span>→</span>
        </a>
      </div>
    </section>
  );
};

export default HappyHour;
