[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

try {
    Import-Module (Join-Path $PSScriptRoot 'OpenSlotting.Localhost.Windows.psm1') -Force
    Start-OpenSlottingLocalhostApp -ApplicationRoot $PSScriptRoot
} catch {
    $launchError = $_.Exception.Message
    try {
        $shell = New-Object -ComObject WScript.Shell
        $shell.Popup($launchError, 0, 'OpenSlotting Localhost', 16) | Out-Null
    } catch {
        # The original launcher error remains authoritative if the popup is unavailable.
    }
    Write-Error $launchError
    exit 1
}
