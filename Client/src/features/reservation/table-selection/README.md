# Selección de mesas

Este módulo contiene el paso 5 de reservas. La UI usa React y CSS global del
proyecto; las reglas de negocio están en `domain/tableRules.js` y la
configuración editable está en `config/`.

La capa de datos implementa temporalmente estos contratos:

- `GET /api/availability?date&service&time&locationId` devuelve
  `{ reservedTableIds: string[] }`.
- `POST /api/reservations` recibe los datos de reserva, `tableIds` y
  `specialConfigId`, y responde `201` o `409` con código `TABLE_CONFLICT`.

`services/reservationsApi.js` es un mock intercambiable. Antes de producción
debe reemplazarse por el cliente HTTP del backend, donde la disponibilidad y la
creación se validen en una transacción.

El número de WhatsApp se configura con `VITE_WHATSAPP_RESTAURANT`; el valor
actual es solo un fallback de desarrollo.
