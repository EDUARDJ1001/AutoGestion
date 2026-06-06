# AutoGestion

Sistema web local para la gestion administrativa de un taller automotriz.

## Estado actual

- Backend Node.js + Express.
- PostgreSQL con `pg`.
- Autenticacion JWT.
- Gestion inicial de usuarios y roles.
- Estructura modular para clientes, vehiculos, visitas, servicios, inventario, dashboard y panel mecanico.

## Backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm run dev
```

Configura `backend/.env` con las credenciales locales de PostgreSQL antes de iniciar la API.

La API expone una ruta de salud:

```text
GET http://localhost:4000/api/health
```

Documentacion Swagger:

```text
GET http://localhost:4000/api/docs
GET http://localhost:4000/api/docs.json
```

## Migraciones

Las migraciones SQL estan en `backend/db/migrations`.

Para esta etapa se agrego una migracion minima para que los servicios asignados a una visita puedan guardar precio negociado por caso:

```text
backend/db/migrations/001_visita_servicios_precios_dinamicos.sql
```
