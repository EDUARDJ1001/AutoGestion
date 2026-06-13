# Guía de instalación — AutoGestion (taller)

Despliegue en la PC del taller. La app corre como **un solo proceso**: el backend
(Node + Express) sirve a la vez el **API** y la **web app compilada** en el puerto **4000**.
El usuario solo abre el navegador en `http://localhost:4000` (o `http://IP-DEL-EQUIPO:4000`
desde otra PC de la red).

> En esta guía se asume que el proyecto quedará en `C:\AutoGestion`. Ajusta las rutas si usas otra.

---

## 1. Requisitos a instalar en la PC

| Software | Versión | Notas |
|---|---|---|
| **Node.js** | LTS 18 o 20+ | https://nodejs.org — instalar la versión "LTS". |
| **PostgreSQL** | 14+ | https://www.postgresql.org/download/windows/ — anota la contraseña del usuario `postgres`. Se instala como servicio de Windows que **arranca solo**. |
| **NSSM** | última | https://nssm.cc — para correr el backend como servicio que inicia con la PC. |

Verifica que Node quedó instalado:

```powershell
node -v
npm -v
```

---

## 2. Copiar el proyecto

Copia la carpeta del proyecto a `C:\AutoGestion`, **sin** estas carpetas (se regeneran):

- `backend/node_modules`
- `frontend/node_modules`
- `frontend/dist`

Y asegúrate de **incluir manualmente** lo que no viaja en el repositorio:

- `backend/.env` (lo creamos en el paso 4)
- `frontend/.env` (solo necesario para desarrollo; en producción no hace falta)
- Las imágenes ya cargadas (paso 5)

---

## 3. Base de datos

> ⚠️ El repositorio **no contiene un script del esquema base** de la base de datos
> (solo migraciones incrementales). Por eso la BD se traslada con un **volcado completo
> (dump) generado desde pgAdmin** en el equipo actual, que incluye estructura, usuarios y datos.

La base se traslada con un dump hecho en **pgAdmin** y se restaura también desde pgAdmin.

### 3.1 En el equipo ACTUAL (origen) — generar el dump

En **pgAdmin**:

1. Expande `Servers → PostgreSQL → Databases`.
2. Clic derecho sobre la base **`taller_sis` → Backup...**
3. En **Filename** elige dónde guardar (ej. `taller_sis.dump`).
4. En **Format** deja **Custom** (recomendado) y pulsa **Backup**.
5. Copia el archivo generado a la PC del taller (USB / red).

### 3.2 En la PC del taller (destino) — restaurar

En **pgAdmin** del equipo del taller:

1. Clic derecho sobre `Databases → Create → Database...`, nómbrala **`taller_sis`** y guarda.
2. Clic derecho sobre la base **`taller_sis` → Restore...**
3. En **Filename** selecciona el archivo del dump que copiaste.
4. Pulsa **Restore**.

> El dump ya trae las tablas, los usuarios (incluido el administrador) y los datos existentes.
> El nombre de la base en destino debe ser **`taller_sis`** (coincide con `DB_NAME` del `.env`);
> si usas otro nombre, ajústalo en `backend/.env`.

---

## 4. Configurar `backend/.env`

Crea el archivo `C:\AutoGestion\backend\.env` con los valores de **esta** PC:

```dotenv
PORT=4000
HOST=0.0.0.0
DB_HOST=localhost
DB_PORT=5432
DB_NAME=taller_sis
DB_USER=postgres
DB_PASSWORD=LA_CONTRASEÑA_DE_POSTGRES_DE_ESTA_PC
JWT_SECRET=PON_UNA_CLAVE_LARGA_Y_UNICA_AQUI
JWT_EXPIRES_IN=8h
UPLOAD_DIR=C:\AutoGestionDatos\uploads
CORS_ORIGIN=*
```

Puntos importantes:

- **`DB_PASSWORD`**: la contraseña de PostgreSQL de la PC del taller (la del paso 1).
- **`JWT_SECRET`**: cámbiala por una clave larga y única (no reuses la de desarrollo). Si la cambias, las sesiones abiertas se invalidan (hay que volver a iniciar sesión).
- **`UPLOAD_DIR`**: ruta donde se guardarán las imágenes. Se recomienda una carpeta **fuera del proyecto** (ej. `C:\AutoGestionDatos\uploads`) para que sobreviva a actualizaciones y sea fácil de respaldar. La carpeta se crea sola si no existe.

> El **frontend** en producción no necesita `.env`: ya está configurado para llamar al API
> por ruta relativa `/api` (mismo origen), así funciona desde cualquier IP sin recompilar.

---

## 5. Copiar las imágenes existentes

Si en el equipo actual ya hay fotos cargadas, copia su contenido a la carpeta definida en `UPLOAD_DIR`:

- Origen: `...\backend\uploads\vehiculos\*` y `...\backend\uploads\visitas\*`
- Destino: `C:\AutoGestionDatos\uploads\vehiculos\*` y `C:\AutoGestionDatos\uploads\visitas\*`

(La base de datos guarda solo la ruta de cada imagen; los archivos físicos van por separado.)

---

## 6. Instalar dependencias y compilar

Desde la raíz del proyecto, un solo comando hace todo el montaje:

```powershell
cd C:\AutoGestion
npm run setup
```

`npm run setup` ejecuta:
1. `install:all` — instala dependencias de backend y frontend.
2. `build` — compila el frontend a `frontend/dist`.
3. `migrate` — aplica las migraciones (idempotente; seguro aunque la BD ya esté al día tras el restore).

---

## 7. Prueba manual

```powershell
cd C:\AutoGestion
npm run start:prod
```

Abre en el navegador:

```text
http://localhost:4000
```

Inicia sesión con el usuario administrador (las credenciales vienen en el volcado de la BD;
si necesitas otro usuario, créalo desde **Admin → Usuarios** dentro de la app).

Detén la prueba con `Ctrl + C` antes de pasar al servicio.

---

## 8. Dejarlo como servicio que arranca con la PC (NSSM)

Para que el backend (y por tanto la web app) inicie solo al encender la PC, en segundo plano:

```powershell
# 1. Averigua el nombre exacto del servicio de PostgreSQL
Get-Service *postgres*   # ej: postgresql-x64-16

# 2. Crea la carpeta de logs
New-Item -ItemType Directory -Force "C:\AutoGestion\logs"

# 3. Registra el servicio apuntando a node.exe + server.js
nssm install AutoGestion "C:\Program Files\nodejs\node.exe" "C:\AutoGestion\backend\src\server.js"
nssm set AutoGestion AppDirectory "C:\AutoGestion\backend"
nssm set AutoGestion DisplayName "AutoGestion Taller"
nssm set AutoGestion Description "API + web app del taller automotriz"
nssm set AutoGestion Start SERVICE_AUTO_START

# 4. Que dependa de PostgreSQL (usa el nombre del paso 1)
nssm set AutoGestion DependOnService postgresql-x64-16

# 5. Logs
nssm set AutoGestion AppStdout "C:\AutoGestion\logs\out.log"
nssm set AutoGestion AppStderr "C:\AutoGestion\logs\err.log"

# 6. Arrancar
nssm start AutoGestion
```

Comandos útiles del servicio:

```powershell
nssm restart AutoGestion
nssm stop AutoGestion
nssm status AutoGestion
nssm edit AutoGestion      # editor gráfico
nssm remove AutoGestion confirm   # eliminar el servicio
```

> Se apunta directo a `node.exe` (no a `npm`) porque `npm` es un `.cmd` y da problemas como servicio.
> El servicio **solo arranca el backend**, que ya sirve el frontend compilado. No recompila en cada
> arranque (eso lo hiciste en el paso 6).

---

## 9. Firewall (solo si otras PCs/tablets de la red usan la app)

```powershell
New-NetFirewallRule -DisplayName "AutoGestion 4000" -Direction Inbound -Protocol TCP -LocalPort 4000 -Action Allow -Profile Private
```

Averigua la IP del equipo servidor con `ipconfig` (IPv4, ej. `192.168.1.50`). Las demás PCs abren:

```text
http://192.168.1.50:4000
```

---

## 10. Acceso directo para el usuario

Crea un acceso directo en el escritorio que abra el navegador en la app, p. ej.:

```text
"C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:4000
```

(`--app=` abre en modo ventana sin barra de direcciones, como una aplicación de escritorio.)

---

## 11. Actualizar a una versión nueva (a futuro)

```powershell
nssm stop AutoGestion
# reemplazar los archivos del proyecto (conservando backend/.env y la carpeta UPLOAD_DIR)
cd C:\AutoGestion
npm run install:all   # solo si cambiaron dependencias
npm run build         # recompilar frontend
npm run migrate       # aplicar migraciones nuevas
nssm start AutoGestion
```

---

## 12. Respaldos (importante)

Respalda **dos cosas juntas**, de forma periódica:

1. **Base de datos**: en pgAdmin, clic derecho sobre `taller_sis → Backup...` (igual que en el paso 3.1), guardando el archivo con la fecha en el nombre.
2. **Carpeta de imágenes** (la de `UPLOAD_DIR`):

```powershell
Copy-Item -Recurse "C:\AutoGestionDatos\uploads" "D:\Respaldos\uploads_AAAA-MM-DD"
```

La BD guarda las rutas; la carpeta guarda los archivos. Sin las dos, las fotos no se ven.

---

## 13. Solución de problemas

| Síntoma | Causa probable / solución |
|---|---|
| El servicio no arranca | Revisa `C:\AutoGestion\logs\err.log`. Suele ser `.env` mal configurado o Postgres no listo. |
| `ECONNREFUSED` a la BD | PostgreSQL no está corriendo o `DB_*` del `.env` no coinciden. Verifica `Get-Service *postgres*`. |
| La página abre pero no carga datos | El backend no levantó, o el `JWT_SECRET` cambió (vuelve a iniciar sesión). |
| Las imágenes no se ven | `UPLOAD_DIR` apunta a otra carpeta, o no copiaste los archivos del paso 5. |
| No entra desde otra PC | Falta la regla de firewall (paso 9) o usaste `localhost` en vez de la IP del servidor. |
| `pg_dump`/`pg_restore` no encontrado | Usa la ruta completa según tu versión: `C:\Program Files\PostgreSQL\<versión>\bin\`. |
```
