# ⚡ Inicio Rápido - Uso en Red Local

Esta es una guía ultra-rápida para poner en funcionamiento la aplicación en múltiples computadoras.

---

## 📍 En la Computadora Servidor (Donde está el código)

### 1. Configurar Firewall (Solo una vez)

**Clic derecho en PowerShell > "Ejecutar como administrador"**, luego:

```powershell
cd "C:\Users\tompo\Nextcloud\DESARROLLOS\CURSOR\libro-de-partos"
.\configurar-firewall.ps1
```

El script te mostrará tu IP local, **anótala** (ejemplo: `192.168.1.100`)

### 2. Iniciar el Backend

En PowerShell normal (sin privilegios):

```powershell
cd server
npm start
```

Deberías ver:
```
🚀 Servidor iniciado en puerto 5000
🌐 Servidor accesible desde la red en todas las interfaces (0.0.0.0:5000)
```

### 3. Iniciar el Frontend (En otra terminal)

```powershell
npm run dev
```

---

## 💻 En las Otras Computadoras

### 1. Clonar o Copiar el Proyecto

```powershell
# Si usas Git:
git clone [URL_DEL_REPOSITORIO]
cd libro-de-partos

# O copia la carpeta completa desde el servidor
```

### 2. Instalar Dependencias

```powershell
npm install
```

### 3. Crear Archivo de Configuración

Crear archivo `.env.local` en la raíz del proyecto:

```env
VITE_API_URL=http://192.168.1.100:5000
```

**Reemplaza `192.168.1.100` con la IP del servidor que anotaste en el paso 1**

### 4. Iniciar el Frontend

```powershell
npm run dev
```

### 5. Abrir en el Navegador

```
http://localhost:5173
```

---

## ✅ Verificar que Funciona

### Desde cualquier computadora:

1. Abrir navegador
2. Ir a: `http://192.168.1.100:5000/health` (usa la IP de tu servidor)
3. Deberías ver algo como:

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

Si ves esto, ¡todo está funcionando! 🎉

---

## ❌ Problemas Comunes

### "No se puede conectar" o "Connection refused"

**Solución:**
1. Verificar que el firewall está configurado (ejecutar `configurar-firewall.ps1` de nuevo)
2. Verificar que el backend está corriendo en el servidor
3. Verificar que usaste la IP correcta en `.env.local`

### "NetworkError" o "CORS error"

**Solución:**
- El backend ya está configurado para aceptar conexiones desde la red local
- Verificar que el archivo `.env.local` tiene la URL correcta

### La IP cambió

Si la IP del servidor cambió (por ejemplo, después de reiniciar):

1. En el servidor, ejecutar:
```powershell
.\obtener-ip.ps1
```

2. Actualizar `.env.local` en las otras computadoras con la nueva IP

3. Reiniciar el frontend (Ctrl+C y luego `npm run dev`)

---

## 📱 Desde un Teléfono o Tablet

1. Conectar el dispositivo a la misma red Wi-Fi
2. Abrir navegador
3. Ir a: `http://192.168.1.100:5173` (IP del servidor)

**Nota:** Algunas funciones pueden no funcionar óptimamente en móvil.

---

## 🔒 Seguridad

⚠️ **IMPORTANTE:**
- Esta configuración es solo para **red local/LAN**
- **NO expongas** el puerto 5000 a Internet
- Usa solo en **redes confiables** (tu casa, oficina, etc.)
- **NO uses en redes públicas** (cafés, aeropuertos, etc.)

---

## 📞 ¿Necesitas más ayuda?

- Guía completa: [CONFIGURACION_RED.md](./CONFIGURACION_RED.md)
- Documentación general: [README.md](./README.md)
- Despliegue a producción: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 🎯 Resumen de Comandos

### Servidor (solo una vez):
```powershell
# Como Administrador:
.\configurar-firewall.ps1

# Normal:
cd server
npm start

# En otra terminal:
npm run dev
```

### Clientes:
```powershell
npm install

# Crear .env.local con:
# VITE_API_URL=http://IP_SERVIDOR:5000

npm run dev
```

¡Listo para trabajar! 🚀

