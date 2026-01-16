# Verificación: Usar Base de Datos en lugar de Archivo

Si el sistema sigue leyendo desde `datos.txt` en lugar de la base de datos, sigue estos pasos:

## 1. Verificar que el servidor backend esté corriendo

Abre una terminal y ejecuta:

```bash
cd server
npm start
```

O en modo desarrollo:

```bash
cd server
npm run dev
```

Deberías ver:
```
🚀 Servidor iniciado en puerto 5000
📡 API disponible en http://localhost:5000/api
✅ Conexión a PostgreSQL exitosa
```

## 2. Verificar que PostgreSQL esté corriendo

Asegúrate de que PostgreSQL esté ejecutándose y que la base de datos exista:

```bash
# En Windows (PowerShell)
psql -U postgres -d libro_partos -c "SELECT COUNT(*) FROM partos;"
```

O verifica desde pgAdmin o tu cliente de PostgreSQL.

## 3. Verificar que los datos estén en la base de datos

Si no hay datos, importa los datos:

```bash
cd server
npm run import-data
```

## 4. Verificar la configuración del frontend

Asegúrate de que el archivo `.env` en la raíz tenga:

```env
VITE_API_URL=http://localhost:5000/api
```

Luego reinicia el servidor de desarrollo del frontend:

```bash
# Detén el servidor (Ctrl+C) y reinícialo
npm run dev
```

## 5. Verificar en la consola del navegador

Abre las herramientas de desarrollador (F12) y ve a la pestaña "Console". Deberías ver:

- ✅ `🔄 Intentando cargar datos desde la API...`
- ✅ `📡 URL de API configurada: http://localhost:5000/api`
- ✅ `✅ Datos cargados desde API: X registros`

Si ves:
- ⚠️ `⚠️ API no disponible, intentando cargar desde archivo...`
- ⚠️ `⚠️ Datos cargados desde archivo (fallback): X registros`

Significa que el servidor backend no está disponible.

## 6. Verificar que el puerto 5000 esté libre

```bash
# En Windows PowerShell
netstat -ano | findstr :5000
```

Si hay algo escuchando en el puerto 5000, debería ser tu servidor Node.js.

## 7. Probar la API directamente

Abre tu navegador y visita:

- http://localhost:5000/health - Debería mostrar `{"status":"ok","database":"connected"}`
- http://localhost:5000/api/partos/count - Debería mostrar el número de partos

Si estos endpoints no funcionan, el servidor no está corriendo correctamente.

## Solución Rápida

1. **Terminal 1 - Backend:**
   ```bash
   cd server
   npm start
   ```

2. **Terminal 2 - Frontend:**
   ```bash
   npm run dev
   ```

3. **Abre el navegador en:** http://localhost:5173

4. **Revisa la consola del navegador (F12)** para ver de dónde se están cargando los datos.

## Desactivar el Fallback (Opcional)

Si quieres forzar que solo use la API y muestre error si no está disponible, puedes comentar el código del fallback en `src/App.jsx` (líneas 36-50 aproximadamente).

