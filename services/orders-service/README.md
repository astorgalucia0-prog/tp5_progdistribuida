# Orders Service

Microservicio encargado de la orquestación integral del flujo de compras, cálculo de totales, persistencia del estado de las transacciones e integración con los servicios de **Catálogo** e **Inventario**.

---

### Configuración del Entorno

| Parámetro | Detalle / Valor |
| :--- | :--- |
| **Puerto HTTP** | `3003` |
| **Base de Datos** | MongoDB (`db_orders`) |
| **Protocolo de Comunicación** | REST / JSON |

---

### Responsabilidades Principales

* **Orquestación de Compras:** Coordinar el ciclo de vida de los pedidos desde la creación hasta su resolución.
* **Integración con Servicios Externos:**
  * Consulta y congelamiento de precios con el servicio de **Catálogo**.
  * Solicitud de reserva, confirmación o liberación de existencias con el servicio de **Inventario**.
* **Gestión Transaccional:** Registro, cálculo de importes finales y actualización atómica del estado de las órdenes.

---

### Endpoints Públicos

**Base URL:** `http://localhost:3003/api/orders`

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/orders` | Crea una nueva orden e inicia la reserva temporal de stock. |
| `GET` | `/api/orders/:order_id` | Obtiene el detalle y estado actual de una orden por su ID. |
| `GET` | `/api/orders/customer/:customer_id` | Recupera el historial completo de pedidos asociados a un cliente. |
| `POST` | `/api/orders/:order_id/confirm` | Confirma la compra y solicita la deducción definitiva del stock. |
| `POST` | `/api/orders/:order_id/cancel` | Cancela la orden y dispara la liberación del stock reservado. |
| `GET` | `/api/orders/health` | Chequeo de estado y disponibilidad del microservicio (*Health Check*). |
