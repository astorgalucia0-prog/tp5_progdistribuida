# Trabajo Práctico N° 5: De API REST a Microservicios
**Licenciatura en Sistemas de Información — Programación Distribuida**  
**Universidad Champagnat**

---

## Información del Proyecto
- **Repositorio Remoto Único:** [https://github.com/astorgalucia0-prog/tp5_progdistribuida](https://github.com/astorgalucia0-prog/tp5_progdistribuida)
- **Rama Principal:** `main`
- **Rama de Trabajo:** `docs/arquitectura`
- **Docentes de la Cátedra incorporados:**
  - Adriel Álvarez (`alvarezadriel@uch.edu.ar`)
  - Edgardo Cortez (`cortezedgardo@uch.edu.ar`)
- **Versión Funcional de Partida:** API REST Distribuida con Consenso Raft (3 nodos), Exclusión Mutua con Redis Lock y Persistencia Mongoose (TP4).

---

## 5. Análisis de la Aplicación Existente

### 5.1 Relevamiento de Componentes y Recursos Actuales
La aplicación base sobre la que se realiza la evolución corresponde a una API REST monolítica distribuida desarrollada para la gestión de productos y accesorios tecnológicos.

- **Entidades Principales:**
  - `Producto`: Representa un artículo en catálogo y a la vez su inventario físico (`codigo`, `nombre`, `precio`, `stock`, `categoria`, `descripcion`).
  - `RaftState / Entry`: Representa el estado del algoritmo de consenso distribuido persistido en archivos JSON locales (`term`, `votedFor`, `log`).
  - `RedisLock`: Recurso en memoria utilizado como sección crítica para exclusión mutua distribuida (`lock:producto:<id>`).
- **Módulos y Controladores Involucrados:**
  - `src/service.js`: Servidor Express principal, configuración de puertos HTTP/HTTPS, Swagger UI y logging centralizado con Winston.
  - `src/endpoints.js`: Enrutador de operaciones CRUD sobre productos y reservas con lógica de verificación Raft y Redis.
  - `src/models/Producto.js`: Definición de esquema y validaciones con Mongoose.
  - `src/redis.js`: Abstracción de conexión y funciones de lock distribuido (`acquireLock`, `releaseLock`).
  - `src/database.js`: Administrador de ciclo de vida de conexión con MongoDB.
  - `src/raft/`: Submódulos del protocolo Raft (`raftNode.js`, `raftRouter.js`, `raftPersistence.js`, `stateMachine.js`, `nodeConfig.js`).
- **Acceso a Persistencia:**
  - Todos los endpoints de negocio operan sobre la misma base de datos MongoDB compartida (`tp3_distribuida` o `tp3_db_nodeX`), sin segmentación por contexto de dominio.

### 5.2 Inventario Inicial de Funcionalidades y Endpoints

| Funcionalidad / Endpoint | Responsabilidad Actual | Datos Utilizados | Dependencias |
| :--- | :--- | :--- | :--- |
| **GET /api** | Informa el estado general del nodo, conectividad con base de datos y estado de consenso Raft. | `nodeId`, `role`, estado de conexión MongoDB, estado de conexión Redis, timestamp. | `raftNode`, `database.js`, `redis.js`. |
| **GET /api/productos** (o `/accesorios`) | Recupera la lista completa de artículos para visualización en el catálogo; ejecuta semillero inicial si la base está vacía. | Colección `productos` de MongoDB (`_id`, `codigo`, `nombre`, `precio`, `stock`, `categoria`, `descripcion`). | `Producto` (Mongoose), `database.js`. |
| **GET /api/productos/:id** (o `/accesorios/:id`) | Busca y retorna la ficha individual de un producto mediante su `ObjectId` o código de catálogo (`PROD-XXX`). | Parámetro `id` o `codigo`, documento en MongoDB. | `Producto` (Mongoose), `database.js`. |
| **POST /api/productos** (o `/accesorios`) | Valida datos de entrada y propone una entrada en el log replicado de Raft (solo si el nodo es Líder). | `codigo`, `nombre`, `precio`, `stock`, `categoria`, `descripcion`. | `Producto`, `raftNode.proposeCommand()`, MongoDB. |
| **PUT /api/productos/:id** (o `/accesorios/:id`) | Propone la modificación de atributos descriptivos y/o de stock en el cluster Raft. | Parámetro `id`, campos modificados en `req.body`. | `Producto`, `raftNode.proposeCommand()`, MongoDB. |
| **DELETE /api/productos/:id** (o `/accesorios/:id`) | Propone la eliminación física del artículo por consenso de mayoría en Raft. | Parámetro `id` / `codigo`. | `Producto`, `raftNode.proposeCommand()`, MongoDB. |
| **POST /api/productos/:id/reservar** | Adquiere un lock temporal en Redis, propone el decremento de stock por consenso Raft y libera el lock. | `id` del producto, clave de lock `lock:producto:<id>`, `stock`. | `redis.js` (`acquireLock`, `releaseLock`), `raftNode`, `Producto` en MongoDB. |
| **GET /raft/status** | Expone métricas de diagnóstico del nodo para observabilidad del protocolo Raft. | `nodeId`, `role`, `currentTerm`, `votedFor`, `leaderId`, `commitIndex`, `lastApplied`, `log`. | `raftNode`. |
| **POST /raft/request-vote** | RPC de protocolo para solicitud de votos durante elecciones de Líder. | `term`, `candidateId`, `lastLogIndex`, `lastLogTerm`. | `raftNode`. |
| **POST /raft/append-entries** | RPC de protocolo para replicación de logs y latidos (*heartbeats*). | `term`, `leaderId`, `prevLogIndex`, `prevLogTerm`, `entries`, `leaderCommit`. | `raftNode`, `stateMachine.js`. |

---

## 6. Identificación de Responsabilidades Funcionales

A partir del inventario anterior, se agrupan las funcionalidades según su verdadera responsabilidad de negocio en **tres áreas funcionales**:

### Grupo Funcional A: Gestión de Catálogo y Datos Comerciales
Agrupa las funcionalidades relacionadas con la publicación, mantenimiento y consulta de las fichas comerciales de los artículos.

1. **¿Qué problema o necesidad del sistema resuelve?**
   Permite que los usuarios consulten y administren la información comercial de los productos disponibles (nombres, descripciones, categorías, precios de venta), sirviendo de base para la navegación de la tienda.
2. **¿Qué operaciones realiza?**
   Alta de nuevos artículos, edición de nombres, categorías, fichas técnicas y precios, bajas de artículos obsoletos, listado paginado y búsqueda por identificador comercial o código.
3. **¿Qué reglas de negocio contiene?**
   - El código de producto debe ser único y normalizado en mayúsculas.
   - El precio de venta no puede ser negativo.
   - El nombre comercial debe tener un mínimo de 2 caracteres.
   - Todo producto debe pertenecer a una categoría definida (o default "Otros").
4. **¿Qué información necesita para trabajar?**
   Datos descriptivos del producto: código, nombre, categoría, descripción, precio sugerido.
5. **¿Qué información crea o modifica?**
   Crea y actualiza registros en la base de datos de catálogo comercial.
6. **¿Qué otras funcionalidades necesita conocer?**
   No requiere conocer la existencia de existencias físicas en bodega ni la infraestructura de pagos o pedidos para publicar su información descriptiva.
7. **¿Qué cambios funcionales suelen ocurrir juntos?**
   Cambios de temporada, actualización masiva de precios, modificación de categorías o incorporación de nuevas características de producto (especificaciones técnicas).
8. **¿Podría evolucionar de manera independiente del resto de la aplicación?**
   **Sí.** El catálogo tiene un patrón de acceso principalmente de lectura masiva (Read-Heavy), con requerimientos de indexación textual y cacheo muy diferentes a los del stock físico o pedidos.

---

### Grupo Funcional B: Control de Inventario, Existencias y Reservas
Agrupa las funcionalidades vinculadas al conteo de unidades físicas en almacén, validación de disponibilidad y reservas operativas.

1. **¿Qué problema o necesidad del sistema resuelve?**
   Evita la sobreventa (*overselling*) de mercadería garantizando que solo se puedan reservar o despachar unidades efectivamente disponibles en stock.
2. **¿Qué operaciones realiza?**
   Consulta de existencias físicas disponibles, ingreso de stock por reposición, reserva de unidades para una compra en curso, liberación de reservas caducadas y deducción definitiva de stock.
3. **¿Qué reglas de negocio contiene?**
   - El stock no puede ser negativo bajo ninguna circunstancia.
   - Toda reserva temporal exige exclusión mutua para evitar condiciones de carrera (*race conditions*) en escenarios de alta concurrencia.
   - El stock debe ser estrictamente un número entero mayor o igual a cero.
4. **¿Qué información necesita para trabajar?**
   Identificador único del producto (`codigo`), cantidad solicitada, identificador de la reserva/transacción.
5. **¿Qué información crea o modifica?**
   Stock total, stock disponible, stock reservado y marcas temporales de reservas.
6. **¿Qué otras funcionalidades necesita conocer?**
   Únicamente el identificador comercial del producto para correlacionar las existencias; no necesita conocer el nombre, descripción ni imagen del producto.
7. **¿Qué cambios funcionales suelen ocurrir juntos?**
   Políticas de umbrales mínimos de reposición, reglas de vencimiento de reservas temporales, integración con lectores de almacén o WMS.
8. **¿Podría evolucionar de manera independiente del resto de la aplicación?**
   **Sí.** Tiene un perfil transaccional de alta tasa de escrituras críticas y requiere mecanismos especializados de concurrencia y bloqueo que no deben afectar la navegación del catálogo.

---

### Grupo Funcional C: Gestión de Órdenes y Pedidos de Clientes
Agrupa la orquestación del flujo de compra: consolidación de artículos solicitados por un cliente, verificación de precios con catálogo y aseguramiento de existencias con inventario.

1. **¿Qué problema o necesidad del sistema resuelve?**
   Permite a los clientes agrupar artículos, formalizar una intención de compra, registrar la trazabilidad de la orden y coordinar las validaciones previas a la confirmación de la venta.
2. **¿Qué operaciones realiza?**
   Creación de orden, adición de líneas de pedido, cálculo de total a pagar, coordinación de reserva de existencias y cambio de estados (Pendiente, Confirmada, Cancelada, Despachada).
3. **¿Qué reglas de negocio contiene?**
   - Una orden debe contener al menos un producto con cantidad mayor a cero.
   - El precio unitario debe fijarse al momento de crear la orden (inmutabilidad de precio acordado).
   - Para confirmarse, debe haber obtenido reserva positiva de stock de todos los ítems.
4. **¿Qué información necesita para trabajar?**
   Identificador de cliente, lista de productos solicitados con sus cantidades, precios unitarios provistos por el catálogo y confirmación de reserva provista por inventario.
5. **¿Qué información crea o modifica?**
   Cabecera de la orden, líneas de detalle de pedido, estado de la orden, total monetario y timestamps de trazabilidad.
6. **¿Qué otras funcionalidades necesita conocer?**
   Necesita consultar la interfaz pública de Catálogo (para validar existencia y precio) y la interfaz de Inventario (para solicitar reservas de unidades).
7. **¿Qué cambios funcionales suelen ocurrir juntos?**
   Políticas comerciales de descuentos, cupones de promoción, reglas de facturación y nuevos estados de ciclo de vida de pedidos.
8. **¿Podría evolucionar de manera independiente del resto de la aplicación?**
   **Sí.** El ciclo de vida de una orden responde a la lógica de negocio comercial y administrativo, pudiendo cambiar sus estados o reglas de pago sin alterar el catálogo ni la gestión física de bodegas.

---

## 7. Identificación de Acoplamientos en la Aplicación Actual

Se identifican tres situaciones críticas de acoplamiento presentes en la implementación base:

### Caso 1: Acoplamiento de Modelo de Datos (Catálogo y Stock unificados en `Producto.js`)
- **Componentes acoplados:** Módulo de Catálogo Comercial y Módulo de Control de Stock.
- **Por qué existe:** En la versión monolítica inicial se definió una única colección de MongoDB (`Producto`) que agrupa atributos descriptivos (`nombre`, `descripcion`, `categoria`, `precio`) con atributos logísticos operacionales (`stock`).
- **Problema generado al crecer el sistema:**
  1. *Contención en base de datos:* Múltiples solicitudes de consulta pública de la tienda compiten por el mismo documento de base de datos que se bloquea durante actualizaciones de stock por ventas concurrentes.
  2. *Imposibilidad de escalar independientemente:* No es posible escalar horizontalmente el catálogo (patrón de lectura masiva) sin replicar innecesariamente la infraestructura transaccional de stock.
  3. *Violación de límites de dominio:* El equipo de marketing o catálogo puede alterar involuntariamente el stock de un producto al actualizar una ficha descriptiva.
- **Propuesta de desacople:** Separar la información en dos modelos con persistencia independiente:
  - `Catalog Service`: Almacena `codigo`, `nombre`, `precio`, `categoria`, `descripcion`.
  - `Inventory Service`: Almacena `codigo`, `stock_disponible`, `stock_reservado`.
  La relación se mantiene únicamente mediante el identificador inmutable `codigo`.

### Caso 2: Acoplamiento de Infraestructura y Concurrencia en Rutas de Negocio (`src/endpoints.js` + `src/redis.js`)
- **Componentes acoplados:** Controlador de rutas HTTP (`router.post('/productos/:id/reservar')`) y cliente de Redis (`acquireLock`).
- **Por qué existe:** El endpoint de reserva orquesta directamente primitivas de bajo nivel de Redis (adquisición de token UUID, timeout de 5 segundos, liberación en bloque `finally`) en el mismo archivo donde se procesan las peticiones HTTP de la API REST.
- **Problema generado al crecer el sistema:**
  1. *Falta de reusabilidad:* Cualquier otra funcionalidad que necesite reservar stock debe duplicar la lógica de Redis Lock.
  2. *Fragilidad tecnológica:* Si se decide cambiar Redis por otro gestor de concurrencia (como bloqueos a nivel de base de datos o colas transaccionales), se debe modificar el controlador de la API REST.
  3. *Dificultad de testing:* No es posible probar la regla de negocio de reserva sin levantar obligatoriamente una instancia de Redis/Memurai conectada al proceso principal.
- **Propuesta de desacople:** Encapsular toda la lógica de reserva, concurrencia y bloqueos dentro de un microservicio autónomo (`Inventory Service`). Dicho microservicio expone un endpoint REST público limpio (`POST /api/inventory/reservas`), dejando a Redis como un detalle interno de implementación 100% invisible para el resto de los servicios y clientes.

### Caso 3: Acoplamiento de Dependencia Circular entre Rutas y Consenso (`service.js` $\leftrightarrow$ `endpoints.js`)
- **Componentes acoplados:** Servidor principal (`src/service.js`) y enrutador de la API (`src/endpoints.js`).
- **Por qué existe:** `src/service.js` instancia el objeto `raftNode` y lo exporta; `src/endpoints.js` importa `raftNode` para proponer comandos de consenso, y a su vez `service.js` importa `endpoints.js` para montarlo en `app.use(API_PREFIX, endpoints)`.
- **Problema generado al crecer el sistema:**
  1. *Fuerte acoplamiento en arranque:* Si falla la inicialización de la capa de consenso o de Redis, todo el servidor HTTP colapsa, impidiendo incluso servir lecturas estáticas de productos o Swagger UI.
  2. *Dificultad para desacoplar responsabilidades:* Las peticiones CRUD convencionales están rígidamente entrelazadas con las reglas del protocolo Raft (rechazo con código 409 según el rol del nodo en `proponerConsensoORechazar`).
- **Propuesta de desacople:** Separar las responsabilidades en servicios desacoplados que corran en procesos independientes. Los servicios de negocio se comunican mediante contratos HTTP REST asíncronos o síncronos bien tipados, eliminando importaciones circulares en tiempo de compilación/ejecución.

### Matriz Resumen de Acoplamientos Detectados

| Caso | Acoplamiento Detectado | Problema Generado | Propuesta de Desacople |
| :---: | :--- | :--- | :--- |
| **1** | **Catálogo y Stock unificados en `Producto.js`** | Contención de escritura/lectura en la misma entidad de BD; imposibilidad de escalar lecturas comerciales de forma independiente a las reservas transaccionales. | Dividir en dos servicios independientes: `Catalog Service` y `Inventory Service`, vinculados únicamente por el `codigo` de producto. |
| **2** | **Lógica de Concurrencia (Redis Lock) embebida en endpoint HTTP** | Mezcla de infraestructura con lógica de presentación; si cambia la tecnología de locking se rompe la API REST; duplica lógica para futuros casos de uso. | Encapsular Redis Lock como detalle privado de persistencia dentro de `Inventory Service`, exponiendo un endpoint REST limpio `POST /inventory/reservas`. |
| **3** | **Dependencia circular y acoplamiento con protocolo Raft** | Interdependencia entre arranque del servidor Express y el estado del cluster distribuido; caídas en cascada; imposibilidad de probar rutas aisladas. | Procesos Node.js autónomos por microservicio con ciclo de vida independiente y comunicación externa vía HTTP REST. |
