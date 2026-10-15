# Catalog Service

**Puerto HTTP:** `3001`  
**Base de Datos:** MongoDB `db_catalog`  
**Responsabilidad:** Gestión comercial y descriptiva de productos, categorías y precios de lista.

## Endpoints Públicos
- `GET /api/catalog/products`: Listado de catálogo comercial.
- `GET /api/catalog/products/:code`: Detalle de producto por código.
- `POST /api/catalog/products`: Creación de nuevo producto.
- `PUT /api/catalog/products/:code`: Actualización de ficha comercial.
- `DELETE /api/catalog/products/:code`: Baja lógica de producto.
- `GET /api/catalog/health`: Chequeo de salud del servicio.
