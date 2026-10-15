# Orders Service

**Puerto HTTP:** `3003`  
**Base de Datos:** MongoDB `db_orders`  
**Responsabilidad:** Orquestación del proceso de compras, cálculo de totales, congelamiento de precios e integración con Catálogo e Inventario.

## Endpoints Públicos
- `POST /api/orders`: Creación de orden e inicio de reserva de stock.
- `GET /api/orders/:order_id`: Consulta del estado de una orden.
- `GET /api/orders/customer/:customer_id`: Historial de pedidos por cliente.
- `POST /api/orders/:order_id/confirm`: Confirmación de orden y deducción de stock.
- `POST /api/orders/:order_id/cancel`: Cancelación de orden y liberación de stock.
- `GET /api/orders/health`: Chequeo de salud del servicio.
