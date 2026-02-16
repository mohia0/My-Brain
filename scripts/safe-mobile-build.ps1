$ErrorActionPreference = "Stop"
try {
    Write-Host "Preparing files..."
    if (!(Test-Path "app/_api_backup")) { New-Item -ItemType Directory -Path "app/_api_backup" | Out-Null }
    if (Test-Path "app/api") { Move-Item "app/api" "app/_api_backup/" }
    if (Test-Path "app/robots.ts") { Move-Item "app/robots.ts" "app/_api_backup/" }
    if (Test-Path "app/sitemap.ts") { Move-Item "app/sitemap.ts" "app/_api_backup/" }
    if (Test-Path "middleware.ts") { Move-Item "middleware.ts" "_middleware_backup.ts" }

    Write-Host "Building Next.js app..."
    $env:IS_CAPACITOR_BUILD="true"
    # Run next build and capture exit code manually if needed, but Stop preference should handle it? 
    # npx (cmd) might not throw PS error on non-zero exit code automatically.
    cmd /c "npx next build"
    if ($LASTEXITCODE -ne 0) { throw "Next build failed with code $LASTEXITCODE" }

    Write-Host "Syncing Capacitor..."
    cmd /c "npx cap sync"
    if ($LASTEXITCODE -ne 0) { throw "Capacitor sync failed with code $LASTEXITCODE" }

    Write-Host "Build Success!"
}
catch {
    Write-Error "Build Failed: $_"
}
finally {
    Write-Host "Restoring files..."
    if (Test-Path "app/_api_backup/api") { Move-Item "app/_api_backup/api" "app/" -Force }
    if (Test-Path "app/_api_backup/robots.ts") { Move-Item "app/_api_backup/robots.ts" "app/" -Force }
    if (Test-Path "app/_api_backup/sitemap.ts") { Move-Item "app/_api_backup/sitemap.ts" "app/" -Force }
    if (Test-Path "_middleware_backup.ts") { Move-Item "_middleware_backup.ts" "middleware.ts" -Force }
    if (Test-Path "app/_api_backup") { 
        if ((Get-ChildItem "app/_api_backup").Count -eq 0) { Remove-Item "app/_api_backup" }
    }
}
