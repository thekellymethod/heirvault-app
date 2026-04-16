# Push Supabase migrations when `supabase db push --linked` fails on IPv4-only networks.
#
# 1. Dashboard → Project → Connect → ORMs / Session pooler (port 5432).
# 2. Copy the URI and replace [YOUR-PASSWORD] with your database password.
# 3. Add SUPABASE_DB_POOLER_URL to .env or .env.local (repo loads .env.local first, then .env).
#    postgresql://postgres.yourref:yourpassword@aws-0-REGION.pooler.supabase.com:5432/postgres
#
# Then: powershell -NoProfile -File scripts/supabase-db-push.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

function Import-DotEnvFile([string]$path) {
  if (-not (Test-Path $path)) { return }
  Get-Content $path | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)\s*=\s*(.*)\s*$') {
      $k = $Matches[1].Trim()
      $v = $Matches[2].Trim()
      if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1, $v.Length - 2) }
      elseif ($v.StartsWith("'") -and $v.EndsWith("'")) { $v = $v.Substring(1, $v.Length - 2) }
      Set-Item -Path "Env:$k" -Value $v
    }
  }
}

Import-DotEnvFile (Join-Path $root ".env.local")
Import-DotEnvFile (Join-Path $root ".env")

if (-not $env:SUPABASE_DB_POOLER_URL) {
  Write-Host "Missing SUPABASE_DB_POOLER_URL in .env.local or .env"
  Write-Host "Add the Session pooler URI from Supabase Dashboard (Connect), then re-run."
  exit 1
}

Set-Location $root
supabase db push --db-url $env:SUPABASE_DB_POOLER_URL --dns-resolver https
