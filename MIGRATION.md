# Guía de Migración a PostgreSQL

Esta guía te ayudará a migrar la aplicación del sistema de archivos plano (`datos.txt`) a PostgreSQL.

## Requisitos Previos

1. **PostgreSQL instalado** (versión 12 o superior)
2. **Node.js** (versión 18 o superior)
3. **npm** o **yarn**

## Paso 1: Configurar PostgreSQL

1. Crea una base de datos:
```sql
CREATE DATABASE libro_partos;
```

2. Opcionalmente, crea un usuario específico:
```sql
CREATE USER libro_partos_user WITH PASSWORD 'tu_password_segura';
GRANT ALL PRIVILEGES ON DATABASE libro_partos TO libro_partos_user;
```

## Paso 2: Configurar Variables de Entorno

1. Copia el archivo `.env.example` a `.env`:
```bash
cp .env.example .env
```

2. Edita `.env` con tus credenciales de PostgreSQL:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=libro_partos
DB_USER=postgres
DB_PASSWORD=tu_password_aqui
PORT=5000
CORS_ORIGIN=http://localhost:5173
```

## Paso 3: Instalar Dependencias del Backend

```bash
cd server
npm install
```

## Paso 4: Ejecutar Migraciones

Ejecuta el script de migración para crear las tablas:

```bash
cd server
npm run migrate
```

Esto creará las tablas `partos` y `partos_relaciones` con todos los índices necesarios.

## Paso 5: Importar Datos

Importa los datos desde `datos.txt` a PostgreSQL:

```bash
cd server
npm run import-data
```

**Nota:** Por defecto, el script NO borra datos existentes. Si quieres limpiar la tabla antes de importar, establece la variable de entorno:

```bash
CLEAR_TABLE=true npm run import-data
```

⚠️ **ADVERTENCIA:** `CLEAR_TABLE=true` borrará TODOS los datos existentes en la tabla.

## Paso 6: Iniciar el Servidor Backend

```bash
cd server
npm start
```

O en modo desarrollo con auto-reload:

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:5000`

## Paso 7: Configurar el Frontend

1. Asegúrate de que el archivo `.env` en la raíz del proyecto tenga:
```env
VITE_API_URL=http://localhost:5000/api
```

2. Instala las dependencias del frontend (si no lo has hecho):
```bash
npm install
```

3. Inicia el frontend:
```bash
npm run dev
```

## Verificación

1. **Verificar conexión a la BD:**
   - Visita `http://localhost:5000/health`
   - Deberías ver: `{"status":"ok","database":"connected","timestamp":"..."}`

2. **Verificar datos importados:**
   - Visita `http://localhost:5000/api/partos/count`
   - Deberías ver el número total de partos importados

3. **Verificar frontend:**
   - Abre `http://localhost:5173`
   - El dashboard debería cargar los datos desde la API

## Solución de Problemas

### Error: "No se pudo conectar con PostgreSQL"

- Verifica que PostgreSQL esté ejecutándose
- Verifica las credenciales en `.env`
- Verifica que la base de datos exista

### Error: "relation 'partos' does not exist"

- Ejecuta las migraciones: `npm run migrate`

### Error: "duplicate key value violates unique constraint"

- El registro ya existe en la base de datos
- Usa `CLEAR_TABLE=true` si quieres empezar desde cero

### El frontend muestra "API no disponible"

- Verifica que el servidor backend esté ejecutándose
- Verifica que `VITE_API_URL` esté configurado correctamente
- Verifica CORS en el servidor backend

### Los datos no se muestran correctamente

- Verifica que los datos se hayan importado correctamente
- Revisa la consola del navegador para errores
- Verifica que las funciones de transformación estén funcionando

## Estructura de la Base de Datos

### Tabla `partos`

Contiene todos los registros de partos con los siguientes campos principales:
- `id` (UUID): Identificador único
- `trace_id` (VARCHAR): ID de trazabilidad
- `fecha_parto`, `hora_parto`, `mes_parto`
- `tipo_parto`, `paridad`, `edad`
- `peso`, `talla`, `apgar1`, `apgar5`
- Y muchos más campos según el schema completo

### Tabla `partos_relaciones`

Almacena relaciones entre partos:
- `parto_id`: ID del parto
- `relacionado_con_id`: ID del parto relacionado
- `tipo_relacion`: Tipo de relación (misma_madre, mismo_consultorio, mismo_mes)

## Próximos Pasos

Una vez migrado a PostgreSQL, puedes:

1. **Agregar autenticación** para proteger los endpoints
2. **Implementar paginación** para grandes volúmenes de datos
3. **Agregar búsqueda avanzada** con filtros complejos
4. **Implementar caché** para mejorar rendimiento
5. **Agregar logs** y monitoreo
6. **Implementar backups** automáticos

## Comandos Útiles

```bash
# Ver todos los partos en PostgreSQL
psql -d libro_partos -c "SELECT COUNT(*) FROM partos;"

# Ver estructura de la tabla
psql -d libro_partos -c "\d partos"

# Limpiar todos los datos
psql -d libro_partos -c "TRUNCATE TABLE partos_relaciones CASCADE; TRUNCATE TABLE partos CASCADE;"

# Exportar datos a CSV
psql -d libro_partos -c "COPY partos TO '/tmp/partos.csv' CSV HEADER;"
```

