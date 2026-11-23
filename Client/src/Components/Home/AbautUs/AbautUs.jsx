import { Link } from "react-router-dom";
import { useSiteContent } from "../../../features/site-content/useSiteContent";
import "./AbautUs.css";

const AbautUs = () => {
  const { content } = useSiteContent();
  const general = content.general;

  return (
    <section className="about-section">
      <div
        className="about-image"
        role="img"
        aria-label="Ambiente nocturno de Punto 29"
      >
        <img className="about-image__media" src={general.aboutImage} alt="" />
      </div>
      <div className="about-copy">
        <p className="section-kicker">{general.aboutKicker}</p>
        <h2>
          {general.aboutTitleFirst}
          <br />
          <em>{general.aboutTitleSecond}</em>
        </h2>
        <p>{general.aboutDescription}</p>
        <p>{general.aboutFollowup}</p>
        <Link className="about-gallery-button" to="/galeria">
          Galería de imágenes <span>↗</span>
        </Link>
      </div>
    </section>
  );
};

export default AbautUs;
