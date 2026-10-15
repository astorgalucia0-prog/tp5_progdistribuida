# Inventory Service

**Puerto HTTP:** `3002`  
**Base de Datos:** MongoDB `db_inventory`  
**Caché y Locks:** Redis / Memurai (`6379`)  
**Responsabilidad:** Control atómico de existencias físicas en almacén, validación de disponibilidad y reservas con exclusión mutua.

## Endpoints Públicos
- `GET /api/inventory/:code`: Consulta de existencias disponibles.
- `POST /api/inventory/reserve`: Reserva atómica temporal de stock con TTL.
- `POST /api/inventory/confirm`: Deducción definitiva de stock tras concretar compra.
- `POST /api/inventory/release`: Liberación de reserva por cancelación.
- `POST /api/inventory/:code/stock`: Ajuste o reposición física de almacén.
- `GET /api/inventory/health`: Chequeo de salud del servicio y Redis.
