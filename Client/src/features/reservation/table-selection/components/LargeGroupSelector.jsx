import { SPECIAL_CONFIGURATIONS } from "../config/layout.config";

const LargeGroupDrawing = ({ configurationId }) => (
  <svg
    className={`large-group-drawing large-group-drawing--${configurationId.toLowerCase()}`}
    viewBox="0 0 260 100"
    role="img"
    aria-label={configurationId === "U" ? "Mesas formando una U" : "Dos filas de mesas enfrentadas"}
  >
    {configurationId === "U" ? (
      <>
        <g className="large-group-drawing__table-row large-group-drawing__table-row--left">
          <rect x="28" y="18" width="32" height="22" rx="4" />
          <rect x="28" y="44" width="32" height="22" rx="4" />
          <rect x="28" y="70" width="32" height="22" rx="4" />
        </g>
        <g className="large-group-drawing__table-row large-group-drawing__table-row--top">
          <rect x="64" y="18" width="32" height="22" rx="4" />
          <rect x="100" y="18" width="32" height="22" rx="4" />
          <rect x="136" y="18" width="32" height="22" rx="4" />
          <rect x="172" y="18" width="32" height="22" rx="4" />
        </g>
        <g className="large-group-drawing__table-row large-group-drawing__table-row--right">
          <rect x="208" y="18" width="32" height="22" rx="4" />
          <rect x="208" y="44" width="32" height="22" rx="4" />
          <rect x="208" y="70" width="32" height="22" rx="4" />
        </g>
        <text x="134" y="62">ESPACIO CENTRAL</text>
      </>
    ) : (
      <>
        <g className="large-group-drawing__table-row">
          <rect x="27" y="20" width="46" height="22" rx="4" />
          <rect x="80" y="20" width="46" height="22" rx="4" />
          <rect x="133" y="20" width="46" height="22" rx="4" />
          <rect x="186" y="20" width="46" height="22" rx="4" />
        </g>
        <g className="large-group-drawing__table-row">
          <rect x="27" y="58" width="46" height="22" rx="4" />
          <rect x="80" y="58" width="46" height="22" rx="4" />
          <rect x="133" y="58" width="46" height="22" rx="4" />
          <rect x="186" y="58" width="46" height="22" rx="4" />
        </g>
        <text x="130" y="53">MESA CENTRAL</text>
      </>
    )}
  </svg>
);

export const LargeGroupSelector = ({ selectedId, onSelect }) => (
  <div className="large-group-options">
    {SPECIAL_CONFIGURATIONS.map((configuration) => (
      <button
        type="button"
        key={configuration.id}
        className={selectedId === configuration.id ? "is-selected" : ""}
        onClick={() => onSelect(configuration.id)}
        aria-pressed={selectedId === configuration.id}
      >
        <LargeGroupDrawing configurationId={configuration.id} />
        <strong>{configuration.name}</strong>
        <small>{configuration.description}</small>
        {selectedId === configuration.id && <b className="large-group-check">✓</b>}
      </button>
    ))}
  </div>
);
