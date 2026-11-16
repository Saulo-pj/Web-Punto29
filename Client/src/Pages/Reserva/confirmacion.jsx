import { Link, useSearchParams } from "react-router-dom";
import restaurantImage from "../../assets/Image/Restaurante.jpg";
import logo from "../../assets/Image/Logo.png";
import "./Reserva.css";
import { ReservationProgress } from "./ReservationProgress";
import { RESERVATION_REASONS } from "./reservationOptions";

const createValidationCode = (params) => {
  const source = [
    params.get("sede"),
    params.get("fecha"),
    params.get("hora"),
    params.get("mesa"),
    params.get("dni"),
  ].join("|");
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `P29-${(hash >>> 0).toString(36).toUpperCase().padStart(7, "0")}`;
};

const Confirmacion = () => {
  const [params] = useSearchParams();
  const fullName =
    [params.get("nombres"), params.get("apellidos")]
      .filter(Boolean)
      .join(" ") || "Cliente";
  const reason = RESERVATION_REASONS.find((option) => option.value === params.get("motivo"));
  const validationCode = createValidationCode(params);
  const validationUrl = `${window.location.origin}/admin/reservas/validar?codigo=${encodeURIComponent(validationCode)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(validationUrl)}`;
  const printConfirmation = () => window.print();
  return (
    <main
      className="reservation-page reservation-flow"
      style={{ backgroundImage: `url(${restaurantImage})` }}
    >
      <div className="reservation-shade" />
      <section className="reservation-card reservation-card--flow reservation-card--confirmation">
        <div className="reservation-card__brand">
          <img src={logo} alt="Punto 29" />
        </div>
        <ReservationProgress currentStep={6} />
        <div className="people-content confirmation">
          <div className="confirmation-check">✓</div>
          <p className="reservation-kicker">Reserva confirmada</p>
          <h1>¡Nos vemos pronto, {fullName}!</h1>
          <p className="people-subtitle">
            Hemos enviado la confirmación de tu reserva a{" "}
            <b>{params.get("correo") || "tu correo electrónico"}</b>.
          </p>
          <div className="confirmation-scroll" aria-label="Detalle de la reserva">
            <div className="confirmation-summary confirmation-summary--complete">
              <h2>Resumen completo de tu reserva</h2>
              <dl>
              <div><dt>Código de validación</dt><dd>{validationCode}</dd></div>
              <div><dt>Sede</dt><dd>{params.get("sede")}</dd></div>
              <div>
                <dt>Fecha</dt>
                <dd>{params.get("fecha") || "Por confirmar"}</dd>
              </div>
              <div>
                <dt>Horario</dt>
                <dd>
                  {params.get("turno")} · {params.get("hora")}
                </dd>
              </div>
              <div>
                <dt>Comensales</dt>
                <dd>{params.get("personas")} personas</dd>
              </div>
              <div>
                <dt>Mesa</dt>
                <dd>{params.get("mesa") || "Por confirmar"}</dd>
              </div>
              <div>
                <dt>Motivo</dt>
                <dd>{reason?.label || "No especificado"}</dd>
              </div>
              {params.get("cortesia") && (
                <div>
                  <dt>Cortesía</dt>
                  <dd>{params.get("cortesia")}</dd>
                </div>
              )}
              <div><dt>Nombre</dt><dd>{fullName}</dd></div>
              <div><dt>DNI</dt><dd>{params.get("dni") || "No registrado"}</dd></div>
              <div><dt>Celular</dt><dd>{params.get("telefono") || "No registrado"}</dd></div>
              <div><dt>Correo</dt><dd>{params.get("correo") || "No registrado"}</dd></div>
              {params.get("observaciones") && (
                <div className="confirmation-summary__full">
                  <dt>Observaciones</dt>
                  <dd>{params.get("observaciones")}</dd>
                </div>
              )}
              </dl>
            </div>
            <div className="confirmation-validation">
              <div>
                <h2>Validación en el local</h2>
                <p>Presenta este código QR para que el equipo pueda validar tu reserva.</p>
                <strong>{validationCode}</strong>
              </div>
              <img src={qrUrl} alt={`Código QR de validación ${validationCode}`} width="180" height="180" />
            </div>
            <p className="confirmation-note">
              Si necesitas realizar un cambio, comunícate con nosotros antes de tu
              horario de reserva.
            </p>
          </div>
          <div className="confirmation-actions">
            <button type="button" className="confirmation-print" onClick={printConfirmation}>
              Descargar PDF
            </button>
            <Link className="flow-continue" to="/">Volver al inicio</Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Confirmacion;
