# Script para configurar el Firewall de Windows para el backend
# Ejecutar como Administrador

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Configuración de Firewall - Libro de Partos  " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si se ejecuta como administrador
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ ERROR: Este script debe ejecutarse como Administrador" -ForegroundColor Red
    Write-Host ""
    Write-Host "Cómo ejecutar:" -ForegroundColor Yellow
    Write-Host "1. Clic derecho en PowerShell" -ForegroundColor White
    Write-Host "2. Seleccionar 'Ejecutar como administrador'" -ForegroundColor White
    Write-Host "3. Navegar a esta carpeta y ejecutar el script" -ForegroundColor White
    Write-Host ""
    Read-Host "Presiona Enter para salir"
    exit
}

Write-Host "✅ Ejecutando con privilegios de Administrador" -ForegroundColor Green
Write-Host ""

# Verificar si ya existe la regla
$existingRule = Get-NetFirewallRule -DisplayName "Node.js Backend - Libro de Partos" -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "⚠️  Ya existe una regla de firewall para el backend" -ForegroundColor Yellow
    $response = Read-Host "¿Deseas eliminarla y crear una nueva? (S/N)"
    
    if ($response -eq "S" -or $response -eq "s") {
        Remove-NetFirewallRule -DisplayName "Node.js Backend - Libro de Partos"
        Write-Host "🗑️  Regla anterior eliminada" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Operación cancelada" -ForegroundColor Red
        Read-Host "Presiona Enter para salir"
        exit
    }
}

# Crear la regla del firewall
try {
    Write-Host "🔧 Creando regla de firewall..." -ForegroundColor Cyan
    
    New-NetFirewallRule `
        -DisplayName "Node.js Backend - Libro de Partos" `
        -Description "Permite conexiones entrantes al backend del Libro de Partos (Puerto 5000)" `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort 5000 `
        -Action Allow `
        -Profile Any `
        -Enabled True | Out-Null
    
    Write-Host "✅ Regla de firewall creada exitosamente" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "❌ ERROR al crear la regla: $_" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit
}

# Obtener la dirección IP local
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Información de Red                            " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$networkAdapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and 
    $_.IPAddress -notlike "169.254.*" -and
    $_.PrefixOrigin -ne "WellKnown"
} | Select-Object IPAddress, InterfaceAlias

if ($networkAdapters) {
    Write-Host "🌐 Direcciones IP disponibles:" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($adapter in $networkAdapters) {
        Write-Host "   Adaptador: " -NoNewline -ForegroundColor White
        Write-Host $adapter.InterfaceAlias -ForegroundColor Yellow
        Write-Host "   IP:        " -NoNewline -ForegroundColor White
        Write-Host $adapter.IPAddress -ForegroundColor Green
        Write-Host ""
    }
    
    $primaryIP = $networkAdapters[0].IPAddress
    
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  Próximos Pasos                                " -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Iniciar el backend:" -ForegroundColor Yellow
    Write-Host "   cd server" -ForegroundColor White
    Write-Host "   npm start" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Configurar el frontend en otras PCs:" -ForegroundColor Yellow
    Write-Host "   Crear archivo .env.local con:" -ForegroundColor White
    Write-Host "   VITE_API_URL=http://$primaryIP:5000" -ForegroundColor Green
    Write-Host ""
    Write-Host "3. Probar la conexión:" -ForegroundColor Yellow
    Write-Host "   Abrir en navegador: http://$primaryIP:5000/health" -ForegroundColor White
    Write-Host ""
    Write-Host "📖 Para más información, ver: CONFIGURACION_RED.md" -ForegroundColor Cyan
    Write-Host ""
    
} else {
    Write-Host "⚠️  No se encontraron adaptadores de red activos" -ForegroundColor Yellow
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Presiona Enter para salir"

