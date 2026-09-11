$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Assert-Equal {
    param($Actual, $Expected, [string]$Message)
    if ($Actual -ne $Expected) {
        throw "$Message`nExpected: $Expected`nActual: $Actual"
    }
}

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) {
        throw $Message
    }
}

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Import-Module (Join-Path $repositoryRoot 'OpenSlotting.Windows.psm1') -Force

$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('OpenSlotting Launcher Tests ' + [guid]::NewGuid().ToString('N'))
[System.IO.Directory]::CreateDirectory($testRoot) | Out-Null

try {
    $indexPath = Join-Path $testRoot 'index.html'
    $edgePath = Join-Path $testRoot 'Microsoft Edge.exe'
    Set-Content -LiteralPath $indexPath -Value '<!doctype html>' -Encoding UTF8
    Set-Content -LiteralPath $edgePath -Value 'synthetic edge placeholder' -Encoding UTF8

    $resolvedIndex = Get-OpenSlottingIndexPath -ApplicationRoot $testRoot
    Assert-Equal $resolvedIndex ([System.IO.Path]::GetFullPath($indexPath)) 'index.html must resolve relative to the application root.'

    $fileUri = ConvertTo-OpenSlottingFileUri -IndexPath $resolvedIndex
    Assert-True $fileUri.StartsWith('file:', [System.StringComparison]::OrdinalIgnoreCase) 'The launcher URL must use the file scheme.'
    Assert-True ($fileUri -match 'OpenSlotting%20Launcher%20Tests') 'Spaces in the application path must be escaped by System.Uri.'

    $foundEdge = Find-OpenSlottingEdgePath -CandidatePaths @((Join-Path $testRoot 'missing.exe'), $edgePath, $edgePath)
    Assert-Equal $foundEdge ([System.IO.Path]::GetFullPath($edgePath)) 'Edge discovery must return the first existing candidate.'

    $arguments = New-OpenSlottingEdgeArguments -FileUri $fileUri
    Assert-Equal $arguments ('--app="{0}"' -f $fileUri) 'Edge must receive one quoted app-mode file URL.'

    $shortcutDirectories = @((Join-Path $testRoot 'Start Menu'), (Join-Path $testRoot 'Desktop'))
    $plan = @(Get-OpenSlottingShortcutPlan -ApplicationRoot $testRoot -EdgePath $edgePath -ShortcutDirectories $shortcutDirectories)
    Assert-Equal $plan.Count 2 'A shortcut plan must include every selected destination.'
    Assert-Equal ([System.IO.Path]::GetFileName($plan[0].ShortcutPath)) 'OpenSlotting.lnk' 'The shortcut name must be stable.'
    Assert-Equal $plan[0].TargetPath ([System.IO.Path]::GetFullPath($edgePath)) 'The shortcut must target Edge directly.'
    Assert-Equal $plan[0].Arguments $arguments 'The shortcut must use the tested app-mode arguments.'
    Assert-True ($plan[0].Description -match 'managed by OpenSlotting') 'Managed shortcuts need an ownership marker.'
    Assert-True ($plan[0].IconLocation.EndsWith(',0')) 'The shortcut must have a local icon fallback.'

    $iconPath = Join-Path $testRoot 'OpenSlotting.ico'
    Set-Content -LiteralPath $iconPath -Value 'synthetic icon placeholder' -Encoding UTF8
    $iconPlan = @(Get-OpenSlottingShortcutPlan -ApplicationRoot $testRoot -EdgePath $edgePath -ShortcutDirectories @($shortcutDirectories[0]))
    Assert-Equal $iconPlan[0].IconLocation ("$([System.IO.Path]::GetFullPath($iconPath)),0") 'A local OpenSlotting.ico must take precedence over the Edge icon.'

    if ([Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT) {
        $created = @(New-OpenSlottingShortcuts -Plan $plan)
        Assert-Equal $created.Count 2 'Windows shortcut creation must create every planned shortcut.'
        Assert-True (Test-Path -LiteralPath $plan[0].ShortcutPath -PathType Leaf) 'The first planned shortcut must exist.'
        Assert-True (Test-Path -LiteralPath $plan[1].ShortcutPath -PathType Leaf) 'The second planned shortcut must exist.'

        $shell = New-Object -ComObject WScript.Shell
        $unmanagedShortcut = $shell.CreateShortcut($plan[1].ShortcutPath)
        $unmanagedShortcut.Description = 'Synthetic unrelated shortcut'
        $unmanagedShortcut.Save()

        $removal = Remove-OpenSlottingShortcuts -ShortcutDirectories $shortcutDirectories
        Assert-Equal $removal.Removed.Count 1 'Removal must delete the managed shortcut.'
        Assert-Equal $removal.Skipped.Count 1 'Removal must report an unmanaged shortcut instead of deleting it.'
        Assert-True (-not (Test-Path -LiteralPath $plan[0].ShortcutPath)) 'The managed shortcut must be removed.'
        Assert-True (Test-Path -LiteralPath $plan[1].ShortcutPath -PathType Leaf) 'The unmanaged shortcut must remain.'

        $foreignShortcutBlocked = $false
        try {
            New-OpenSlottingShortcuts -Plan $plan | Out-Null
        } catch {
            $foreignShortcutBlocked = $_.Exception.Message -match 'not managed by OpenSlotting'
        }
        Assert-True $foreignShortcutBlocked 'Setup must refuse to overwrite an unmanaged same-named shortcut.'
        Assert-True (-not (Test-Path -LiteralPath $plan[0].ShortcutPath)) 'Preflight must prevent partial shortcut creation when another destination conflicts.'
    }

    $missingEdgeFailed = $false
    try {
        Find-OpenSlottingEdgePath -CandidatePaths @((Join-Path $testRoot 'missing.exe')) | Out-Null
    } catch {
        $missingEdgeFailed = $_.Exception.Message -match 'Microsoft Edge was not found'
    }
    Assert-True $missingEdgeFailed 'Missing Edge must stop setup with a clear error.'

    Write-Output 'Windows launcher logic tests passed.'
} finally {
    $resolvedTestRoot = [System.IO.Path]::GetFullPath($testRoot)
    $resolvedTempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    if ($resolvedTestRoot.StartsWith($resolvedTempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
        [System.IO.Path]::GetFileName($resolvedTestRoot).StartsWith('OpenSlotting Launcher Tests ', [System.StringComparison]::Ordinal)) {
        Remove-Item -LiteralPath $resolvedTestRoot -Recurse -Force
    }
}
