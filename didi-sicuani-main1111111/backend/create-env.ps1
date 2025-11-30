# Script para crear archivo .env desde .env.example
# Ejecutar: .\create-env.ps1

$envExample = ".env.example"
$envFile = ".env"

if (Test-Path $envFile) {
    Write-Host "⚠️  El archivo .env ya existe." -ForegroundColor Yellow
    $overwrite = Read-Host "¿Deseas sobrescribirlo? (s/N)"
    if ($overwrite -ne "s" -and $overwrite -ne "S") {
        Write-Host "❌ Operación cancelada." -ForegroundColor Red
        exit
    }
}

if (Test-Path $envExample) {
    Copy-Item $envExample $envFile
    Write-Host "✅ Archivo .env creado desde .env.example" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Ahora edita el archivo .env y completa:" -ForegroundColor Cyan
    Write-Host "   - MONGODB_URI (si tienes autenticación)" -ForegroundColor Cyan
    Write-Host "   - JWT_SECRET (genera uno seguro)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "ℹ️  Nota: PostgreSQL ha sido removido. El proyecto usa solo MongoDB." -ForegroundColor Yellow
} else {
    Write-Host "❌ Error: No se encuentra .env.example" -ForegroundColor Red
    exit 1
}

