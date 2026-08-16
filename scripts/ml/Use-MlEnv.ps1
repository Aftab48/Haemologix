# Loads ml/.env into the current PowerShell session so that Prisma CLI, tsx scripts
# and the Python service all talk to the dedicated ML database / model service.
#
#   . .\scripts\ml\Use-MlEnv.ps1
#   npx prisma db push
#
# Existing process env vars are overridden on purpose: root .env points at the
# production database and we never want ML tooling to touch that by accident.

$envFile = Join-Path $PSScriptRoot "..\..\ml\.env"
if (-not (Test-Path $envFile)) {
  throw "ml/.env not found. Copy ml/env.ml.example to ml/.env and fill DATABASE_URL."
}

Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#")) { return }
  $idx = $line.IndexOf("=")
  if ($idx -lt 1) { return }
  $key = $line.Substring(0, $idx).Trim()
  $value = $line.Substring($idx + 1).Trim()
  if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
    $value = $value.Substring(1, $value.Length - 2)
  }
  Set-Item -Path "Env:$key" -Value $value
}

Write-Host "[ml-env] loaded $envFile (DATABASE_URL host: $(( $env:DATABASE_URL -split '@' )[-1] -split '/' | Select-Object -First 1))"
