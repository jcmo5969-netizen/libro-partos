# Sistema de Autenticación - Libro de Partos

Este documento describe cómo configurar y usar el sistema de autenticación implementado.

## Características

- ✅ Inicio de sesión con usuario y contraseña
- ✅ Roles: **ADMIN** y **USUARIO**
- ✅ Solo usuarios **ADMIN** pueden gestionar cuentas de usuario
- ✅ El sistema siempre inicia desde el formulario de inicio de sesión
- ✅ Tokens JWT para autenticación segura
- ✅ Protección de rutas según roles

## Configuración Inicial

### 1. Ejecutar Migraciones

Primero, ejecuta las migraciones para crear la tabla de usuarios:

```bash
cd server
npm run migrate
```

Esto creará la tabla `usuarios` en la base de datos.

### 2. Crear Usuario Administrador

Crea el usuario administrador inicial:

```bash
cd server
npm run create-admin
```

Por defecto, se creará un usuario con:
- **Username**: `admin`
- **Password**: `admin123`
- **Rol**: `ADMIN`

⚠️ **IMPORTANTE**: Cambia la contraseña después del primer inicio de sesión.

### 3. Configurar Variables de Entorno

Asegúrate de tener configurado el secreto JWT en el archivo `.env` del servidor:

```env
JWT_SECRET=tu_secreto_super_seguro_cambiar_en_produccion
DB_HOST=localhost
DB_PORT=5432
DB_NAME=libro_partos
DB_USER=postgres
DB_PASSWORD=tu_password
```

Opcionalmente, puedes configurar las credenciales del admin inicial:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_NOMBRE=Administrador
ADMIN_EMAIL=admin@hospital.cl
```

## Uso del Sistema

### Inicio de Sesión

1. Al abrir la aplicación, siempre se mostrará el formulario de inicio de sesión
2. Ingresa tu usuario y contraseña
3. Si las credenciales son correctas, serás redirigido al dashboard

### Roles y Permisos

#### Usuario ADMIN
- ✅ Acceso completo al sistema
- ✅ Gestión de usuarios (crear, editar, eliminar)
- ✅ Ver y gestionar todos los partos
- ✅ Acceso a todas las funcionalidades

#### Usuario USUARIO
- ✅ Ver y gestionar partos
- ✅ Acceso al dashboard, tabla y REM
- ❌ No puede gestionar usuarios

### Gestión de Usuarios (Solo ADMIN)

Los usuarios con rol ADMIN pueden:

1. **Ver todos los usuarios**: Accede a la vista "Usuarios" desde el menú principal
2. **Crear nuevos usuarios**: Haz clic en "Nuevo Usuario"
3. **Editar usuarios**: Haz clic en el botón de editar (✏️)
4. **Eliminar usuarios**: Haz clic en el botón de eliminar (🗑️)
5. **Activar/Desactivar usuarios**: Usa el checkbox "Usuario Activo" al editar

### Cerrar Sesión

Haz clic en el botón "Salir" en la esquina superior derecha del header.

## Estructura de la Base de Datos

### Tabla `usuarios`

```sql
- id (UUID): Identificador único
- username (VARCHAR): Nombre de usuario (único)
- password_hash (VARCHAR): Hash de la contraseña (bcrypt)
- nombre_completo (VARCHAR): Nombre completo del usuario
- email (VARCHAR): Email del usuario (opcional)
- rol (VARCHAR): 'ADMIN' o 'USUARIO'
- activo (BOOLEAN): Si el usuario está activo
- created_at (TIMESTAMP): Fecha de creación
- updated_at (TIMESTAMP): Fecha de última actualización
- last_login (TIMESTAMP): Fecha del último inicio de sesión
```

## API Endpoints

### Autenticación (Público)

- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Obtener información del usuario actual

### Usuarios (Solo ADMIN)

- `GET /api/usuarios` - Listar todos los usuarios
- `GET /api/usuarios/:id` - Obtener un usuario
- `POST /api/usuarios` - Crear un nuevo usuario
- `PUT /api/usuarios/:id` - Actualizar un usuario
- `DELETE /api/usuarios/:id` - Eliminar un usuario

### Partos (Requiere autenticación)

Todas las rutas de `/api/partos` ahora requieren autenticación.

## Seguridad

- Las contraseñas se almacenan usando bcrypt (10 rounds)
- Los tokens JWT expiran después de 24 horas
- Las rutas protegidas verifican el token en cada petición
- Solo usuarios ADMIN pueden acceder a la gestión de usuarios

## Solución de Problemas

### Error: "Token inválido"
- El token ha expirado o es inválido. Cierra sesión e inicia sesión nuevamente.

### Error: "Acceso denegado. Se requiere rol de ADMIN"
- Estás intentando acceder a una funcionalidad que solo está disponible para administradores.

### Error: "Usuario inactivo"
- Tu cuenta ha sido desactivada. Contacta al administrador.

### No puedo crear el usuario administrador
- Asegúrate de que las migraciones se hayan ejecutado correctamente
- Verifica que PostgreSQL esté ejecutándose
- Revisa los logs del servidor para más detalles

## Notas Adicionales

- El sistema siempre inicia desde el login, incluso si hay un token guardado (se verifica automáticamente)
- Los tokens se almacenan en localStorage del navegador
- Al cerrar sesión, se eliminan todos los datos de autenticación del navegador

