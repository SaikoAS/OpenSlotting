[CmdletBinding()]
param(
    [ValidateSet('StartMenu', 'Desktop', 'Both')]
    [string]$Location
)

$ErrorActionPreference = 'Stop'

try {
    Import-Module (Join-Path $PSScriptRoot 'OpenSlotting.Windows.psm1') -Force

    if ([string]::IsNullOrWhiteSpace($Location)) {
        Write-Host 'Create an OpenSlotting shortcut for the current Windows user:'
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

    $edgePath = Find-OpenSlottingEdgePath
    $directories = Get-OpenSlottingShortcutDirectories -Location $Location
    $plan = Get-OpenSlottingShortcutPlan -ApplicationRoot $PSScriptRoot -EdgePath $edgePath -ShortcutDirectories $directories
    $created = @(New-OpenSlottingShortcuts -Plan $plan)

    Write-Host ''
    Write-Host 'OpenSlotting setup completed successfully.' -ForegroundColor Green
    $created | ForEach-Object { Write-Host "Created: $_" }
    if ($Location -eq 'StartMenu' -or $Location -eq 'Both') {
        Write-Host 'Optional taskbar pin: open Start, search for OpenSlotting, right-click it, and choose Pin to taskbar.'
    }
    Write-Host 'If this folder is moved or deleted, run setup again from its new location.'
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
