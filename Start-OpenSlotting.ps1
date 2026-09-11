[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

try {
    Import-Module (Join-Path $PSScriptRoot 'OpenSlotting.Windows.psm1') -Force
    Start-OpenSlotting -ApplicationRoot $PSScriptRoot
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
