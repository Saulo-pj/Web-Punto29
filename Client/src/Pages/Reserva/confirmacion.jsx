import { Link, useSearchParams } from "react-router-dom";
import restaurantImage from "../../assets/Image/Restaurante.jpg";
import logo from "../../assets/Image/Logo.png";
import "./Reserva.css";
import { ReservationProgress } from "./ReservationProgress";
import { RESERVATION_REASONS } from "./reservationOptions";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

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
  const validationCode = params.get("codigo") || createValidationCode(params);
  const validationUrl = `${window.location.origin}/admin/reservas/validar?codigo=${encodeURIComponent(validationCode)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(validationUrl)}`;
  const printConfirmation = async () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, 180] });
    doc.setFillColor(244, 238, 225);
    doc.rect(0, 0, 80, 180, "F");
    doc.setFillColor(51, 51, 51);
    doc.rect(0, 0, 80, 24, "F");
    doc.setTextColor(244, 238, 225);
    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.text("PUNTO 29", 40, 12, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("BOLETA DE RESERVA", 40, 18, { align: "center" });
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(validationCode, 40, 32, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Sede ${params.get("sede") || "-"}`, 8, 42);
    doc.text(`Mesa ${params.get("mesa") || "-"}`, 8, 48);
    doc.text(`Fecha ${params.get("fecha") || "-"}`, 8, 54);
    doc.text(`Hora ${params.get("turno") || ""} · ${params.get("hora") || "-"}`, 8, 60);
    doc.text(`Comensales ${params.get("personas") || "-"}`, 8, 66);
    doc.text(`Cliente ${fullName}`, 8, 72);
    if (params.get("cortesia")) {
      doc.text(`Cortesía ${params.get("cortesia")}`, 8, 78);
      doc.setFontSize(7);
      doc.text("Recuerda traer tu DNI físico el día de tu reserva.", 8, 84);
    }
    const qr = await QRCode.toDataURL(validationUrl, { margin: 1, width: 320, color: { dark: "#333333", light: "#f4eee1" } });
    doc.addImage(qr, "PNG", 18, 92, 44, 44);
    doc.setDrawColor(169,139,66);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(8, 146, 72, 146);
    doc.setFontSize(7);
    doc.text("Presenta este boleto en el ingreso.", 40, 153, { align: "center" });
    doc.save(`Punto29-${validationCode}.pdf`);
  };
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
          <div className="confirmation-check" aria-label="Reserva confirmada">
            <svg viewBox="0 0 52 52" aria-hidden="true">
              <circle cx="26" cy="26" r="22" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M15 27l7 7 15-17" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
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
              {params.get('preorden')&&<div><dt>Preorden de platos</dt><dd>Confirmada con la reserva</dd></div>}
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
