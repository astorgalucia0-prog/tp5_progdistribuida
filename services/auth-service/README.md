# Auth Service — Servicio de Identidad y Autenticación JWT

**Licenciatura en Sistemas de Información — Programación Distribuida**  
**Universidad Champagnat — TP7: Autenticación, Autorización y Seguridad con JWT**

---

## 1. Responsabilidad y Límites de Dominio
El **Auth Service** es el microservicio autónomo responsable exclusivo de la identidad en la arquitectura distribuida:
* **Alta y Registro de Usuarios (`POST /api/auth/register`)**: Validación de duplicados, hashing seguro de contraseñas.
* **Autenticación de Credenciales (`POST /api/auth/login`)**: Comparación de contraseñas contra hash y emisión de Access Tokens JWT.
* **Inspección de Identidad (`GET /api/auth/me`)**: Recuperación de la identidad activa mediante validación del Bearer Token.
* **Database-per-Service**: Es el único microservicio con acceso a la base de datos `db_auth` en MongoDB. Ningún otro servicio conoce ni accede a las credenciales o contraseñas.

---

## 2. Configuración y Variables de Entorno

| Variable | Valor por Defecto | Descripción |
| :--- | :--- | :--- |
| `PORT` | `3004` | Puerto HTTP donde escucha el servicio. |
| `API_PREFIX` | `/api/auth` | Prefijo de rutas del servicio. |
| `MONGODB_URI` | `mongodb://mongodb:27017/db_auth` | URI de la base de datos exclusiva del servicio. |
| `JWT_SECRET` | *(Externalizada)* | Clave simétrica para la firma y verificación de tokens (HS256). |
| `JWT_EXPIRES_IN` | `1h` | Vigencia temporal de los tokens emitidos (ej: 15m, 1h, 24h). |
| `JWT_ISSUER` | `uch-distributed-auth` | Emisor registrado en el claim `iss` del token. |
| `BCRYPT_ROUNDS` | `12` | Costo computacional de hashing mediante bcrypt. |

---

## 3. Endpoints Principales

| Método | Endpoint | Acceso | Descripción |
| :---: | :--- | :---: | :--- |
| `GET` | `/health` | Público | Verificación de salud y conectividad con MongoDB. |
| `POST` | `/api/auth/register` | Público | Registro de nuevo usuario (devuelve usuario sin password ni hash). |
| `POST` | `/api/auth/login` | Público | Autenticación con email/username y password; retorna JWT. |
| `GET` | `/api/auth/me` | Autenticado | Retorna información del usuario decodificada desde el Bearer Token. |
| `GET` | `/api-docs` | Público | Interfaz interactiva Swagger UI. |

---

## 4. Usuarios Sembrados por Defecto (Entorno de Pruebas)

* **Administrador**: `admin@uch.edu.ar` / `AdminPassword123!` (Rol: `ADMIN`)
* **Cliente 1**: `cliente1@uch.edu.ar` / `UserPassword123!` (Rol: `USER`)
* **Cliente 2**: `cliente2@uch.edu.ar` / `UserPassword123!` (Rol: `USER`)
* **Inactivo**: `inactivo@uch.edu.ar` / `UserPassword123!` (Rol: `USER`, `activo: false`)
