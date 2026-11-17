# Fragt den Discord-Bot-Token verdeckt ab und speichert ihn in automation\.env.
# Der Token wird nicht angezeigt und nirgends sonst gespeichert.
$envPath = Join-Path (Split-Path $PSScriptRoot -Parent) '.env'
Write-Host ''
Write-Host 'Discord-Bot-Token einfuegen (Rechtsklick oder Strg+V), dann Enter druecken.' -ForegroundColor Yellow
Write-Host 'Hinweis: Beim Einfuegen erscheinen nur Sternchen oder gar nichts. Das ist richtig so.' -ForegroundColor DarkGray
$secure = Read-Host 'Token' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr).Trim() } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
if ([string]::IsNullOrWhiteSpace($token)) { Write-Host 'Kein Token eingegeben. Abgebrochen.' -ForegroundColor Red; exit 1 }
$lines = @()
if (Test-Path $envPath) { $lines = Get-Content $envPath | Where-Object { $_ -notmatch '^\s*DISCORD_BOT_TOKEN\s*=' } }
$lines += "DISCORD_BOT_TOKEN=$token"
[IO.File]::WriteAllLines($envPath, [string[]]$lines, (New-Object Text.UTF8Encoding $false))
$token = $null
Write-Host ''
Write-Host 'Gespeichert. Du kannst diesen Tab schliessen und Claude Bescheid geben.' -ForegroundColor Green
