# Script de diagnóstico para verificar la configuración de red
# No requiere privilegios de administrador

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Verificación de Red - Libro de Partos " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# 1. Verificar adaptadores de red
Write-Host "1️⃣  Verificando adaptadores de red..." -ForegroundColor Yellow
$networkAdapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and 
    $_.IPAddress -notlike "169.254.*" -and
    $_.PrefixOrigin -ne "WellKnown"
} | Select-Object IPAddress, InterfaceAlias

if ($networkAdapters) {
    Write-Host "   ✅ Adaptadores de red encontrados:" -ForegroundColor Green
    foreach ($adapter in $networkAdapters) {
        Write-Host "      - $($adapter.InterfaceAlias): $($adapter.IPAddress)" -ForegroundColor White
    }
    $serverIP = $networkAdapters[0].IPAddress
} else {
    Write-Host "   ❌ No se encontraron adaptadores de red activos" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

# 2. Verificar regla de firewall
Write-Host "2️⃣  Verificando regla de firewall..." -ForegroundColor Yellow
$firewallRule = Get-NetFirewallRule -DisplayName "Node.js Backend - Libro de Partos" -ErrorAction SilentlyContinue

if ($firewallRule) {
    if ($firewallRule.Enabled -eq "True") {
        Write-Host "   ✅ Regla de firewall configurada y activa" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Regla de firewall existe pero está deshabilitada" -ForegroundColor Yellow
        $allGood = $false
    }
} else {
    Write-Host "   ❌ Regla de firewall no encontrada" -ForegroundColor Red
    Write-Host "      Ejecuta: .\configurar-firewall.ps1 (como Administrador)" -ForegroundColor White
    $allGood = $false
}

Write-Host ""

# 3. Verificar si el puerto 5000 está escuchando
Write-Host "3️⃣  Verificando si el backend está corriendo..." -ForegroundColor Yellow
$netstat = netstat -ano | Select-String ":5000"

if ($netstat) {
    $listening = $netstat | Select-String "LISTENING"
    if ($listening) {
        # Verificar si escucha en 0.0.0.0 o solo en 127.0.0.1
        if ($listening -match "0.0.0.0:5000") {
            Write-Host "   ✅ Backend corriendo y accesible desde la red (0.0.0.0:5000)" -ForegroundColor Green
        } elseif ($listening -match "127.0.0.1:5000") {
            Write-Host "   ⚠️  Backend corriendo pero solo en localhost (127.0.0.1:5000)" -ForegroundColor Yellow
            Write-Host "      El código debería estar actualizado para escuchar en 0.0.0.0" -ForegroundColor White
            $allGood = $false
        } else {
            Write-Host "   ✅ Backend corriendo en puerto 5000" -ForegroundColor Green
        }
    } else {
        Write-Host "   ⚠️  Puerto 5000 en uso pero no está escuchando" -ForegroundColor Yellow
        $allGood = $false
    }
} else {
    Write-Host "   ❌ Backend no está corriendo" -ForegroundColor Red
    Write-Host "      Ejecuta: cd server && npm start" -ForegroundColor White
    $allGood = $false
}

Write-Host ""

# 4. Probar conexión al backend (si está corriendo)
if ($serverIP -and ($netstat -match "LISTENING")) {
    Write-Host "4️⃣  Probando conexión al backend..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ Backend responde correctamente" -ForegroundColor Green
            
            # Intentar parsear el JSON
            try {
                $json = $response.Content | ConvertFrom-Json
                if ($json.status -eq "ok") {
                    Write-Host "      Estado: OK" -ForegroundColor White
                    if ($json.database -eq "connected") {
                        Write-Host "      Base de datos: Conectada ✅" -ForegroundColor White
                    } else {
                        Write-Host "      Base de datos: Desconectada ⚠️" -ForegroundColor Yellow
                        $allGood = $false
                    }
                }
            } catch {
                Write-Host "      Respuesta recibida pero no se pudo parsear" -ForegroundColor White
            }
        } else {
            Write-Host "   ⚠️  Backend responde pero con código: $($response.StatusCode)" -ForegroundColor Yellow
            $allGood = $false
        }
    } catch {
        Write-Host "   ❌ No se pudo conectar al backend" -ForegroundColor Red
        Write-Host "      Error: $($_.Exception.Message)" -ForegroundColor White
        $allGood = $false
    }
    
    Write-Host ""
}

# 5. Verificar si existe .env.local (para clientes)
Write-Host "5️⃣  Verificando configuración del frontend..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local" -Raw
    if ($envContent -match "VITE_API_URL=(.+)") {
        $apiUrl = $matches[1].Trim()
        Write-Host "   ✅ Archivo .env.local encontrado" -ForegroundColor Green
        Write-Host "      API URL configurada: $apiUrl" -ForegroundColor White
        
        # Verificar si la URL es localhost (servidor) o una IP (cliente)
        if ($apiUrl -match "localhost|127\.0\.0\.1") {
            Write-Host "      ℹ️  Configurado para usar el backend local" -ForegroundColor Cyan
        } else {
            Write-Host "      ℹ️  Configurado para conectarse a un servidor remoto" -ForegroundColor Cyan
        }
    } else {
        Write-Host "   ⚠️  .env.local existe pero no contiene VITE_API_URL" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ℹ️  No se encontró .env.local (usará configuración por defecto)" -ForegroundColor Cyan
    Write-Host "      Si esta es una computadora cliente, crea .env.local con:" -ForegroundColor White
    if ($serverIP) {
        Write-Host "      VITE_API_URL=http://${serverIP}:5000" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Resumen final
if ($allGood) {
    Write-Host "✅ ¡Todo parece estar configurado correctamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Para usar desde otras computadoras:" -ForegroundColor Cyan
    if ($serverIP) {
        Write-Host "1. Crear archivo .env.local con:" -ForegroundColor White
        Write-Host "   VITE_API_URL=http://${serverIP}:5000" -ForegroundColor Green
        Write-Host ""
        Write-Host "2. Probar en navegador:" -ForegroundColor White
        Write-Host "   http://${serverIP}:5000/health" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  Se encontraron algunos problemas" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Revisa los mensajes anteriores para más detalles" -ForegroundColor White
    Write-Host ""
    Write-Host "Soluciones comunes:" -ForegroundColor Cyan
    Write-Host "1. Configurar firewall: .\configurar-firewall.ps1 (como Admin)" -ForegroundColor White
    Write-Host "2. Iniciar backend: cd server && npm start" -ForegroundColor White
    Write-Host "3. Ver guía completa: CONFIGURACION_RED.md" -ForegroundColor White
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "Presiona Enter para salir"

