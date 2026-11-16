import { Link, useSearchParams } from "react-router-dom";
import logo from "../../assets/Image/Logo.png";
import "./Carta.css";

const Carta = () => {
  const [params, setParams] = useSearchParams();
  const selectedVenue = ["17", "20"].includes(params.get("sede"))
    ? params.get("sede")
    : null;
  const venues = [
    {
      id: "17",
      name: "Sede 17",
      address: "Av. San Hilarión Este 123, San Juan de Lurigancho",
    },
    {
      id: "20",
      name: "Sede 20",
      address: "Av. Próceres de la Independencia, Alt. Paradero 20",
    },
  ];

  const selectVenue = (venueId) => setParams({ sede: venueId });

  const cartaPath = (path) => `${path}?sede=${selectedVenue}`;

  return (
    <main className="carta-selector">
      <div className="carta-selector__glow carta-selector__glow--one" />
      <div className="carta-selector__glow carta-selector__glow--two" />
      <div className="carta-selector__content">
        <Link className="carta-back" to="/">
          ← Volver al inicio
        </Link>
        <div className="carta-heading">
          <img className="carta-brand-logo" src={logo} alt="Punto 29" />
          <h1>
            Una carta para
            <br />
            <em>cada momento</em>
          </h1>
          <p className="carta-intro">
            {selectedVenue
              ? "Elige el turno y descubre una experiencia pensada para disfrutar sin prisa."
              : "Primero elige tu sede para mostrarte las cartas disponibles."}
          </p>
        </div>

        {!selectedVenue ? (
          <div className="carta-venues">
            {venues.map((venue, index) => (
              <button
                type="button"
                className="carta-venue-card"
                key={venue.id}
                onClick={() => selectVenue(venue.id)}
              >
                <span className="carta-venue-card__number">0{index + 1}</span>
                <strong>{venue.name}</strong>
                <small>{venue.address}</small>
                <span className="carta-venue-card__action">Ver cartas →</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <button type="button" className="carta-change-venue" onClick={() => setParams({})}>
              ← Cambiar de sede
            </button>
            <div className={`turnos-actions turnos-actions--${selectedVenue === "17" ? "two" : "three"}`}>
          <Link className="turno-card turno-card--dia" to={cartaPath("/carta/dia")}>
            <span className="turno-card__number">01</span>
            <div>
              <span className="turno-card__label">Desde las 11:00 a.m.</span>
              <strong>Turno día</strong>
            </div>
            <small>
              Ceviches, mariscos y clásicos peruanos <span>Explorar →</span>
            </small>
          </Link>
          <Link className="turno-card turno-card--noche" to={cartaPath("/carta/noche")}>
            <span className="turno-card__number">02</span>
            <div>
              <span className="turno-card__label">Desde las 6:00 p.m.</span>
              <strong>Turno noche</strong>
            </div>
            <small>
              Broaster, alitas, hamburguesas y más <span>Explorar →</span>
            </small>
          </Link>
          {selectedVenue === "20" && <Link className="turno-card turno-card--tragos" to={cartaPath("/carta/tragos")}>
            <span className="turno-card__number">03</span>
            <div>
              <span className="turno-card__label">Todo el día</span>
              <strong>Carta de tragos</strong>
            </div>
            <small>
              Clásicos, sours, cócteles y vinos <span>Explorar →</span>
            </small>
          </Link>}
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default Carta;
