import { Link, useSearchParams } from "react-router-dom";
import {
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaCheck,
  FaChair,
  FaClock,
  FaSun,
  FaUsers,
} from "react-icons/fa";
import "./ReservationProgress.css";

const STEPS = [
  { label: "Sede", icon: FaMapMarkerAlt },
  { label: "Personas", icon: FaUsers },
  { label: "Fecha", icon: FaCalendarAlt },
  { label: "Turno", icon: FaSun },
  { label: "Hora", icon: FaClock },
  { label: "Ubicación", icon: FaChair },
  { label: "Confirmación", icon: FaCheck },
];

export const ReservationProgress = ({
  currentStep,
  completedSteps = [],
}) => {
  const [params] = useSearchParams();
  const query = new URLSearchParams();
  for (const key of ["sede", "personas", "fecha", "turno", "hora"]) {
    if (params.has(key)) query.set(key, params.get(key));
  }
  const paths = ["/reserva/sede", "/reserva/personas", "/reserva/turno-hora", "/reserva/turno-hora", "/reserva/turno-hora", "/reserva/mesa", "/reserva/datos-cliente"].map((path) => `${path}?${query}`);
  return (
  <nav className="reservation-progress" aria-label="Progreso de la reserva">
    {STEPS.map(({ label, icon: Icon }, index) => {
      const step = index;
      const isDone = (step === 0 && currentStep > 0) || completedSteps.includes(step) || (!completedSteps.length && step < currentStep);
      const isCurrent = step === currentStep;
      const content = (
        <>
          <span className="reservation-progress__icon" aria-hidden="true">
            <Icon />
          </span>
          <span>{label}</span>
        </>
      );
      return (
        <div
          className={`reservation-progress__item ${isCurrent ? "is-current" : ""} ${isDone ? "is-done" : ""}`}
          key={label}
        >
          {isDone && paths[index] ? <Link to={paths[index]}>{content}</Link> : content}
        </div>
      );
    })}
  </nav>
  );
};
