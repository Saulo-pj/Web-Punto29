const getSlotKey = ({ date, service, time, locationId }) =>
  [date || "", service || "", time || "", locationId || ""].join("|");

// Demo-only availability: it resets when the page is reloaded and is never
// written to a database or browser storage.
const reservationsBySlot = {};

export const getReservedTables = async (reservation) => {
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
  reservationsBySlot[getSlotKey(reservation)] = [...reserved, ...tableIds];
  return { status: 201, reservation: { ...reservation, tableIds } };
};
