$ErrorActionPreference = "Stop"
try {
    Write-Host "Renaming API folder..."
    if (Test-Path "app/api") { Move-Item "app/api" "app/_api_backup" -Force }
    
    # Hide middleware if exists
    if (Test-Path "middleware.ts") { Move-Item "middleware.ts" "_middleware_backup.ts" -Force }

    $env:IS_CAPACITOR_BUILD = "true"
    Write-Host "Running Next.js Build..."
    # Use npx directly instead of npm run script to control env better
    cmd /c "npx next build"
    if ($LASTEXITCODE -ne 0) { throw "Next.js Build Failed" }
    
    Write-Host "Syncing Capacitor..."
    cmd /c "npx cap sync"
    if ($LASTEXITCODE -ne 0) { throw "Capacitor Sync Failed" }
    
    Write-Host "Build & Sync Success!"
}
catch {
    Write-Error "Process Failed: $_"
}
finally {
    Write-Host "Restoring files..."
    if (Test-Path "app/_api_backup") { Move-Item "app/_api_backup" "app/api" -Force }
    if (Test-Path "_middleware_backup.ts") { Move-Item "_middleware_backup.ts" "middleware.ts" -Force }
}
