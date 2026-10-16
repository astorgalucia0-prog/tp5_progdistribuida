# Inventory Service

Microservicio encargado del control atómico de existencias físicas en almacén, validación de disponibilidad en tiempo real y gestión de reservas temporales con exclusión mutua distribuida.

---

### Configuración del Entorno

| Parámetro | Detalle / Valor |
| :--- | :--- |
| **Puerto HTTP** | `3002` |
| **Base de Datos** | MongoDB (`db_inventory`) |
| **Mecanismo de Concurrencia y Locks** | Redis / Memurai (`6379`) |
| **Protocolo de Comunicación** | REST / JSON |

---

### Responsabilidades Principales

* **Control de Existencias:** Mantener la consistencia del inventario físico (`stock_total`, `stock_disponible`, `stock_reservado`).
* **Reservas Atómicas:** Gestión de reservas temporales con tiempo de expiración (TTL de 10 min) y exclusión mutua para evitar sobreventa (*overselling*).
* **Confirmación y Liquidación:** Deducción definitiva de existencias tras confirmación de compra o liberación automática ante cancelaciones.
* **Ajuste de Mercadería:** Operaciones de ingreso y reposición de stock en almacén.

---

### Endpoints Públicos

**Base URL:** `http://localhost:3002/api/inventory`

| Método | Endpoint | Descripción | Códigos HTTP |
| :---: | :--- | :--- | :--- |
| `GET` | `/api/inventory/:code` | Consulta existencias disponibles y estado para venta. | `200 OK` · `404 Not Found` |
| `POST` | `/api/inventory/reserve` | Reserva atómica temporal de unidades con TTL. | `200 OK` · `409 Conflict` (sin stock) |
| `POST` | `/api/inventory/confirm` | Deducción definitiva del stock reservado tras el pago. | `200 OK` · `400 Bad Request` |
| `POST` | `/api/inventory/release` | Liberación de reserva por cancelación o expiración. | `200 OK` · `404 Not Found` |
| `POST` | `/api/inventory/:code/stock` | Ajuste manual o reposición de stock en almacén. | `200 OK` · `400 Bad Request` |
| `GET` | `/api/inventory/health` | Chequeo de estado del servicio, MongoDB y Redis (*Health Check*). | `200 OK` · `503 Unavailable` |
