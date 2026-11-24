export const TableStatusLegend = () => (
  <div className="table-selection__legend" aria-label="Leyenda del estado de las mesas">
    <span><i data-status="available" /> Disponible</span>
    <span><i data-status="selected">✓</i> Seleccionada</span>
    <span><i data-status="reserved" /> No disponible</span>
    <span><i data-status="distribution-blocked" /> No forma línea</span>
  </div>
);
