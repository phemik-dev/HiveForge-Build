# Build HiveForge-branded artifacts from this checkout.
# Run this in a normal PowerShell (outside the DSH sandbox) if in-sandbox builds fail.

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

# Avoid pnpm interactive prompts when deleting node_modules.
$env:CI = 'true'

# ZIP checkouts have no .git; the build script needs a commit hash.
# Any 7-40 char lowercase hex string is accepted.
$env:DSH_CLIENT_COMMIT_HASH = '0000000'

Write-Host "[HiveForge] Installing deps..." -ForegroundColor Cyan
pnpm install

Write-Host "[HiveForge] Building (lib + web)..." -ForegroundColor Cyan
pnpm run build

Write-Host "[HiveForge] Done." -ForegroundColor Green
