[CmdletBinding()]
param(
    [ValidateSet('StartMenu', 'Desktop', 'Both')]
    [string]$Location = 'Both'
)

$ErrorActionPreference = 'Stop'

try {
    Import-Module (Join-Path $PSScriptRoot 'OpenSlotting.Windows.psm1') -Force
    $directories = Get-OpenSlottingShortcutDirectories -Location $Location
    $result = Remove-OpenSlottingShortcuts -ShortcutDirectories $directories

    Write-Host ''
    if ($result.Removed.Count -gt 0) {
        Write-Host 'OpenSlotting shortcuts removed successfully.' -ForegroundColor Green
        $result.Removed | ForEach-Object { Write-Host "Removed: $_" }
    } else {
        Write-Host 'No OpenSlotting-managed shortcuts were found.'
    }
    $result.Skipped | ForEach-Object {
        Write-Warning "Not removed because the shortcut is not managed by OpenSlotting: $_"
    }
    Write-Host 'Application files and browser-local data were not changed.'
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
