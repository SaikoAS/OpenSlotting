Set-StrictMode -Version Latest

$script:LocalhostPort = 8765
$script:ShortcutName = 'OpenSlotting Localhost'
$script:ShortcutDescription = 'OpenSlotting localhost shortcut managed by OpenSlotting'

function Get-OpenSlottingCanonicalPath {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $fullPath = [System.IO.Path]::GetFullPath($Path)
    if (-not (Test-Path -LiteralPath $fullPath)) {
        throw "The path was not found: $fullPath"
    }

    if ($null -eq ('OpenSlottingNativePath' -as [type])) {
        Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32.SafeHandles;

public static class OpenSlottingNativePath
{
    private const uint FileFlagBackupSemantics = 0x02000000;
    private const uint OpenExisting = 3;
    private const uint ShareDelete = 4;
    private const uint ShareRead = 1;
    private const uint ShareWrite = 2;

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern SafeFileHandle CreateFile(
        string fileName,
        uint desiredAccess,
        uint shareMode,
        IntPtr securityAttributes,
        uint creationDisposition,
        uint flagsAndAttributes,
        IntPtr templateFile);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern uint GetFinalPathNameByHandle(
        SafeFileHandle file,
        StringBuilder path,
        uint pathLength,
        uint flags);

    public static string Resolve(string path)
    {
        using (var handle = CreateFile(
            path,
            0,
            ShareRead | ShareWrite | ShareDelete,
            IntPtr.Zero,
            OpenExisting,
            FileFlagBackupSemantics,
            IntPtr.Zero))
        {
            if (handle.IsInvalid)
            {
                throw new Win32Exception(Marshal.GetLastWin32Error());
            }

            var buffer = new StringBuilder(32768);
            var length = GetFinalPathNameByHandle(handle, buffer, (uint)buffer.Capacity, 0);
            if (length == 0 || length >= buffer.Capacity)
            {
                throw new Win32Exception(Marshal.GetLastWin32Error());
            }

            var resolved = buffer.ToString();
            if (resolved.StartsWith(@"\\?\UNC\", StringComparison.OrdinalIgnoreCase))
            {
                return @"\\" + resolved.Substring(8);
            }
            if (resolved.StartsWith(@"\\?\", StringComparison.OrdinalIgnoreCase))
            {
                return resolved.Substring(4);
            }
            return resolved;
        }
    }
}
'@
    }

    return ([OpenSlottingNativePath]::Resolve($fullPath)).TrimEnd('\')
}

function Assert-OpenSlottingLocalhostWindows {
    if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
        throw 'The combined OpenSlotting localhost launcher is supported only on Windows.'
    }
}

function Get-OpenSlottingLocalhostUrl {
    [CmdletBinding()]
    param()

    return "http://127.0.0.1:$script:LocalhostPort/index.html"
}

function Get-OpenSlottingLocalhostHealth {
    [CmdletBinding()]
    param()

    $healthUrl = "http://127.0.0.1:$script:LocalhostPort/health"
    try {
        $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop
        if ($response.StatusCode -ne 200) {
            return $null
        }
        return ($response.Content | ConvertFrom-Json -ErrorAction Stop)
    } catch {
        return $null
    }
}

function Assert-OpenSlottingLocalhostHealth {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [object]$Health,

        [Parameter(Mandatory = $true)]
        [string]$ApplicationRoot
    )

    $requiredProperties = @('application', 'server', 'version', 'pid', 'applicationRoot')
    foreach ($propertyName in $requiredProperties) {
        if ($null -eq $Health.PSObject.Properties[$propertyName]) {
            throw "Port $script:LocalhostPort answered without a valid OpenSlotting identity."
        }
    }
    if ($Health.application -ne 'OpenSlotting' -or
        $Health.server -ne 'experimental-python' -or
        [int]$Health.version -ne 1) {
        throw "Port $script:LocalhostPort is occupied by another application."
    }

    $expectedRoot = Get-OpenSlottingCanonicalPath -Path $ApplicationRoot
    $actualRoot = Get-OpenSlottingCanonicalPath -Path ([string]$Health.applicationRoot)
    if (-not $actualRoot.Equals($expectedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Another OpenSlotting folder is already running on port ${script:LocalhostPort}: $actualRoot"
    }
}

function Find-OpenSlottingPythonCommand {
    [CmdletBinding()]
    param()

    $candidates = @(
        [pscustomobject]@{ Name = 'py.exe'; Prefix = @('-3') },
        [pscustomobject]@{ Name = 'python.exe'; Prefix = @() }
    )
    foreach ($candidate in $candidates) {
        $command = Get-Command $candidate.Name -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($null -eq $command -or [string]::IsNullOrWhiteSpace($command.Source)) {
            continue
        }
        if ($command.Source -match '[\\/]WindowsApps[\\/]python(?:3)?\.exe$') {
            continue
        }

        & $command.Source @($candidate.Prefix) -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 8) else 1)' 2>$null
        if ($LASTEXITCODE -eq 0) {
            return [pscustomobject]@{
                FilePath = [System.IO.Path]::GetFullPath($command.Source)
                Prefix = @($candidate.Prefix)
            }
        }
    }

    throw 'Python 3.8 or newer was not found. Install Python once or use the independent file:/// launcher.'
}

function Start-OpenSlottingLocalhostServer {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ApplicationRoot
    )

    Assert-OpenSlottingLocalhostWindows
    $resolvedRoot = [System.IO.Path]::GetFullPath($ApplicationRoot)
    $serverScript = Join-Path $resolvedRoot 'Start-OpenSlotting-Localhost.py'
    if (-not (Test-Path -LiteralPath $serverScript -PathType Leaf)) {
        throw "The localhost server script is missing: $serverScript"
    }

    $health = Get-OpenSlottingLocalhostHealth
    if ($null -ne $health) {
        Assert-OpenSlottingLocalhostHealth -Health $health -ApplicationRoot $resolvedRoot
        Assert-OpenSlottingLocalhostProcess -Health $health -ApplicationRoot $resolvedRoot | Out-Null
        return [pscustomobject]@{ Started = $false; ProcessId = [int]$health.pid }
    }

    $python = Find-OpenSlottingPythonCommand
    $arguments = @($python.Prefix) + @(
        ('"{0}"' -f $serverScript),
        '--port',
        [string]$script:LocalhostPort,
        '--no-browser'
    )
    $process = Start-Process -FilePath $python.FilePath -ArgumentList $arguments -WorkingDirectory $resolvedRoot -WindowStyle Hidden -PassThru

    $deadline = [DateTime]::UtcNow.AddSeconds(10)
    do {
        Start-Sleep -Milliseconds 100
        if ($process.HasExited) {
            throw "The OpenSlotting localhost server could not start. Port $script:LocalhostPort may already be occupied."
        }
        $health = Get-OpenSlottingLocalhostHealth
        if ($null -ne $health) {
            Assert-OpenSlottingLocalhostHealth -Health $health -ApplicationRoot $resolvedRoot
            return [pscustomobject]@{ Started = $true; ProcessId = [int]$health.pid }
        }
    } while ([DateTime]::UtcNow -lt $deadline)

    if (-not $process.HasExited) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
    throw 'The OpenSlotting localhost server did not become ready within 10 seconds.'
}

function Assert-OpenSlottingLocalhostProcess {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [object]$Health,

        [Parameter(Mandatory = $true)]
        [string]$ApplicationRoot
    )

    $serverProcessId = [int]$Health.pid
    $serverScript = Get-OpenSlottingCanonicalPath -Path (Join-Path $ApplicationRoot 'Start-OpenSlotting-Localhost.py')
    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $serverProcessId" -ErrorAction Stop
    if ($null -eq $processInfo) {
        throw 'The process answering on the OpenSlotting port could not be verified.'
    }
    $commandLine = [string]$processInfo.CommandLine
    $scriptMatch = [regex]::Match($commandLine, '(?i)"(?<quoted>[^"]*Start-OpenSlotting-Localhost\.py)"|(?<bare>[^\s]*Start-OpenSlotting-Localhost\.py)')
    $commandLineScript = if ($scriptMatch.Groups['quoted'].Success) {
        $scriptMatch.Groups['quoted'].Value
    } elseif ($scriptMatch.Groups['bare'].Success) {
        $scriptMatch.Groups['bare'].Value
    } else {
        $null
    }
    $commandLineRootMatches = $false
    if (-not [string]::IsNullOrWhiteSpace($commandLineScript)) {
        try {
            $commandLineRootMatches = (Get-OpenSlottingCanonicalPath -Path $commandLineScript).Equals($serverScript, [System.StringComparison]::OrdinalIgnoreCase)
        } catch {
            $commandLineRootMatches = $false
        }
    }
    if ([string]::IsNullOrWhiteSpace($commandLine) -or
        -not $commandLineRootMatches) {
        throw 'The process answering on the OpenSlotting port could not be verified.'
    }

    return $processInfo
}

function Start-OpenSlottingLocalhostApp {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ApplicationRoot
    )

    $resolvedRoot = [System.IO.Path]::GetFullPath($ApplicationRoot)
    Import-Module (Join-Path $resolvedRoot 'OpenSlotting.Windows.psm1') -Force
    $edgePath = Find-OpenSlottingEdgePath
    $url = Get-OpenSlottingLocalhostUrl
    $serverStarted = $false
    try {
        $serverResult = Start-OpenSlottingLocalhostServer -ApplicationRoot $resolvedRoot
        $serverStarted = [bool]$serverResult.Started
        Start-Process -FilePath $edgePath -ArgumentList ('--app="{0}"' -f $url) -WorkingDirectory $resolvedRoot
    } catch {
        if ($serverStarted) {
            try {
                Stop-OpenSlottingLocalhostServer -ApplicationRoot $resolvedRoot | Out-Null
            } catch {
                # Preserve the browser-start failure while leaving a safe manual stop path.
            }
        }
        throw
    }
}

function Stop-OpenSlottingLocalhostServer {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ApplicationRoot
    )

    Assert-OpenSlottingLocalhostWindows
    $resolvedRoot = [System.IO.Path]::GetFullPath($ApplicationRoot)
    $health = Get-OpenSlottingLocalhostHealth
    if ($null -eq $health) {
        return $false
    }
    Assert-OpenSlottingLocalhostHealth -Health $health -ApplicationRoot $resolvedRoot

    Assert-OpenSlottingLocalhostProcess -Health $health -ApplicationRoot $resolvedRoot | Out-Null
    $serverProcessId = [int]$health.pid
    Stop-Process -Id $serverProcessId -Force -ErrorAction Stop
    return $true
}

function Get-OpenSlottingLocalhostShortcutPlan {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ApplicationRoot,

        [Parameter(Mandatory = $true)]
        [string[]]$ShortcutDirectories,

        [string]$PowerShellPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
    )

    $resolvedRoot = [System.IO.Path]::GetFullPath($ApplicationRoot)
    $startScript = [System.IO.Path]::GetFullPath((Join-Path $resolvedRoot 'Start-OpenSlotting-Localhost.ps1'))
    $resolvedPowerShell = [System.IO.Path]::GetFullPath($PowerShellPath)
    if (-not (Test-Path -LiteralPath $startScript -PathType Leaf)) {
        throw "The combined localhost launcher is missing: $startScript"
    }
    if (-not (Test-Path -LiteralPath $resolvedPowerShell -PathType Leaf)) {
        throw "Windows PowerShell was not found: $resolvedPowerShell"
    }

    $iconPath = Join-Path $resolvedRoot 'OpenSlotting.ico'
    $iconLocation = if (Test-Path -LiteralPath $iconPath -PathType Leaf) {
        "$iconPath,0"
    } else {
        "$resolvedPowerShell,0"
    }
    $arguments = '-NoLogo -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}"' -f $startScript

    return @($ShortcutDirectories | ForEach-Object {
        [pscustomobject]@{
            ShortcutPath = Join-Path ([System.IO.Path]::GetFullPath($_)) "$script:ShortcutName.lnk"
            TargetPath = $resolvedPowerShell
            Arguments = $arguments
            WorkingDirectory = $resolvedRoot
            IconLocation = $iconLocation
            Description = $script:ShortcutDescription
        }
    })
}

function Remove-OpenSlottingLocalhostShortcuts {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$ShortcutDirectories
    )

    Assert-OpenSlottingLocalhostWindows
    $shell = New-Object -ComObject WScript.Shell
    $removed = @()
    $skipped = @()
    foreach ($directory in $ShortcutDirectories) {
        $shortcutPath = Join-Path ([System.IO.Path]::GetFullPath($directory)) "$script:ShortcutName.lnk"
        if (-not (Test-Path -LiteralPath $shortcutPath -PathType Leaf)) {
            continue
        }
        $shortcut = $shell.CreateShortcut($shortcutPath)
        if ($shortcut.Description -ne $script:ShortcutDescription) {
            $skipped += $shortcutPath
            continue
        }
        Remove-Item -LiteralPath $shortcutPath -Force
        $removed += $shortcutPath
    }

    return [pscustomobject]@{ Removed = $removed; Skipped = $skipped }
}

Export-ModuleMember -Function @(
    'Assert-OpenSlottingLocalhostHealth',
    'Find-OpenSlottingPythonCommand',
    'Get-OpenSlottingLocalhostHealth',
    'Get-OpenSlottingLocalhostShortcutPlan',
    'Get-OpenSlottingLocalhostUrl',
    'Remove-OpenSlottingLocalhostShortcuts',
    'Start-OpenSlottingLocalhostApp',
    'Start-OpenSlottingLocalhostServer',
    'Stop-OpenSlottingLocalhostServer'
)
