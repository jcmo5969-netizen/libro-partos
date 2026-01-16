# 🌐 Configuración de Red Local

Esta guía te ayudará a configurar la aplicación para que funcione en múltiples computadoras de tu red local.

## Problema Común

**Síntoma:** El frontend carga correctamente desde otra computadora, pero el backend no responde (errores de conexión al hacer login o cargar datos).

**Causa:** El backend está configurado para aceptar conexiones desde cualquier dispositivo en la red, pero puede estar bloqueado por el firewall o el frontend está intentando conectarse a `localhost` en lugar de la IP del servidor.

---

## ✅ Solución Paso a Paso

### 1. Configurar el Backend (En la computadora servidor)

#### 1.1. El código ya está configurado correctamente
El archivo `server/server.js` ya está configurado para escuchar en `0.0.0.0`, lo que permite conexiones desde cualquier dispositivo en la red.

#### 1.2. Configurar el Firewall de Windows

**Opción A: Usando PowerShell (Recomendado)**

1. Abrir PowerShell como Administrador (clic derecho > "Ejecutar como administrador")
2. Ejecutar:
```powershell
New-NetFirewallRule -DisplayName "Node.js Backend - Libro de Partos" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
```

**Opción B: Usando la interfaz gráfica**

1. Abrir "Firewall de Windows Defender con seguridad avanzada"
2. Clic en "Reglas de entrada" > "Nueva regla..."
3. Tipo de regla: "Puerto" > Siguiente
4. TCP, Puerto local específico: `5000` > Siguiente
5. Acción: "Permitir la conexión" > Siguiente
6. Perfil: Marcar todas (Dominio, Privado, Público) > Siguiente
7. Nombre: "Node.js Backend - Libro de Partos" > Finalizar

#### 1.3. Obtener la dirección IP del servidor

Abrir PowerShell o CMD y ejecutar:
```powershell
ipconfig
```

Buscar la línea "Dirección IPv4" en tu adaptador de red activo (Wi-Fi o Ethernet).
Ejemplo: `192.168.1.100`

**Importante:** Anota esta IP, la necesitarás en el siguiente paso.

---

### 2. Configurar el Frontend (En todas las computadoras)

Tienes dos opciones para configurar la URL del backend:

#### Opción A: Crear archivo .env.local (Recomendado para desarrollo)

1. En la raíz del proyecto, crear archivo `.env.local`:
```env
VITE_API_URL=http://192.168.1.100:5000
```
*(Reemplaza `192.168.1.100` con la IP real de tu servidor)*

2. Reiniciar el servidor de desarrollo:
```bash
npm run dev
```

#### Opción B: Editar config.js directamente

1. Abrir `src/config.js`
2. Cambiar la línea:
```javascript
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```
Por:
```javascript
export const API_URL = import.meta.env.VITE_API_URL || 'http://192.168.1.100:5000';
```
*(Reemplaza `192.168.1.100` con la IP real de tu servidor)*

---

### 3. Iniciar el Backend

En la computadora servidor, en la carpeta `server/`:

```bash
cd server
npm start
```

Deberías ver:
```
🚀 Servidor iniciado en puerto 5000
📡 API disponible en http://localhost:5000/api
🌐 Servidor accesible desde la red en todas las interfaces (0.0.0.0:5000)
```

---

### 4. Iniciar el Frontend

En cualquier computadora:

```bash
npm run dev
```

El frontend estará disponible en `http://localhost:5173`

---

## 🧪 Verificar que Funciona

### Desde la computadora servidor:

1. Abrir navegador: `http://localhost:5000/health`
   - Debe mostrar: `{"status":"ok","database":"connected",...}`

### Desde otra computadora:

1. Abrir navegador: `http://192.168.1.100:5000/health`
   *(Reemplaza con la IP del servidor)*
   - Debe mostrar: `{"status":"ok","database":"connected",...}`

2. Si funciona, la aplicación completa debería funcionar correctamente.

---

## ❌ Solución de Problemas

### El backend no responde desde otra PC

**Verificar que el servidor escucha en 0.0.0.0:**
```powershell
netstat -ano | findstr :5000
```
Debe mostrar: `0.0.0.0:5000` (NO `127.0.0.1:5000`)

### Error "Connection refused" o "Network error"

1. **Verificar firewall:**
   ```powershell
   Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Node*" -or $_.DisplayName -like "*Libro*"}
   ```
   Debe aparecer la regla que creaste.

2. **Verificar que el backend está corriendo:**
   En la computadora servidor:
   ```powershell
   netstat -ano | findstr :5000
   ```

3. **Verificar conectividad de red:**
   Desde otra computadora:
   ```powershell
   ping 192.168.1.100
   ```
   *(Reemplaza con la IP del servidor)*

### El frontend funciona pero aparece error 401 o 403

- Esto es normal si no has iniciado sesión
- El problema de red está resuelto, es un problema de autenticación
- Intenta hacer login con tus credenciales

### La IP del servidor cambia frecuentemente

Si usas DHCP (IP dinámica), puedes:

**Opción A: Configurar IP estática en tu router**
1. Acceder al panel de administración del router
2. Buscar "DHCP Reservation" o "Reserva de IP"
3. Asignar una IP fija a la MAC address de tu servidor

**Opción B: Usar el nombre del host**
```env
VITE_API_URL=http://NOMBRE-PC:5000
```
*(Donde NOMBRE-PC es el nombre de tu computadora)*

Para ver el nombre de tu PC:
```powershell
hostname
```

---

## 📱 Acceso desde dispositivos móviles

Para acceder desde un teléfono o tablet en la misma red Wi-Fi:

1. Asegurarte de que el firewall permite conexiones
2. En el navegador móvil, ir a: `http://192.168.1.100:5173`
   *(Reemplaza con la IP del servidor)*

**Nota:** Algunas funciones pueden no trabajar correctamente en navegadores móviles si la aplicación no está optimizada para móvil.

---

## 🔒 Consideraciones de Seguridad

⚠️ **Importante:**

1. **No expongas el backend a Internet directamente** (0.0.0.0 permite conexiones desde cualquier lugar si el puerto está expuesto)
2. **Usa solo en redes confiables** (tu red local/LAN)
3. **Para producción**: Usa HTTPS, reverse proxy (Nginx), y configuración adecuada de CORS
4. **No uses en redes públicas** (café, aeropuerto, etc.) sin VPN

---

## 📞 Resumen Rápido

**En el servidor:**
1. ✅ Código ya configurado (escucha en 0.0.0.0)
2. Abrir puerto 5000 en firewall de Windows
3. Obtener IP local (`ipconfig`)
4. Iniciar backend (`npm start` en carpeta server/)

**En cada cliente:**
1. Crear `.env.local` con `VITE_API_URL=http://IP_SERVIDOR:5000`
2. Iniciar frontend (`npm run dev`)
3. Acceder en navegador

**Probar:**
- Abrir `http://IP_SERVIDOR:5000/health` desde navegador
- Debe mostrar JSON con status "ok"

---

¡Listo! Ahora deberías poder usar la aplicación desde múltiples computadoras en tu red local. 🎉

