[CmdletBinding()]
param(
    [ValidateSet('StartMenu', 'Desktop', 'Both')]
    [string]$Location
)

$ErrorActionPreference = 'Stop'

try {
    Import-Module (Join-Path $PSScriptRoot 'OpenSlotting.Windows.psm1') -Force
    Import-Module (Join-Path $PSScriptRoot 'OpenSlotting.Localhost.Windows.psm1') -Force

    if ([string]::IsNullOrWhiteSpace($Location)) {
        Write-Host 'Create a combined OpenSlotting Localhost shortcut:'
        Write-Host '  1 - Start menu (default)'
        Write-Host '  2 - Desktop'
        Write-Host '  3 - Start menu and Desktop'
        $choice = (Read-Host 'Choose 1, 2, or 3').Trim()
        switch ($choice) {
            '' { $Location = 'StartMenu' }
            '1' { $Location = 'StartMenu' }
            '2' { $Location = 'Desktop' }
            '3' { $Location = 'Both' }
            default { throw 'Invalid selection. Run setup again and choose 1, 2, or 3.' }
        }
    }

    $directories = Get-OpenSlottingShortcutDirectories -Location $Location
    $plan = Get-OpenSlottingLocalhostShortcutPlan -ApplicationRoot $PSScriptRoot -ShortcutDirectories $directories
    $created = @(New-OpenSlottingShortcuts -Plan $plan)

    Write-Host ''
    Write-Host 'OpenSlotting Localhost shortcut setup completed successfully.' -ForegroundColor Green
    $created | ForEach-Object { Write-Host "Created: $_" }
    Write-Host 'This shortcut starts the local server when needed and then opens Edge app mode.'
    Write-Host 'If this folder is moved, run setup again from its new location.'
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
