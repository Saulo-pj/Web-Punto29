import { useNavigate, useSearchParams } from "react-router-dom";
import { TableSelectionStep } from "../../features/reservation/table-selection/TableSelectionStep";
import "./Reserva.css";

const Mesa = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reservation = {
    partySize: Number(params.get("personas")) || 2,
    date: params.get("fecha") || "",
    service: params.get("turno") || "",
    time: params.get("hora") || "",
    locationId: params.get("sede"),
  };
  const onComplete = ({ tableIds, specialConfigId }) => {
    const nextParams = new URLSearchParams(params);
    nextParams.set("mesa", tableIds.join("-") || specialConfigId);
    if (specialConfigId) nextParams.set("configuracion", specialConfigId);
    navigate(`/reserva/datos-cliente?${nextParams.toString()}`);
  };
  return (
    <TableSelectionStep
      reservation={reservation}
      onComplete={onComplete}
      onBack={() => navigate(`/reserva/turno-hora?${params.toString()}`)}
    />
  );
};

export default Mesa;
