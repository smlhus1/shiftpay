# Pushes PNG files from shiftpay/assets/test-schedules/ to the Android emulator
# so they appear in Gallery and can be chosen via "Last opp bilde fra galleri".

$ErrorActionPreference = "Stop"
# PSScriptRoot = shiftpay/scripts, so shiftpay root is parent
$shiftpayRoot = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $shiftpayRoot "assets\test-schedules"
$devicePath = "/sdcard/DCIM/TestSchedules"

# Find adb (Android SDK platform-tools)
$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
    $sdkPath = $env:LOCALAPPDATA + "\Android\Sdk\platform-tools\adb.exe"
    if (Test-Path $sdkPath) { $adb = $sdkPath } else { $adb = $null }
}
if (-not $adb) {
    Write-Error "adb finnes ikke i PATH og ikke funnet under %LOCALAPPDATA%\Android\Sdk\platform-tools. Start emulatoren fra Android Studio og kjør scriptet derfra, eller legg platform-tools i PATH."
    exit 1
}
if ($adb -is [string]) { $adbExe = $adb } else { $adbExe = $adb.Source }

if (-not (Test-Path $sourceDir)) {
    Write-Error "Mappen finnes ikke: $sourceDir"
}

$images = Get-ChildItem -Path $sourceDir -Filter "*.png" -File
if ($images.Count -eq 0) {
    Write-Host "Ingen PNG-filer i $sourceDir. Legg screenshot-ene der og kjør scriptet på nytt."
    exit 1
}

# Ensure device path exists
& $adbExe shell "mkdir -p $devicePath"

foreach ($img in $images) {
    $dest = "${devicePath}/$($img.Name)"
    Write-Host "Pusher $($img.Name) til emulator..."
    & $adbExe push $img.FullName $dest
}

Write-Host ""
Write-Host "Ferdig. $($images.Count) bilde(r) er nå på emulatoren under DCIM/TestSchedules."
Write-Host "Åpne ShiftPay -> Import -> Last opp bilde fra galleri og velg et bilde."
