const getSlotKey = ({ date, service, time, locationId }) =>
  [date || "", service || "", time || "", locationId || ""].join("|");

export const getReservedTables = async (reservation) => {
  const params = new URLSearchParams({
    sede_id: reservation.locationId || "",
    fecha_reserva: reservation.date || "",
    turno: reservation.service || "",
    hora_reserva: reservation.time || "",
  });
  const response = await fetch(`/api/reservas/disponibilidad?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo consultar disponibilidad.");
  const data = await response.json();
  return Array.isArray(data.tableIds) ? data.tableIds : [];
};

export const createReservation = async ({ tableIds, ...reservation }) => {
  const response = await fetch("/api/operaciones/reservas/validar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sede_id: Number(reservation.locationId),
      fecha_reserva: reservation.date,
      turno: reservation.service,
      hora_reserva: reservation.time,
      cantidad_personas: Number(reservation.partySize),
      mesa_ids: tableIds,
      configuracion: reservation.specialConfigId,
    }),
  });
  if (response.status === 409) {
    const error = new Error("TABLE_CONFLICT");
    error.code = "TABLE_CONFLICT";
    throw error;
  }
  if (!response.ok) throw new Error("No se pudo crear la reserva.");
  return { status: 201, reservation: { ...reservation, tableIds } };
};
