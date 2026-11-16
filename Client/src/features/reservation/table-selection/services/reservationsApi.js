const getSlotKey = ({ date, service, time, locationId }) =>
  [date || "", service || "", time || "", locationId || ""].join("|");

export const getReservedTables = async (reservation) => {
  await Promise.resolve();
  const stored = sessionStorage.getItem("punto29-reserved-tables");
  const reservationsBySlot = stored ? JSON.parse(stored) : {};
  return reservationsBySlot[getSlotKey(reservation)] || [];
};

export const createReservation = async ({ tableIds, ...reservation }) => {
  const reserved = await getReservedTables(reservation);
  if (tableIds.some((id) => reserved.includes(id))) {
    const error = new Error("TABLE_CONFLICT");
    error.status = 409;
    error.code = "TABLE_CONFLICT";
    throw error;
  }
  const stored = sessionStorage.getItem("punto29-reserved-tables");
  const reservationsBySlot = stored ? JSON.parse(stored) : {};
  reservationsBySlot[getSlotKey(reservation)] = [...reserved, ...tableIds];
  sessionStorage.setItem("punto29-reserved-tables", JSON.stringify(reservationsBySlot));
  return { status: 201, reservation: { ...reservation, tableIds } };
};
