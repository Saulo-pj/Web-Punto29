import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheck,
  FaClock,
  FaMapMarkerAlt,
  FaUsers,
} from "react-icons/fa";
import { VENUE17_CONFIG } from "./config/venue17.config";
import { TABLES } from "./config/tables.config";
import { FIRST_FLOOR_CONFIG } from "./config/firstFloor.config";
import { getFloorLayoutSignature, loadFloorLayout, subscribeFloorLayout } from "./services/floorLayoutStorage";
import { TABLE_SELECTION_RULES } from "./config/rules.config";
import { getTableStatus, splitFamilyTable } from "./domain/tableRules";
import { createReservation } from "./services/reservationsApi";
import { useTableSelection } from "./hooks/useTableSelection";
import { LargeGroupSelector } from "./components/LargeGroupSelector";
import { RestaurantFloorPlan } from "./components/RestaurantFloorPlan";
import { TableStatusLegend } from "./components/TableStatusLegend";
import restaurantImage from "../../../assets/Image/Restaurante.jpg";
import logo from "../../../assets/Image/LogoBlanco.png";
import { ReservationProgress } from "../../../Pages/Reserva/ReservationProgress";
import "./table-selection.css";

const formatParty = (partySize) => `${partySize} ${partySize === 1 ? "persona" : "personas"}`;

export const TableSelectionStep = ({ reservation, onComplete, onBack }) => {
  const [selectedFloor, setFloor] = useState("second");
  const isVenue17 = reservation.locationId === "17";
  const floor = isVenue17 ? "venue17" : selectedFloor;
  const layoutSignature = useSyncExternalStore(
    subscribeFloorLayout,
    () => getFloorLayoutSignature(floor),
  );
  const floorTables = useMemo(() => {
    const snapshot = JSON.parse(layoutSignature || "{}");
    if (Array.isArray(snapshot.tables) && snapshot.tables.length) return snapshot.tables;
    return loadFloorLayout(floor, floor === "venue17" ? VENUE17_CONFIG.tables : floor === "first" ? FIRST_FLOOR_CONFIG.tables : TABLES);
  }, [floor, layoutSignature]);
  const floorConfig = useMemo(() => floor === "venue17" ? { ...VENUE17_CONFIG, tables: floorTables } : floor === "first"
    ? { ...FIRST_FLOOR_CONFIG, tables: floorTables }
    : null, [floor, floorTables]);
  const { state, dispatch, required, availability, refresh, validNextIds, complete } = useTableSelection(reservation, floorConfig);
  const partySize = Number(reservation.partySize) || 0;
  const isContact = required.mode === "contact";
  const isSpecial = required.mode === "special";
  const isMulti = required.mode === "multiple" && (required.maxCount || required.count) > 1;
  const statuses = useMemo(() => Object.fromEntries(floorTables.map((table) => [
    table.id,
    getTableStatus({ table, partySize, selection: state.selection, reservedIds: availability.reservedIds, validNextIds, floorConfig }),
  ])), [floorConfig, floorTables, partySize, state.selection, availability.reservedIds, validNextIds]);

  const selectTable = useCallback((tableId) => {
    const familyHalf = tableId.match(/^(I23|I24)([ab])$/);
    if (familyHalf) {
      const parentId = familyHalf[1];
      const otherFamily = state.selection[0] === "I23" ? "I24" : "I23";
      if (
        partySize >= 9 &&
        partySize <= 12 &&
        state.selection.length === 1 &&
        ["I23", "I24"].includes(state.selection[0]) &&
        parentId === otherFamily &&
        !availability.reservedIds.includes(parentId)
      ) {
        dispatch({ type: "SELECT_TABLE", selection: [...state.selection, tableId] });
      } else {
        dispatch({ type: "MESSAGE", message: "Elige una mitad disponible de la otra mesa familiar." });
      }
      return;
    }
    const status = statuses[tableId];
    if (status.status === "reserved" || status.status === "inactive" || status.status === "capacity-blocked" || status.status === "distribution-blocked") {
      dispatch({ type: "MESSAGE", message: status.reason });
      return;
    }
    if (state.selection.at(-1) === tableId) {
      dispatch({ type: "UNDO" });
      return;
    }
    if (!floorConfig && !state.selection.length && partySize >= 5 && partySize <= 16 && ["I23", "I24"].includes(tableId)) {
      dispatch({ type: "SELECT_TABLE", selection: [tableId] });
      return;
    }
    if (!floorConfig && partySize >= 9 && partySize <= 12 && ["I23", "I24"].includes(tableId)) {
      dispatch({ type: "SELECT_TABLE", selection: [tableId] });
      return;
    }
    if (!floorConfig && partySize >= 13 && partySize <= 16 && state.selection.length === 1 && ["I23", "I24"].includes(tableId)) {
      dispatch({ type: "SELECT_TABLE", selection: [...state.selection, tableId] });
      return;
    }
    if (!validNextIds.includes(tableId)) {
      dispatch({ type: "MESSAGE", message: "Esta mesa no forma una línea contigua con tu selección." });
      return;
    }
    dispatch({ type: "SELECT_TABLE", selection: [...state.selection, tableId] });
  }, [statuses, state.selection, partySize, validNextIds, availability.reservedIds, dispatch, floorConfig]);

  const selectFamilyHalf = (half) => {
    if (state.selection.length === 1 && ["I23", "I24"].includes(state.selection[0])) {
      const other = state.selection[0] === "I23" ? "I24" : "I23";
      if (!availability.reservedIds.includes(other)) dispatch({ type: "SELECT_TABLE", selection: [...state.selection, half] });
    }
  };

  const completeSelection = async () => {
    try {
      await createReservation({ ...reservation, tableIds: state.selection, specialConfigId: state.specialConfigId });
      onComplete({
        tableIds: state.selection,
        specialConfigId: state.specialConfigId || null,
        totalCapacity: isSpecial ? 24 : state.selection.reduce((sum, id) => sum + (id.match(/[ab]$/) ? 4 : floorTables.find((table) => table.id === id)?.capacidad || 0), 0),
        orientation: state.orientation,
      });
    } catch (error) {
      if (error.code === "TABLE_CONFLICT") {
        dispatch({ type: "RESET" });
        await refresh();
        dispatch({ type: "MESSAGE", message: "Una de las mesas seleccionadas acaba de dejar de estar disponible. Elige otra ubicación." });
      } else {
        dispatch({ type: "MESSAGE", message: "No pudimos confirmar la ubicación. Intenta nuevamente." });
      }
    }
  };

  const whatsappMessage = encodeURIComponent(`Hola, quiero coordinar una reserva para ${formatParty(partySize)} el ${reservation.date}, ${reservation.service}, ${reservation.time}.`);
  const firstNotice = isMulti && !state.noticeAcknowledged;
  const familyOption = partySize >= 9 && partySize <= 12 && state.selection.length === 1 && ["I23", "I24"].includes(state.selection[0]);
  const capacity = isSpecial ? 24 : state.selection.reduce((sum, id) => sum + (id.match(/[ab]$/) ? 4 : floorTables.find((table) => table.id === id)?.capacidad || 0), 0);
  const familyPairComplete = partySize >= 13 && partySize <= 16
    && state.selection.length === 2
    && state.selection.every((id) => ["I23", "I24"].includes(id));
  const displayedRequiredCount = familyPairComplete ? 2
    : floorConfig && required.maxCount > required.count
      ? `${required.count}–${required.maxCount}` : required.count;

  return (
    <main className="reservation-page reservation-flow" style={{ backgroundImage: `url(${restaurantImage})` }}>
      <div className="reservation-shade" />
      <section className="reservation-card reservation-card--table-selection">
        <header className="table-selection__header">
          <button type="button" className="table-selection__back" onClick={onBack}><FaArrowLeft /> Atrás</button>
          <img src={logo} alt="Punto 29" />
          <span className="table-selection__step-title">6. Elige tu ubicación</span>
          <div className="table-selection__header-actions"><span><FaUsers /> {partySize}</span><span><FaMapMarkerAlt /> Sede {reservation.locationId}</span></div>
        </header>
        <ReservationProgress
          currentStep={5}
          paths={["/reserva/personas", `/reserva/turno-hora?${new URLSearchParams(reservation).toString()}`]}
        />
        <div className="table-selection__layout">
          <div className="table-selection__main">
            {!isVenue17 && <div className="table-selection__floor-switch" role="group" aria-label="Seleccionar piso">
              <button type="button" className={floor === "first" ? "is-selected" : ""} disabled={partySize > 8} onClick={() => setFloor("first")}>
                Primer piso <small>máx. 8 personas</small>
              </button>
              <button type="button" className={floor === "second" ? "is-selected" : ""} onClick={() => setFloor("second")}>
                Segundo piso <small>todas las opciones</small>
              </button>
            </div>
            }
            <div className="table-selection__intro">
              <div><p className="reservation-kicker">PASO 6 DE 7</p><h1>Elige tu ubicación</h1><p className="people-subtitle">Para {formatParty(partySize)}, elige una mesa disponible.</p></div>
              <div className="table-selection__counter"><strong>{familyPairComplete ? 2 : state.selection.length}</strong><span>de {displayedRequiredCount || "—"} mesas</span></div>
            </div>
          {isContact ? (
            <div className="table-selection__contact">
              <h2>Coordinemos tu distribución</h2>
              <p>Para grupos de 25 personas o más necesitamos coordinar una distribución especial.</p>
              <a className="flow-continue" href={`https://wa.me/${TABLE_SELECTION_RULES.whatsappRestaurant}?text=${whatsappMessage}`} target="_blank" rel="noreferrer">Coordinar por WhatsApp <span>→</span></a>
            </div>
          ) : isSpecial ? (
            <LargeGroupSelector selectedId={state.specialConfigId} onSelect={(id) => dispatch({ type: "SELECT_SPECIAL", id })} />
          ) : (
            <>
              {familyOption && (
                <div className="family-half-picker">
                  <p>Elige una mitad de la otra mesa familiar para completar 12 personas.</p>
                  {splitFamilyTable(state.selection[0] === "I23" ? "I24" : "I23").map((half) => (
                    <button type="button" key={half} onClick={() => selectFamilyHalf(half)}>{half} · 4 lugares</button>
                  ))}
                </div>
              )}
              <p className="table-selection__progress" aria-live="polite">
                Mesas seleccionadas: {familyPairComplete ? 2 : state.selection.length} de {displayedRequiredCount}
                {complete && " · Selección completa"}
                {state.orientation && ` · Línea ${state.orientation === "H" ? "horizontal" : "vertical"}`}
              </p>
              {floorConfig?.id === "first" && (
                <p className="table-selection__progress">
                  Capacidad seleccionada: {capacity} de {partySize} personas.
                  {" "}Mesas 1–4: 3 personas cada una. Mesas 7–6–5: 2 personas cada una.
                  {" "}Une mesas seguidas de una misma fila.
                </p>
              )}
              {isVenue17 && <p className="table-selection__progress">Salón principal: hasta 16 personas con las mesas 1, 2, 3, 7, 8 y 9. Salón interior: hasta 12 con las mesas 10–13. Capacidad seleccionada: {capacity} de {partySize} personas.</p>}
              <div className={`table-selection__map-stage ${firstNotice ? "is-notice-open" : ""}`}>
                {!availability.loading && (
                  <RestaurantFloorPlan
                    statuses={statuses}
                    onSelect={selectTable}
                    partySize={partySize}
                    selection={state.selection}
                    reservedIds={availability.reservedIds}
                    floorConfig={floorConfig}
                    tables={floorTables}
                  />
                )}
                {firstNotice && (
                  <div className="table-selection__notice-overlay">
                    <div className="table-selection__notice" role="dialog" aria-modal="true" aria-labelledby="selection-notice-title">
                      <strong id="selection-notice-title">Para tu grupo necesitas mesas juntas.</strong>
                      <p>Elige primero una mesa y después solo se habilitarán las que pueden unirse correctamente.</p>
                      {!isVenue17 && required.count >= 3 && <p>Las mesas deben mantenerse en una sola línea para evitar configuraciones en L.</p>}
                      <button type="button" onClick={() => dispatch({ type: "ACK_NOTICE" })}>Entendido, seleccionar mesas</button>
                    </div>
                  </div>
                )}
              </div>
              {availability.loading && <div className="table-selection__loading">Cargando disponibilidad…</div>}
              {availability.error && <button type="button" className="table-selection__retry" onClick={refresh}>Reintentar</button>}
              <TableStatusLegend />
              {floor === "second" && (
                <p className="table-selection__family-note">
                  <strong>I23 e I24 · Mesas familiares</strong>
                  <span>Cada una tiene capacidad para 8 personas y está formada por dos mesas unidas.</span>
                </p>
              )}
            </>
          )}
          {state.message && <p className="table-selection__message" role="alert">{state.message}</p>}
          </div>
          <aside className="table-selection__side">
            <div className="table-selection__side-heading"><span>Resumen de reserva</span><FaCheck /></div>
            <div className="table-selection__details">
              <div><FaUsers /><span><small>Personas</small><strong>{formatParty(partySize)}</strong></span></div>
              <div><FaCalendarAlt /><span><small>Fecha</small><strong>{reservation.date || "Por confirmar"}</strong></span></div>
              <div><FaClock /><span><small>Horario</small><strong>{reservation.service || "Servicio"} · {reservation.time || "Hora"}</strong></span></div>
            </div>
            <div className="table-selection__selected">
              <small>UBICACIÓN SELECCIONADA</small>
              <strong>{state.specialConfigId || (state.selection.length ? state.selection.join(" · ") : "Aún no seleccionada")}</strong>
              <span>Capacidad total: {capacity} personas</span>
            </div>
            <div className="table-selection__side-actions">
              <button type="button" onClick={() => dispatch({ type: "UNDO" })} disabled={!state.selection.length}>Quitar última</button>
              <button type="button" onClick={() => dispatch({ type: "RESET" })} disabled={!state.selection.length && !state.specialConfigId}>Reiniciar</button>
            </div>
            {!isContact && <button className="table-selection__continue" type="button" disabled={!complete || firstNotice} onClick={completeSelection}>{complete ? "Continuar" : "Selecciona tu mesa"} <span>→</span></button>}
          </aside>
        </div>
      </section>
    </main>
  );
};
