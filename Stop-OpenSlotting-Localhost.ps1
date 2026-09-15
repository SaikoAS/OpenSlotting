[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

try {
    Import-Module (Join-Path $PSScriptRoot 'OpenSlotting.Localhost.Windows.psm1') -Force
    $stopped = Stop-OpenSlottingLocalhostServer -ApplicationRoot $PSScriptRoot
    if ($stopped) {
        Write-Host 'OpenSlotting localhost server stopped.' -ForegroundColor Green
    } else {
        Write-Host 'No OpenSlotting localhost server is running.'
    }
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
