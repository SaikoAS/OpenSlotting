# Shared Edge discovery and managed-shortcut helpers for the localhost launchers.
Set-StrictMode -Version Latest

$script:OpenSlottingShortcutName = 'OpenSlotting'
$script:OpenSlottingShortcutDescription = 'OpenSlotting shortcut managed by OpenSlotting'

function Get-OpenSlottingIndexPath {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ApplicationRoot
    )

    $resolvedRoot = [System.IO.Path]::GetFullPath($ApplicationRoot)
    $indexPath = [System.IO.Path]::GetFullPath((Join-Path $resolvedRoot 'index.html'))
    if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) {
        throw "OpenSlotting index.html was not found next to the launcher: $indexPath"
    }

    return $indexPath
}

function Get-OpenSlottingEdgeCandidates {
    [CmdletBinding()]
    param()

    $programFilesX86 = [Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
    $programFiles = [Environment]::GetEnvironmentVariable('ProgramFiles')
    $localAppData = [Environment]::GetEnvironmentVariable('LOCALAPPDATA')

    return @(
        if (-not [string]::IsNullOrWhiteSpace($programFilesX86)) {
            Join-Path $programFilesX86 'Microsoft\Edge\Application\msedge.exe'
        }
        if (-not [string]::IsNullOrWhiteSpace($programFiles)) {
            Join-Path $programFiles 'Microsoft\Edge\Application\msedge.exe'
        }
        if (-not [string]::IsNullOrWhiteSpace($localAppData)) {
            Join-Path $localAppData 'Microsoft\Edge\Application\msedge.exe'
        }
    )
}

function Find-OpenSlottingEdgePath {
    [CmdletBinding()]
    param(
        [string[]]$CandidatePaths
    )

    if (-not $PSBoundParameters.ContainsKey('CandidatePaths')) {
        $CandidatePaths = Get-OpenSlottingEdgeCandidates
    }

    $visited = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($candidatePath in $CandidatePaths) {
        if ([string]::IsNullOrWhiteSpace($candidatePath)) {
            continue
        }

        $resolvedCandidate = [System.IO.Path]::GetFullPath($candidatePath)
        if (-not $visited.Add($resolvedCandidate)) {
            continue
        }
        if (Test-Path -LiteralPath $resolvedCandidate -PathType Leaf) {
            return $resolvedCandidate
        }
    }

    throw 'Microsoft Edge was not found. Install Edge in a supported per-machine or per-user location, then run setup again.'
}

function Get-OpenSlottingShortcutDirectories {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet('StartMenu', 'Desktop', 'Both')]
        [string]$Location
    )

    $directories = @()
    if ($Location -eq 'StartMenu' -or $Location -eq 'Both') {
        $directories += [Environment]::GetFolderPath([Environment+SpecialFolder]::Programs)
    }
    if ($Location -eq 'Desktop' -or $Location -eq 'Both') {
        $directories += [Environment]::GetFolderPath([Environment+SpecialFolder]::DesktopDirectory)
    }

    $directories = @($directories | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique)
    if ($directories.Count -eq 0) {
        throw 'The requested current-user shortcut location is unavailable.'
    }

    return $directories
}

function Assert-OpenSlottingWindows {
    if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
        throw 'Shortcut creation and removal are supported only on Windows.'
    }
}

function New-OpenSlottingShortcuts {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [object[]]$Plan
    )

    Assert-OpenSlottingWindows
    $shell = New-Object -ComObject WScript.Shell

    foreach ($item in $Plan) {
        if (Test-Path -LiteralPath $item.ShortcutPath -PathType Leaf) {
            $existing = $shell.CreateShortcut($item.ShortcutPath)
            if ($existing.Description -ne $item.Description) {
                throw "A shortcut not managed by OpenSlotting already exists and was not overwritten: $($item.ShortcutPath)"
            }
        }
    }

    $created = @()
    foreach ($item in $Plan) {
        $shortcutDirectory = Split-Path -Parent $item.ShortcutPath
        [System.IO.Directory]::CreateDirectory($shortcutDirectory) | Out-Null
        $shortcut = $shell.CreateShortcut($item.ShortcutPath)
        $shortcut.TargetPath = $item.TargetPath
        $shortcut.Arguments = $item.Arguments
        $shortcut.WorkingDirectory = $item.WorkingDirectory
        $shortcut.IconLocation = $item.IconLocation
        $shortcut.Description = $item.Description
        $shortcut.Save()
        $created += $item.ShortcutPath
    }

    return $created
}

function Remove-OpenSlottingShortcuts {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$ShortcutDirectories
    )

    Assert-OpenSlottingWindows
    $shell = New-Object -ComObject WScript.Shell
    $removed = @()
    $skipped = @()

    foreach ($directory in $ShortcutDirectories) {
        $shortcutPath = Join-Path ([System.IO.Path]::GetFullPath($directory)) "$script:OpenSlottingShortcutName.lnk"
        if (-not (Test-Path -LiteralPath $shortcutPath -PathType Leaf)) {
            continue
        }

        $shortcut = $shell.CreateShortcut($shortcutPath)
        if ($shortcut.Description -ne $script:OpenSlottingShortcutDescription) {
            $skipped += $shortcutPath
            continue
        }

        Remove-Item -LiteralPath $shortcutPath -Force
        $removed += $shortcutPath
    }

    return [pscustomobject]@{
        Removed = $removed
        Skipped = $skipped
    }
}

Export-ModuleMember -Function @(
    'Find-OpenSlottingEdgePath',
    'Get-OpenSlottingEdgeCandidates',
    'Get-OpenSlottingIndexPath',
    'Get-OpenSlottingShortcutDirectories',
    'New-OpenSlottingShortcuts',
    'Remove-OpenSlottingShortcuts'
)
