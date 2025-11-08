# scripts/migrate-note-versions.ps1
# Safe baseline + deploy for Prisma on Windows (no interactive prompts)

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

Write-Host "Killing any stuck node/prisma/pnpm processes..." -ForegroundColor Yellow
Get-Process node, prisma, pnpm -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "Node / Prisma versions:"
node --version
npx prisma --version

if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL is not set"
}
Write-Host ("DB: " + $env:DATABASE_URL.Substring(0, [Math]::Min(40,$env:DATABASE_URL.Length)) + "...")

Write-Host "Creating baseline diff SQL from current DB -> prisma/schema.prisma..." -ForegroundColor Cyan
npx -y prisma migrate diff --from-url "$env:DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script | Out-File -FilePath prisma/migrations/_baseline.sql -Encoding utf8

if (Test-Path prisma/migrations/_baseline.sql) {
  $baseline = Get-Content prisma/migrations/_baseline.sql -Raw
} else {
  $baseline = ""
}
if ($null -eq $baseline -or $baseline.Trim().Length -eq 0) {
  Write-Host "Baseline file is empty (DB already matches schema) - continuing..." -ForegroundColor Green
} else {
  Write-Host "Executing baseline SQL..." -ForegroundColor Cyan
  npx -y prisma db execute --file prisma/migrations/_baseline.sql
}

Write-Host "Deploying Prisma migrations (non-interactive)..." -ForegroundColor Cyan
npx -y prisma migrate deploy

Write-Host "Generating Prisma client..." -ForegroundColor Cyan
npx -y prisma generate

Write-Host "Migration status:" -ForegroundColor Cyan
npx -y prisma migrate status

Write-Host "Done." -ForegroundColor Green
