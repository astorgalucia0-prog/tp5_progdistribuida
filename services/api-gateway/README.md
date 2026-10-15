# API Gateway

**Puerto HTTP:** `8080`  
**Responsabilidad:** Punto de entrada único perimetral para clientes, enrutamiento hacia microservicios por prefijo de ruta, CORS y agregación liviana.

## Mapeo de Rutas
- `/api/catalog/*` $\rightarrow$ `Catalog Service (:3001)`
- `/api/inventory/*` $\rightarrow$ `Inventory Service (:3002)`
- `/api/orders/*` $\rightarrow$ `Orders Service (:3003)`
