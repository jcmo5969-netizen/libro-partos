# Dashboard - Libro de Partos

Dashboard interactivo para visualización y análisis de datos del libro de partos del Hospital Quilpué.

## Características

- 📊 **Tabla de Datos**: Visualización completa de todos los registros con búsqueda por RUT
- 🤖 **Análisis de IA**: Estadísticas y análisis inteligente de los datos usando Google Gemini
- 🔔 **Sistema de Alertas**: Notificaciones automáticas para casos que requieren atención
- 🎨 **Diseño Moderno**: Interfaz con colores rosa pastel y animaciones fluidas
- 📱 **Responsive**: Diseño adaptable a diferentes tamaños de pantalla
- 🗄️ **Base de Datos PostgreSQL**: Persistencia de datos con relaciones y trazabilidad

## Arquitectura

La aplicación está dividida en dos partes:

- **Frontend**: React + Vite (puerto 5173)
- **Backend**: Express + PostgreSQL (puerto 5000)

## Instalación Rápida

### Opción 1: Solo Frontend (modo desarrollo con archivo)

Si solo quieres probar el frontend sin base de datos:

```bash
npm install
npm run dev
```

Los datos se cargarán desde `public/datos.txt`.

### Opción 2: Frontend + Backend con PostgreSQL (recomendado)

Para usar la aplicación completa con base de datos:

1. **Configurar PostgreSQL:**
   ```sql
   CREATE DATABASE libro_partos;
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   # Edita .env con tus credenciales de PostgreSQL
   ```

3. **Instalar dependencias del backend:**
   ```bash
   cd server
   npm install
   ```

4. **Ejecutar migraciones:**
   ```bash
   npm run migrate
   ```

5. **Importar datos:**
   ```bash
   npm run import-data
   ```

6. **Iniciar servidor backend:**
   ```bash
   npm start
   # O en modo desarrollo:
   npm run dev
   ```

7. **En otra terminal, instalar dependencias del frontend:**
   ```bash
   npm install
   ```

8. **Iniciar frontend:**
   ```bash
   npm run dev
   ```

9. **Abrir en el navegador:**
   ```
   http://localhost:5173
   ```

📖 **Para más detalles, consulta [MIGRATION.md](./MIGRATION.md)**

## 🌐 Acceso desde Múltiples Computadoras (Red Local)

Si quieres usar la aplicación desde varias computadoras en tu red local:

1. **En la computadora servidor (Windows):**
   - Ejecutar como Administrador: `configurar-firewall.ps1`
   - O configurar manualmente el firewall (ver [CONFIGURACION_RED.md](./CONFIGURACION_RED.md))

2. **En otras computadoras:**
   - Crear archivo `.env.local` con:
     ```env
     VITE_API_URL=http://IP_DEL_SERVIDOR:5000
     ```
   - Ejemplo: `VITE_API_URL=http://192.168.1.100:5000`

3. **Probar la conexión:**
   - Abrir en navegador: `http://IP_DEL_SERVIDOR:5000/health`

📖 **Guía completa: [CONFIGURACION_RED.md](./CONFIGURACION_RED.md)**

## Estructura del Proyecto

```
├── public/
│   ├── datos.txt                    # Archivo de datos original (opcional)
│   ├── hospital-quilpue-logo.png
│   └── logo-libro-partos.png
├── server/                          # Backend API
│   ├── db/
│   │   └── connection.js           # Conexión a PostgreSQL
│   ├── routes/
│   │   └── partos.js               # Rutas API REST
│   ├── scripts/
│   │   ├── migrate.js              # Script de migración de BD
│   │   └── importData.js           # Script de importación de datos
│   ├── server.js                   # Servidor Express
│   └── package.json
├── migrations/
│   └── schema.sql                  # Schema de PostgreSQL
├── src/
│   ├── components/                 # Componentes React
│   │   ├── Dashboard.jsx
│   │   ├── Tabla.jsx
│   │   ├── AnalisisIA.jsx
│   │   └── ...
│   ├── services/
│   │   ├── apiService.js           # Cliente API REST
│   │   └── aiService.js            # Servicio de IA
│   ├── utils/
│   │   └── dataParser.js           # Parser de datos.txt
│   ├── App.jsx
│   └── main.jsx
├── .env.example                     # Ejemplo de variables de entorno
├── MIGRATION.md                     # Guía de migración
├── package.json
└── vite.config.js
```

## Tecnologías Utilizadas

### Frontend
- React 18
- Vite
- Framer Motion (animaciones)
- Recharts (gráficos)
- CSS3 (estilos personalizados)

### Backend
- Node.js + Express
- PostgreSQL
- pg (cliente PostgreSQL)

### IA
- Google Gemini API (@google/generative-ai)

## Funcionalidades

### Tabla de Datos
- Búsqueda en tiempo real por RUT
- Paginación de resultados
- Visualización de columnas principales
- Animaciones suaves en las filas

### Análisis de IA
- Estadísticas generales
- Distribución por tipo de parto
- Análisis por edad materna
- Distribución por sexo del recién nacido
- Insights generados automáticamente

### Sistema de Alertas
- Alertas de peso bajo (< 2500g)
- Notificaciones de partos prematuros
- Alertas de APGAR bajo
- Información sobre edad materna

## Despliegue en Render

### Opción 1: Usando render.yaml (Recomendado)

1. **Conectar tu repositorio a Render:**
   - Ve a [Render Dashboard](https://dashboard.render.com/)
   - Haz clic en "New +" y selecciona "Static Site"
   - Conecta tu repositorio de GitHub/GitLab

2. **Configuración automática:**
   - Render detectará automáticamente el archivo `render.yaml`
   - El despliegue se configurará automáticamente

3. **Variables de entorno (opcional):**
   - Si necesitas configurar variables de entorno, agrégalas en el dashboard de Render
   - Ejemplo: `VITE_GEMINI_API_KEY` para la API de Gemini

### Opción 2: Configuración manual

1. **Crear un nuevo Static Site en Render:**
   - Ve a [Render Dashboard](https://dashboard.render.com/)
   - Haz clic en "New +" y selecciona "Static Site"
   - Conecta tu repositorio

2. **Configurar el build:**
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
   - **Node Version:** `18.x` (o superior)

3. **Variables de entorno:**
   - Agrega `VITE_GEMINI_API_KEY` si quieres usar una API key diferente

### Notas importantes:

- La aplicación se construye como un sitio estático
- No se requiere servidor backend
- Los datos se cargan desde `public/datos.txt`
- La API key de Gemini está configurada en el código (considera moverla a variables de entorno para producción)

## Variables de Entorno

### Frontend (.env en la raíz)
```env
VITE_API_URL=http://localhost:5000/api
VITE_GEMINI_API_KEY=tu_api_key_aqui
```

### Backend (.env en server/)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=libro_partos
DB_USER=postgres
DB_PASSWORD=tu_password_aqui
PORT=5000
CORS_ORIGIN=http://localhost:5173
CLEAR_TABLE=false
```

📖 **Ver `.env.example` para más detalles**

## API REST

El backend expone los siguientes endpoints:

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Obtener datos del usuario actual

### Partos
- `GET /api/partos` - Obtener todos los partos (con filtros opcionales)
- `GET /api/partos/:id` - Obtener un parto por ID
- `GET /api/partos/count` - Contar total de partos
- `POST /api/partos` - Crear un nuevo parto
- `PUT /api/partos/:id` - Actualizar un parto
- `DELETE /api/partos/:id` - Eliminar un parto

### Usuarios (solo ADMIN)
- `GET /api/usuarios` - Obtener todos los usuarios
- `POST /api/usuarios` - Crear un nuevo usuario
- `PUT /api/usuarios/:id` - Actualizar un usuario
- `DELETE /api/usuarios/:id` - Eliminar un usuario

### Sistema
- `GET /health` - Verificar estado del servidor y BD

## 🚀 Deployment a Producción

Para desplegar la aplicación en un servidor de producción, consulta la guía completa en **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

### Resumen rápido:

1. **Preparar Base de Datos PostgreSQL**
   ```bash
   cd server
   npm run migrate
   npm run create-admin
   ```

2. **Configurar Variables de Entorno**
   - Copiar y editar `.env.production.example`
   - Configurar dominios, DB, JWT secret

3. **Iniciar Backend con PM2**
   ```bash
   cd server
   npm ci --production
   pm2 start ecosystem.config.js
   ```

4. **Build del Frontend**
   ```bash
   npm ci
   npm run build
   ```

5. **Configurar Nginx y SSL**
   - Ver configuración en `DEPLOYMENT.md`

6. **Script de Deployment Automático**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh produccion
   ```

## Sistema de Usuarios

La aplicación incluye un sistema de autenticación con dos roles:

- **ADMIN**: Acceso completo, puede gestionar usuarios
- **USUARIO**: Acceso a funcionalidades del sistema

**Usuario por defecto:**
- Username: `admin`
- Password: `admin123`

⚠️ **IMPORTANTE**: Cambiar la contraseña del administrador después del primer login.



