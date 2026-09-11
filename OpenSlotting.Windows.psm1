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

function ConvertTo-OpenSlottingFileUri {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$IndexPath
    )

    $resolvedPath = [System.IO.Path]::GetFullPath($IndexPath)
    $uri = [System.Uri]::new($resolvedPath)
    if (-not $uri.IsFile) {
        throw "The OpenSlotting path could not be converted to a local file URL: $resolvedPath"
    }

    return $uri.AbsoluteUri
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

function New-OpenSlottingEdgeArguments {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$FileUri
    )

    $parsedUri = $null
    if (-not [System.Uri]::TryCreate($FileUri, [System.UriKind]::Absolute, [ref]$parsedUri) -or -not $parsedUri.IsFile) {
        throw 'Edge app mode requires an absolute local file URL.'
    }

    return '--app="{0}"' -f $parsedUri.AbsoluteUri
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

function Get-OpenSlottingShortcutPlan {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ApplicationRoot,

        [Parameter(Mandatory = $true)]
        [string]$EdgePath,

        [Parameter(Mandatory = $true)]
        [string[]]$ShortcutDirectories
    )

    $indexPath = Get-OpenSlottingIndexPath -ApplicationRoot $ApplicationRoot
    $fileUri = ConvertTo-OpenSlottingFileUri -IndexPath $indexPath
    $resolvedEdgePath = [System.IO.Path]::GetFullPath($EdgePath)
    if (-not (Test-Path -LiteralPath $resolvedEdgePath -PathType Leaf)) {
        throw "Microsoft Edge was not found at the selected path: $resolvedEdgePath"
    }

    $resolvedRoot = [System.IO.Path]::GetFullPath($ApplicationRoot)
    $iconPath = Join-Path $resolvedRoot 'OpenSlotting.ico'
    $iconLocation = if (Test-Path -LiteralPath $iconPath -PathType Leaf) {
        "$iconPath,0"
    } else {
        "$resolvedEdgePath,0"
    }

    return @($ShortcutDirectories | ForEach-Object {
        $directory = [System.IO.Path]::GetFullPath($_)
        [pscustomobject]@{
            ShortcutPath = Join-Path $directory "$script:OpenSlottingShortcutName.lnk"
            TargetPath = $resolvedEdgePath
            Arguments = New-OpenSlottingEdgeArguments -FileUri $fileUri
            WorkingDirectory = $resolvedRoot
            IconLocation = $iconLocation
            Description = $script:OpenSlottingShortcutDescription
        }
    })
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
            if ($existing.Description -ne $script:OpenSlottingShortcutDescription) {
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
        $shortcut.Description = $script:OpenSlottingShortcutDescription
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

function Start-OpenSlotting {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ApplicationRoot
    )

    $indexPath = Get-OpenSlottingIndexPath -ApplicationRoot $ApplicationRoot
    $fileUri = ConvertTo-OpenSlottingFileUri -IndexPath $indexPath
    $edgePath = Find-OpenSlottingEdgePath
    $arguments = New-OpenSlottingEdgeArguments -FileUri $fileUri
    Start-Process -FilePath $edgePath -ArgumentList $arguments -WorkingDirectory ([System.IO.Path]::GetFullPath($ApplicationRoot))
}

Export-ModuleMember -Function @(
    'ConvertTo-OpenSlottingFileUri',
    'Find-OpenSlottingEdgePath',
    'Get-OpenSlottingEdgeCandidates',
    'Get-OpenSlottingIndexPath',
    'Get-OpenSlottingShortcutDirectories',
    'Get-OpenSlottingShortcutPlan',
    'New-OpenSlottingEdgeArguments',
    'New-OpenSlottingShortcuts',
    'Remove-OpenSlottingShortcuts',
    'Start-OpenSlotting'
)
