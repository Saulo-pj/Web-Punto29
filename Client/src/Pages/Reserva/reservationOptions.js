export const RESERVATION_REASONS = [
    { value: "cumpleanos", label: "Cumpleaños", icon: "🎂" },
    { value: "reunion", label: "Reunión", icon: "🤝" },
    { value: "pedida", label: "Pedida de mano", icon: "💍" },
    { value: "comida", label: "Solo comer", icon: "🍽️" },
];

const GENERAL_BIRTHDAY_COURTESIES = [
    "Mojito",
    "Tinto de verano",
    "Daiquiri de durazno",
    "Leche de tigre",
    "Torta de tres leches",
    "Crema volteada",
];

export const getBirthdayCourtesies = (venue, turn) => {
    if (venue === "17") {
        return turn === "Turno noche"
            ? ["Jarra de chicha (1 litro)", "Salchipapa clásica"]
            : ["Leche de tigre", "Causa"];
    }
    if (venue === "20") return ["Causa"];
    return GENERAL_BIRTHDAY_COURTESIES;
};
