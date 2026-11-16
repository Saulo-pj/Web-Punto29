export const TABLE_SELECTION_RULES = {
  familyTablesForSmallParties: false,
  allowTwoFamiliesForNineToTwelve: false,
  maxTablesByZone: { B: 2, T: 5 },
  blockedForLargeGroups: [],
  whatsappRestaurant: import.meta.env.VITE_WHATSAPP_RESTAURANT || "51999999999",
  specialGroupMin: 21,
  specialGroupMax: 24,
};

export const tableTypeLabels = {
  standard: "estándar",
  small: "pequeña",
  family: "familiar",
};
