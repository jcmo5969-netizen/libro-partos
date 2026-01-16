# Guía de Instalación - Libro de Partos

Esta guía te ayudará a instalar y configurar el sistema Libro de Partos en un nuevo computador.

## Requisitos Previos

1. **Node.js** (versión 18 o superior)
   - Descargar desde: https://nodejs.org/
   - Verificar instalación: `node --version`

2. **PostgreSQL** (versión 12 o superior)
   - Descargar desde: https://www.postgresql.org/download/
   - Asegúrate de agregar PostgreSQL al PATH del sistema durante la instalación
   - Verificar instalación: `psql --version`

3. **pgAdmin** (opcional, pero recomendado)
   - Descargar desde: https://www.pgadmin.org/download/

## Instalación Automática

### Opción 1: Instalación Completa (Recomendada)

1. Ejecuta el archivo `install.bat`
   - Este script instalará todas las dependencias
   - Configurará la base de datos
   - Creará las tablas necesarias

2. Sigue las instrucciones en pantalla:
   - Ingresa los datos de conexión a PostgreSQL
   - Confirma la creación de la base de datos

3. Al finalizar, se creará el usuario administrador

### Opción 2: Instalación Paso a Paso

#### Paso 1: Instalar Dependencias
```batch
install-dependencies.bat
```

#### Paso 2: Configurar Base de Datos
```batch
setup-database.bat
```

Este script te pedirá:
- Host de PostgreSQL (por defecto: localhost)
- Puerto (por defecto: 5432)
- Usuario (por defecto: postgres)
- Contraseña de PostgreSQL
- Nombre de la base de datos (por defecto: libro_partos)

#### Paso 3: Crear Usuario Administrador
```batch
cd server
npm run create-admin
```

Te pedirá:
- Nombre de usuario
- Contraseña
- Nombre completo

## Configuración Manual (Alternativa)

Si prefieres configurar manualmente:

### 1. Crear Base de Datos en pgAdmin

1. Abre pgAdmin
2. Conéctate a tu servidor PostgreSQL
3. Clic derecho en "Databases" → "Create" → "Database"
4. Nombre: `libro_partos`
5. Clic en "Save"

### 2. Ejecutar Scripts SQL

En pgAdmin, abre la Query Tool y ejecuta en orden:

1. `migrations/schema.sql` - Crea todas las tablas principales
2. `migrations/add_correlativo_creado_por.sql` - Agrega campos de control
3. `migrations/users.sql` - Crea tabla de usuarios

### 3. Crear Archivo .env

Crea el archivo `server/.env` con el siguiente contenido:

```env
# Configuración de Base de Datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=libro_partos
DB_USER=postgres
DB_PASSWORD=tu_contraseña_aqui

# Puerto del servidor backend
PORT=5000

# Orígenes permitidos para CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Limpiar tabla antes de importar datos
CLEAR_TABLE=false
```

## Iniciar el Sistema

### Opción Automática
```batch
iniciar-servidores.bat
```

### Opción Manual

**Terminal 1 - Backend:**
```batch
cd server
npm start
```

**Terminal 2 - Frontend:**
```batch
npm run dev
```

## Acceso al Sistema

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000/api

## Solución de Problemas

### Error: "psql no se reconoce como comando"
- PostgreSQL no está en el PATH
- Agrega la ruta de PostgreSQL al PATH del sistema
- O ejecuta los scripts SQL manualmente desde pgAdmin

### Error: "No se puede conectar a PostgreSQL"
- Verifica que el servicio de PostgreSQL esté corriendo
- Verifica las credenciales en `server/.env`
- Verifica que el puerto 5432 esté abierto

### Error: "Base de datos ya existe"
- El script te preguntará si deseas eliminarla y recrearla
- O puedes usar un nombre diferente para la base de datos

### Error: "Puerto 5000 o 5173 en uso"
- Detén otros procesos que usen esos puertos
- O cambia los puertos en la configuración

## Estructura de Archivos

```
libro-de-partos/
├── install.bat                 # Instalación completa
├── install-dependencies.bat    # Solo instala dependencias
├── setup-database.bat          # Solo configura la BD
├── iniciar-servidores.bat      # Inicia backend y frontend
├── migrations/                 # Scripts SQL de migración
│   ├── schema.sql
│   ├── add_correlativo_creado_por.sql
│   └── users.sql
├── server/                     # Backend Node.js
│   ├── .env                    # Configuración (se crea automáticamente)
│   └── ...
└── src/                        # Frontend React
    └── ...
```

## Soporte

Si encuentras problemas durante la instalación:
1. Verifica que todos los requisitos estén instalados
2. Revisa los mensajes de error en las ventanas de comandos
3. Consulta los logs de PostgreSQL en pgAdmin
