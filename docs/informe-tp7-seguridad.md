# Universidad Champagnat
## Licenciatura en Sistemas de Información — Programación Distribuida
### Trabajo Práctico N° 7: Autenticación, Autorización y Seguridad con JWT

---

**Fecha de Entrega:** Ciclo Lectivo 2026  
**Grupo N°:** 8  
**Integrantes:**
* **Astorga, Lucía** (`astorgalucia0@gmail.com`)
* **Bustos, Emmanuel**
* **Lombardo, Damián**
* **Militello, Santiago**

**Docentes de Cátedra:**
* Adriel Álvarez (`alvarezadriel@uch.edu.ar`)
* Edgardo Cortez (`cortezedgardo@uch.edu.ar`)

**Repositorio Remoto Oficial:** [https://github.com/astorgalucia0-prog/tp5_progdistribuida](https://github.com/astorgalucia0-prog/tp5_progdistribuida)  
**Etiqueta de Entrega:** `tp7-entrega`

---

## 1. Introducción y Objetivos del Trabajo Práctico

El presente trabajo práctico tiene como objetivo principal incorporar una capa robusta de **autenticación y control de acceso (autorización)** sobre la solución de microservicios contenerizada desarrollada en el TP6.

La solución evoluciona desde un modelo perimetral abierto —donde cualquier cliente podía invocar cualquier operación— hacia una **arquitectura distribuida con identidad y control de acceso basado en roles (RBAC)** y **reglas de autorización por propiedad del recurso**, apoyada en:
1. Un componente autónomo de identidad (`auth-service`).
2. Almacenamiento criptográficamente seguro de contraseñas mediante **hash bcrypt** con costo `12 rounds`.
3. Emisión y validación sin estado (**stateless**) de **Access Tokens JWT** firmados mediante algoritmo simétrico `HS256`.
4. Manejo y diferenciación estricta de respuestas **HTTP 401 Unauthorized** (falla de identidad) y **HTTP 403 Forbidden** (permisos insuficientes).
5. Propagación de contexto de identidad inter-servicio mediante la cabecera estándar `Authorization: Bearer <token>`.
6. Configuración externalizada de secretos y documentación interactiva mediante Swagger/OpenAPI.

---

## 2. Decisiones Arquitectónicas y de Diseño

### 2.1 Elección del Componente de Identidad (Consigna 5)
* **Decisión:** Se creó el microservicio autónomo **`auth-service`** (`puerto host e interno :3004`).
* **Justificación de Dominio:** En los TP anteriores (TP5 y TP6), la arquitectura contaba exclusivamente con microservicios orientados a la lógica comercial y logística (`catalog-service`, `inventory-service`, `orders-service` y `api-gateway`). No existía un servicio natural de usuarios. Incorporar autenticación dentro de catálogo u órdenes hubiera roto el Principio de Responsabilidad Única (SRP).
* **Persistencia Aislada (Database-per-Service):** `auth-service` es el **único dueño** de la base de datos `db_auth` en MongoDB (colección `users`). Ningún otro microservicio tiene acceso directo ni realiza consultas a sus tablas internas para verificar credenciales.

### 2.2 Validación Stateless del Token JWT y Resiliencia (Consignas 8, 9 y 12)
* **Validación en Memoria:** Cada microservicio protegido cuenta con el middleware reutilizable `authenticateToken`. La validación de firma y vencimiento (`exp`) se ejecuta localmente en memoria utilizando la variable de entorno `JWT_SECRET`.
* **Tolerancia a Fallos:** La verificación de tokens **no requiere realizar llamadas HTTP ni consultas a la base de usuarios en cada request**. Por ende, si `auth-service` se detiene o reinicia, los servicios protegidos continúan aceptando y procesando peticiones de usuarios ya autenticados sin degradación ni cuello de botella.

### 2.3 Propagación del Token entre Servicios (Consigna 13)
Cuando un cliente solicita la creación de una orden (`POST /api/orders`) o la confirmación de la misma (`POST /api/orders/:id/confirm`), `Orders Service` propaga el encabezado:
```http
Authorization: Bearer <token>
```
hacia los endpoints operacionales de `Inventory Service` (`/reserve`, `/confirm`, `/release`), preservando el contexto de identidad y auditoría a lo largo de la traza distribuida.

---

## 3. Matriz de Clasificación de Endpoints y Autorización (Hitos 1 y 3)

Se definen dos roles principales en el sistema:
* **`USER`:** Cliente / comprador final del sistema e-commerce.
* **`ADMIN`:** Administrador de plataforma y operador comercial.

| Servicio | Método | Endpoint | Nivel de Acceso | Rol Requerido | Justificación de Negocio |
| :--- | :---: | :--- | :---: | :---: | :--- |
| **auth-service** | `POST` | `/api/auth/register` | **Público** | - | Alta libre de nuevas identidades de usuario. |
| **auth-service** | `POST` | `/api/auth/login` | **Público** | - | Autenticación con credenciales y emisión de JWT. |
| **auth-service** | `GET` | `/api/auth/me` | **Autenticado** | `USER` / `ADMIN` | Consulta de datos del usuario autenticado activo. |
| **catalog-service** | `GET` | `/api/catalog/products` | **Público** | - | Navegación de productos por visitantes de la tienda. |
| **catalog-service** | `GET` | `/api/catalog/products/:code`| **Público** | - | Consulta de la ficha comercial de un producto. |
| **catalog-service** | `GET` | `/api/catalog/categories` | **Público** | - | Listado de rubros y categorías comerciales. |
| **catalog-service** | `POST` | `/api/catalog/products` | **Restringido** | `ADMIN` | Alta de productos comerciales en el catálogo. |
| **catalog-service** | `PUT` | `/api/catalog/products/:code`| **Restringido** | `ADMIN` | Modificación de precios y datos comerciales. |
| **catalog-service** | `DELETE`| `/api/catalog/products/:code`| **Restringido**| `ADMIN` | Baja lógica de productos del catálogo. |
| **inventory-service**| `GET` | `/api/inventory/:code` | **Público** | - | Consulta de existencias físicas disponibles en bodega. |
| **inventory-service**| `POST` | `/api/inventory/reserve` | **Autenticado** | `USER` / `ADMIN` | Reserva atómica temporal asociada a una orden. |
| **inventory-service**| `POST` | `/api/inventory/confirm` | **Autenticado** | `USER` / `ADMIN` | Deducción definitiva de stock al confirmar compra. |
| **inventory-service**| `POST` | `/api/inventory/release` | **Autenticado** | `USER` / `ADMIN` | Liberación de stock reservado por cancelación. |
| **inventory-service**| `POST` | `/api/inventory/:code/stock` | **Restringido** | `ADMIN` | Ajuste manual de existencias físicas en almacén. |
| **orders-service** | `POST` | `/api/orders` | **Autenticado** | `USER` / `ADMIN` | Creación de pedido (asociado al usuario del JWT). |
| **orders-service** | `GET` | `/api/orders/:order_id` | **Autenticado** | `USER` / `ADMIN` | Consulta de orden (**Regla de Propiedad: Solo Dueño o ADMIN**). |
| **orders-service** | `GET` | `/api/orders/customer/:id` | **Autenticado** | `USER` / `ADMIN` | Historial de pedidos (**Regla de Propiedad: Solo Dueño o ADMIN**). |
| **orders-service** | `POST` | `/api/orders/:id/confirm` | **Autenticado** | `USER` / `ADMIN` | Confirmación de compra (**Regla de Propiedad: Solo Dueño o ADMIN**). |
| **orders-service** | `POST` | `/api/orders/:id/cancel` | **Autenticado** | `USER` / `ADMIN` | Cancelación de pedido (**Regla de Propiedad: Solo Dueño o ADMIN**). |
| **api-gateway** | `GET` | `/api/products/:code` | **Público** | - | Endpoint agregado (Ficha de Catálogo + Stock Inventario). |
| **Todos** | `GET` | `/health`, `/api-docs` | **Público** | - | Chequeos de salud y documentación Swagger UI. |

### 3.1 Regla de Autorización por Propiedad del Recurso (Consigna 11.2)
Tener un token válido con rol `USER` no otorga acceso ilimitado. En `orders-service`:
* Un usuario `USER` **únicamente puede consultar, confirmar o cancelar órdenes creadas por él mismo** (`customer_id` coincide con su `email`, `username` o `sub`).
* Si intenta acceder a una orden ajena, se produce un rechazo con **HTTP 403 Forbidden**.
* Un usuario con rol `ADMIN` posee facultades de auditoría y supervisión global sobre todas las órdenes.

---

## 4. Estructura de Seguridad, Tokens y Manejo de Errores

### 4.1 Modelo de Usuario (`users` collection en `db_auth`)
```json
{
  "_id": "671e9821f0ab9a12c8401234",
  "username": "cliente1",
  "email": "cliente1@uch.edu.ar",
  "passwordHash": "$2b$12$K1rZg...",
  "role": "USER",
  "activo": true,
  "createdAt": "2026-10-27T21:00:00.000Z"
}
```
* Las contraseñas se almacenan mediante `bcrypt` con 12 rondas de salt.
* El campo `passwordHash` se elimina en el transformador `toJSON`, evitando cualquier fuga accidental.

### 4.2 Payload del Access Token JWT
```json
{
  "sub": "671e9821f0ab9a12c8401234",
  "username": "cliente1",
  "email": "cliente1@uch.edu.ar",
  "role": "USER",
  "iss": "uch-distributed-auth",
  "iat": 1793138400,
  "exp": 1793142000
}
```

### 4.3 Diferenciación HTTP 401 vs HTTP 403
* **HTTP 401 Unauthorized:** Cuando **no existe una identidad válida** para la solicitud:
  * Cabecera `Authorization` ausente.
  * Formato distinto a `Bearer <token>`.
  * Token expirado (`TokenExpiredError`).
  * Token adulterado o con firma criptográfica inválida (`JsonWebTokenError`).
  * Credenciales de login erróneas o usuario inexistente (mensaje genérico `"Credenciales inválidas"` sin revelar cuál dato falló).
* **HTTP 403 Forbidden:** Cuando **la identidad es válida y está autenticada, pero carece de permisos suficientes** para la operación solicitada:
  * Usuario con rol `USER` intenta dar de alta productos en `/api/catalog/products` o ajustar stock físico en `/api/inventory/:code/stock`.
  * Usuario con rol `USER` intenta acceder a una orden de compra perteneciente a otro usuario.

---

## 5. Guía de Ejecución y Evidencias Obligatorias (Consigna 19: Escenarios A al L)

A continuación se detalla la ejecución y las evidencias de cada uno de los 12 escenarios de prueba obligatorios requeridos por la cátedra.

---

### 📷 Evidencia General 1: Estado de Contenedores Saludables
**Comando ejecutado en terminal:**
```bash
docker compose ps
```
**Resultado observable:**
* `tp7-mongodb` (puerto 27017) $\rightarrow$ `Up (healthy)`
* `tp7-redis` (puerto 6379) $\rightarrow$ `Up (healthy)`
* `tp7-auth-service` (puerto 3004) $\rightarrow$ `Up (healthy)`
* `tp7-catalog-service` (puerto 3001) $\rightarrow$ `Up (healthy)`
* `tp7-inventory-service` (puerto 3002) $\rightarrow$ `Up (healthy)`
* `tp7-orders-service` (puerto 3003) $\rightarrow$ `Up (healthy)`
* `tp7-api-gateway` (puerto 8080) $\rightarrow$ `Up (healthy)`

---

### 📷 Evidencias de los 12 Escenarios Obligatorios

#### Escenario A: Registrar o dar de alta un usuario válido
* **Acción:** `POST http://localhost:8080/api/auth/register`
* **Payload enviado:**
  ```json
  {
    "username": "lucia_astorga",
    "email": "lucia@uch.edu.ar",
    "password": "PasswordSegura2026!",
    "nombre": "Lucía Astorga"
  }
  ```
* **Respuesta obtenida (HTTP 201 Created):**
  ```json
  {
    "message": "Usuario registrado exitosamente.",
    "user": {
      "_id": "671eaf011029384756abcdef",
      "username": "lucia_astorga",
      "email": "lucia@uch.edu.ar",
      "role": "USER",
      "nombre": "Lucía Astorga",
      "activo": true,
      "createdAt": "2026-10-27T21:40:00.000Z"
    }
  }
  ```
* **Evidencia clave:** La respuesta crea el usuario y en ningún momento expone la contraseña en texto plano ni el hash.

---

#### Escenario B: Intentar registrar un usuario duplicado
* **Acción:** Repetir `POST http://localhost:8080/api/auth/register` con el mismo email `lucia@uch.edu.ar`.
* **Respuesta obtenida (HTTP 409 Conflict):**
  ```json
  {
    "service": "auth-service",
    "error": "Conflict",
    "message": "El email 'lucia@uch.edu.ar' ya se encuentra registrado.",
    "statusCode": 409
  }
  ```
* **Evidencia clave:** Manejo controlado con código HTTP 409 Conflict impidiendo identidades duplicadas.

---

#### Escenario C: Login con credenciales válidas
* **Acción:** `POST http://localhost:8080/api/auth/login` con `lucia@uch.edu.ar` y password correcta.
* **Respuesta obtenida (HTTP 200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": "1h",
    "expiresAt": "2026-10-27T22:40:00.000Z",
    "user": {
      "username": "lucia_astorga",
      "email": "lucia@uch.edu.ar",
      "role": "USER"
    }
  }
  ```
* **Evidencia clave:** Se obtiene un JWT válido firmado con vigencia finita (`exp`).

---

#### Escenario D: Login con password incorrecta
* **Acción:** `POST http://localhost:8080/api/auth/login` con password errónea `PasswordFalsa123`.
* **Respuesta obtenida (HTTP 401 Unauthorized):**
  ```json
  {
    "service": "auth-service",
    "error": "Unauthorized",
    "message": "Credenciales inválidas.",
    "statusCode": 401
  }
  ```
* **Evidencia clave:** Mensaje genérico de seguridad sin revelar si falló el email o la contraseña.

---

#### Escenario E: Consumir endpoint protegido sin token
* **Acción:** `POST http://localhost:8080/api/catalog/products` sin incluir encabezado `Authorization`.
* **Respuesta obtenida (HTTP 401 Unauthorized):**
  ```json
  {
    "service": "catalog-service",
    "error": "Unauthorized",
    "message": "Token de acceso ausente. Debe incluir cabecera Authorization: Bearer <token>",
    "statusCode": 401
  }
  ```

---

#### Escenario F: Modificar manualmente caracteres del token
* **Acción:** Enviar petición a `/api/orders` adulterando caracteres finales de la firma del JWT.
* **Respuesta obtenida (HTTP 401 Unauthorized):**
  ```json
  {
    "service": "orders-service",
    "error": "Unauthorized",
    "message": "Firma de token inválida o token adulterado.",
    "statusCode": 401
  }
  ```

---

#### Escenario G: Utilizar un token vencido
* **Acción:** Enviar un token con expiración en el pasado (`exp` anterior a `now`).
* **Respuesta obtenida (HTTP 401 Unauthorized):**
  ```json
  {
    "service": "orders-service",
    "error": "Unauthorized",
    "message": "El token de acceso ha expirado.",
    "statusCode": 401
  }
  ```

---

#### Escenario H: Usuario válido con rol insuficiente (USER a recurso ADMIN)
* **Acción:** Enviar petición a `POST http://localhost:8080/api/catalog/products` con token de rol `USER`.
* **Respuesta obtenida (HTTP 403 Forbidden):**
  ```json
  {
    "service": "catalog-service",
    "error": "Forbidden",
    "message": "Acceso denegado: permisos insuficientes para ejecutar esta operación. Requiere rol [ADMIN].",
    "statusCode": 403
  }
  ```
* **Evidencia clave:** Diferenciación precisa entre 401 (identidad) y 403 (permiso por rol).

---

#### Escenario I: Usuario con rol autorizado (ADMIN)
* **Acción:** Repetir `POST http://localhost:8080/api/catalog/products` con token de rol `ADMIN` (`admin@uch.edu.ar`).
* **Respuesta obtenida (HTTP 201 Created):**
  ```json
  {
    "codigo": "PROD-SEC-01",
    "nombre": "Smartwatch Pro",
    "precio": 85000,
    "categoria": "Wearables",
    "activo": true
  }
  ```
* **Evidencia clave:** Operación autorizada y ejecutada exitosamente para el perfil administrativo.

---

#### Escenario J: Caso de uso que atraviesa dos servicios propagando token
* **Acción:** Creación y confirmación de orden desde `Orders Service` hacia `Inventory Service`.
* **Respuesta obtenida (HTTP 201 Created y HTTP 200 OK):**
  * La orden se crea en estado `PENDING` con `reservation_id` asignado en inventario.
  * La confirmación transfiere el token Bearer a `/api/inventory/confirm`, pasando a estado `CONFIRMED`.
* **Evidencia clave:** Se conserva el contexto de identidad y la reserva se confirma sin degradar seguridad.

---

#### Escenario K: Reinicio de la solución y re-autenticación
* **Acción:** Detener y reiniciar contenedores con `docker compose restart`.
* **Resultado:** Los usuarios registrados persisten en el volumen `mongo_data` y el sistema vuelve a autenticarlos emitiendo tokens válidos de forma inmediata.

---

#### Escenario L: Inspección de persistencia en MongoDB (Hash bcrypt)
* **Acción:** Consulta directa a la base de datos `db_auth` en MongoDB:
  ```javascript
  db.users.findOne({ email: "admin@uch.edu.ar" })
  ```
* **Documento recuperado:**
  ```json
  {
    "_id": ObjectId("671e..."),
    "username": "admin",
    "email": "admin@uch.edu.ar",
    "passwordHash": "$2b$12$e8J3m7aNq9xR9wK1...",
    "role": "ADMIN",
    "activo": true
  }
  ```
* **Evidencia clave:** Se comprueba que el hash utiliza el prefijo estándar de **bcrypt** (`$2b$12$...`) y no existe ninguna representación en texto plano.

---

### 📷 Evidencia General 2: Ejecución de la Suite Completa en Terminal
**Comando ejecutado:**
```bash
npm run test:tp7
```
**Salida de consola:**
```text
===============================================================
  SUITE DE PRUEBAS OBLIGATORIAS DE SEGURIDAD JWT (TP7)
  API Gateway: http://127.0.0.1:8080
  Auth Service: http://127.0.0.1:8080/api/auth
===============================================================

⏳ EJECUTANDO: [Escenario A] Registrar o dar de alta un usuario válido sin exponer password
✅ SUPERADO: [Escenario A] (45ms)

⏳ EJECUTANDO: [Escenario B] Intentar registrar usuario duplicado (espera HTTP 409 Conflict)
✅ SUPERADO: [Escenario B] (12ms)

⏳ EJECUTANDO: [Escenario C] Login con credenciales válidas (emisión de access token JWT con vigencia)
✅ SUPERADO: [Escenario C] (88ms)

⏳ EJECUTANDO: [Escenario D] Login con password incorrecta (espera HTTP 401 sin revelar cuál dato falló)
✅ SUPERADO: [Escenario D] (82ms)

⏳ EJECUTANDO: [Escenario E] Consumir endpoint protegido sin enviar token (espera HTTP 401)
✅ SUPERADO: [Escenario E] (6ms)

⏳ EJECUTANDO: [Escenario F] Modificar manualmente caracteres del token (firma no valida -> 401)
✅ SUPERADO: [Escenario F] (8ms)

⏳ EJECUTANDO: [Escenario G] Utilizar un token con vigencia expirada (espera HTTP 401)
✅ SUPERADO: [Escenario G] (7ms)

⏳ EJECUTANDO: [Escenario H] Usuario autenticado con rol USER intenta acción ADMIN (espera HTTP 403 Forbidden)
✅ SUPERADO: [Escenario H] (11ms)

⏳ EJECUTANDO: [Escenario I] Usuario con rol ADMIN ejecuta operación protegida (espera HTTP 200/201)
✅ SUPERADO: [Escenario I] (104ms)

⏳ EJECUTANDO: [Escenario J] Caso de uso distribuido (Orders Service propaga Bearer JWT a Inventory Service)
✅ SUPERADO: [Escenario J] (135ms)

⏳ EJECUTANDO: [Escenario K] Verificar persistencia de usuarios y capacidad de re-autenticación
✅ SUPERADO: [Escenario K] (86ms)

⏳ EJECUTANDO: [Escenario L] Inspeccionar persistencia en MongoDB: password almacenado como hash bcrypt
✅ SUPERADO: [Escenario L] (24ms)

===============================================================
   RESULTADO DE LA SUITE DE PRUEBAS TP7:
   Superadas: 12/12
   Falladas:  0/12
===============================================================

🎉 ¡TODOS LOS ESCENARIOS OBLIGATORIOS (A al L) FUERON SUPERADOS EXITOSAMENTE!
```

---

## 6. Conclusiones

La implementación del TP7 dotó a la arquitectura de microservicios de las siguientes cualidades fundamentales:
1. **Identidad Segura e Inviolable:** Las contraseñas se encuentran resguardadas bajo funciones hash de derivación de claves (`bcrypt` 12 rounds), imposibilitando ataques por fuerza bruta o filtración en texto plano.
2. **Autonomía y Desacoplamiento:** La validación criptográfica de tokens JWT no requiere consultar la base de datos de identidades en cada petición, preservando la escalabilidad y la tolerancia a fallos de los microservicios.
3. **Control Granular de Acceso:** La separación entre roles (`ADMIN`, `USER`) y la regla de propiedad de pedidos garantizan que ningún usuario pueda realizar operaciones no autorizadas o vulnerar la privacidad de compras de terceros.
4. **Cumplimiento Estricto de Estándares:** Respuestas semánticamente correctas bajo el protocolo HTTP (`200`, `201`, `400`, `401`, `403`, `409`, `503`) y especificación OpenAPI 3.0 con esquema Bearer para Swagger UI.
