import { useSiteContent } from "../../../features/site-content/useSiteContent";
import "./Chefs.css";

const Chefs = () => {
  const { content } = useSiteContent();
  const { kicker, title, people } = content.chefs;

  return (
    <section className="chefs-section">
      <div className="section-heading">
        <p className="section-kicker">{kicker}</p>
        <h2>{title}</h2>
      </div>
      <div className="chef-grid">
        {people.map((chef) => (
          <article
            className="chef-card"
            key={chef.id}
          >
            <img className="chef-card__image" src={chef.image} alt="" />
            <div className="chef-card__info">
              <p>{chef.specialty}</p>
              <h3>{chef.name}</h3>
              <span>{chef.bio}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Chefs;
