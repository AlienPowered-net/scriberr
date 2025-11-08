# Resolve failed migration in production
# This marks the failed migration as rolled back so new migrations can be applied

$ErrorActionPreference = "Stop"

# Load .env file if it exists
if (Test-Path ".env") {
  Get-Content ".env" | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]*)=(.*)$') {
      $name = $matches[1].Trim()
      $value = $matches[2].Trim()
      [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
  }
}

if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL is not set"
}

Write-Host "Resolving failed migration: 20250905050203_add_folder_position" -ForegroundColor Yellow
Write-Host "This will mark it as rolled back so new migrations can be applied." -ForegroundColor Yellow

# Mark the failed migration as rolled back
npx -y prisma migrate resolve --rolled-back 20250905050203_add_folder_position

Write-Host "Migration marked as rolled back. Now deploying new migrations..." -ForegroundColor Green

# Deploy migrations
npx -y prisma migrate deploy

Write-Host "Done." -ForegroundColor Green

