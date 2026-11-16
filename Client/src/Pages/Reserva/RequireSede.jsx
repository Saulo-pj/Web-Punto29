import { Navigate, useSearchParams } from "react-router-dom";

export const RequireSede = ({ children }) => {
  const [params] = useSearchParams();
  if (!["17", "20"].includes(params.get("sede"))) return <Navigate to="/reserva/sede" replace />;
  const people = Number(params.get("personas"));
  if (params.get("sede") === "17" && (people > 16 || people < 0)) return <Navigate to="/reserva/personas?sede=17" replace />;
  return children;
};
