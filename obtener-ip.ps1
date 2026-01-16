# Script simple para obtener la IP local del servidor
# Puede ejecutarse sin privilegios de administrador

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  IP Local del Servidor - Libro de Partos      " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Obtener todas las direcciones IP (excluyendo localhost y IPs de autoconfiguración)
$networkAdapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and 
    $_.IPAddress -notlike "169.254.*" -and
    $_.PrefixOrigin -ne "WellKnown"
} | Select-Object IPAddress, InterfaceAlias

if ($networkAdapters) {
    Write-Host "🌐 Direcciones IP disponibles en este servidor:" -ForegroundColor Green
    Write-Host ""
    
    $count = 1
    foreach ($adapter in $networkAdapters) {
        Write-Host "   [$count] $($adapter.InterfaceAlias)" -ForegroundColor Yellow
        Write-Host "       IP: " -NoNewline -ForegroundColor White
        Write-Host $adapter.IPAddress -ForegroundColor Green
        Write-Host ""
        $count++
    }
    
    $primaryIP = $networkAdapters[0].IPAddress
    
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Información para configurar otros equipos:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. En otras computadoras, crear archivo .env.local con:" -ForegroundColor White
    Write-Host ""
    Write-Host "   VITE_API_URL=http://$primaryIP:5000" -ForegroundColor Green
    Write-Host ""
    Write-Host "2. Para probar la conexión al backend, abrir en navegador:" -ForegroundColor White
    Write-Host ""
    Write-Host "   http://$primaryIP:5000/health" -ForegroundColor Green
    Write-Host ""
    Write-Host "3. Si no funciona, ejecutar (como Administrador):" -ForegroundColor White
    Write-Host ""
    Write-Host "   .\configurar-firewall.ps1" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "💡 TIP: Puedes copiar la URL directamente desde aquí" -ForegroundColor Cyan
    Write-Host ""
    
} else {
    Write-Host "⚠️  No se encontraron adaptadores de red activos" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Verifica que:" -ForegroundColor White
    Write-Host "- Tu computadora esté conectada a una red (Wi-Fi o Ethernet)" -ForegroundColor White
    Write-Host "- Los adaptadores de red estén habilitados" -ForegroundColor White
    Write-Host ""
}

Read-Host "Presiona Enter para salir"

