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
Import-Module (Join-Path $repositoryRoot 'OpenSlotting.Localhost.Windows.psm1') -Force
$moduleSource = Get-Content -LiteralPath (Join-Path $repositoryRoot 'OpenSlotting.Localhost.Windows.psm1') -Raw
$appFunctionSource = [regex]::Match($moduleSource, 'function Start-OpenSlottingLocalhostApp \{([\s\S]*?)\n\}').Groups[1].Value
if ([string]::IsNullOrWhiteSpace($appFunctionSource)) {
    throw 'The combined app launcher function could not be inspected.'
}
Assert-True ($appFunctionSource.IndexOf('$edgePath = Find-OpenSlottingEdgePath', [System.StringComparison]::Ordinal) -lt
    $appFunctionSource.IndexOf('Start-OpenSlottingLocalhostServer', [System.StringComparison]::Ordinal)) 'Edge must be resolved before a background server is started.'
Assert-True ($moduleSource -notmatch '\$processId\b') 'The stop path must not use a variable that aliases PowerShell automatic variable $PID.'
$serverFunctionSource = [regex]::Match($moduleSource, 'function Start-OpenSlottingLocalhostServer \{([\s\S]*?)\n\}').Groups[1].Value
Assert-True ($serverFunctionSource.Contains('Assert-OpenSlottingLocalhostProcess -Health $health')) 'An existing server must be verified by PID and command line before reuse.'
Assert-True ($serverFunctionSource.Contains('Test-OpenSlottingLocalhostProcessOwnership -ServerProcessId')) 'A newly started server must be tied to the launching process before cleanup ownership is recorded.'
Assert-True ($serverFunctionSource.IndexOf('Assert-OpenSlottingLocalhostProcess -Health $health', [System.StringComparison]::Ordinal) -lt
    $serverFunctionSource.IndexOf('Assert-OpenSlottingLocalhostHealth -Health $health', [System.StringComparison]::Ordinal)) 'The responder process must be verified before its advertised root is canonicalized.'
Assert-True ($moduleSource.Contains('Get-NetTCPConnection -LocalAddress')) 'The responder PID must be tied to the listening loopback socket.'
Assert-True ($moduleSource.Contains('Join-Path $ApplicationRoot $scriptArgument')) 'Relative server script arguments must resolve against the application root.'
$pythonFunctionSource = [regex]::Match($moduleSource, 'function Find-OpenSlottingPythonCommand \{([\s\S]*?)\n\}').Groups[1].Value
Assert-True ($pythonFunctionSource.Contains('Get-Command $candidate.Name -All')) 'All Python command candidates must be probed, including WindowsApps aliases.'
$postStartStopCount = ([regex]::Matches($serverFunctionSource, 'Stop-Process -Id \$process\.Id')).Count
Assert-True ($postStartStopCount -ge 2) 'A server created by this invocation must be stopped when post-start verification fails.'
Assert-True ($serverFunctionSource.Contains('Stop-Process -Id $healthProcessId')) 'A verified descendant server process must also be stopped during startup cleanup.'

$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('OpenSlotting Localhost Launcher Tests ' + [guid]::NewGuid().ToString('N'))
[System.IO.Directory]::CreateDirectory($testRoot) | Out-Null

try {
    $startScript = Join-Path $testRoot 'Start-OpenSlotting-Localhost.ps1'
    $powerShellPath = Join-Path $testRoot 'powershell.exe'
    $iconPath = Join-Path $testRoot 'OpenSlotting.ico'
    $anotherRoot = Join-Path $testRoot 'another-copy'
    Set-Content -LiteralPath $startScript -Value '# synthetic launcher' -Encoding UTF8
    Set-Content -LiteralPath $powerShellPath -Value 'synthetic PowerShell' -Encoding UTF8
    Set-Content -LiteralPath $iconPath -Value 'synthetic icon' -Encoding UTF8
    New-Item -ItemType Directory -Path $anotherRoot | Out-Null

    Assert-Equal (Get-OpenSlottingLocalhostUrl) 'http://127.0.0.1:8765/index.html' 'The combined launcher URL must remain stable.'

    $health = [pscustomobject]@{
        application = 'OpenSlotting'
        server = 'experimental-python'
        version = 1
        pid = 1234
        applicationRoot = $testRoot
    }
    Assert-OpenSlottingLocalhostHealth -Health $health -ApplicationRoot $testRoot

    $wrongRootBlocked = $false
    try {
        Assert-OpenSlottingLocalhostHealth -Health $health -ApplicationRoot $anotherRoot
    } catch {
        $wrongRootBlocked = $_.Exception.Message -match 'Another OpenSlotting folder'
    }
    Assert-True $wrongRootBlocked 'A server from another extracted copy must be rejected.'

    $shortcutDirectories = @((Join-Path $testRoot 'Start Menu'), (Join-Path $testRoot 'Desktop'))
    $plan = @(Get-OpenSlottingLocalhostShortcutPlan -ApplicationRoot $testRoot -ShortcutDirectories $shortcutDirectories -PowerShellPath $powerShellPath)
    Assert-Equal $plan.Count 2 'The plan must include every selected shortcut destination.'
    Assert-Equal ([System.IO.Path]::GetFileName($plan[0].ShortcutPath)) 'OpenSlotting Localhost.lnk' 'The localhost shortcut must have a distinct stable name.'
    Assert-Equal $plan[0].TargetPath ([System.IO.Path]::GetFullPath($powerShellPath)) 'The shortcut must target the existing Windows PowerShell runtime.'
    Assert-True ($plan[0].Arguments -match '-WindowStyle Hidden') 'The combined launcher must not leave a console window open.'
    Assert-True ($plan[0].Arguments.Contains([System.IO.Path]::GetFullPath($startScript))) 'The shortcut must launch the script beside this OpenSlotting copy.'
    Assert-Equal $plan[0].IconLocation ("$([System.IO.Path]::GetFullPath($iconPath)),0") 'The OpenSlotting icon must be used when available.'
    Assert-True ($plan[0].Description -match 'localhost shortcut managed by OpenSlotting') 'The shortcut needs a distinct ownership marker.'

    if ([Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT) {
        $created = @(New-OpenSlottingShortcuts -Plan $plan)
        Assert-Equal $created.Count 2 'Both planned localhost shortcuts must be created.'

        $shell = New-Object -ComObject WScript.Shell
        $createdShortcut = $shell.CreateShortcut($plan[0].ShortcutPath)
        Assert-Equal $createdShortcut.TargetPath ([System.IO.Path]::GetFullPath($powerShellPath)) 'The saved shortcut must retain its target.'
        Assert-Equal $createdShortcut.Description $plan[0].Description 'The saved shortcut must retain its ownership marker.'

        $foreignShortcut = $shell.CreateShortcut($plan[1].ShortcutPath)
        $foreignShortcut.Description = 'Synthetic unrelated localhost shortcut'
        $foreignShortcut.Save()

        $removal = Remove-OpenSlottingLocalhostShortcuts -ShortcutDirectories $shortcutDirectories
        Assert-Equal $removal.Removed.Count 1 'Removal must delete the managed localhost shortcut.'
        Assert-Equal $removal.Skipped.Count 1 'Removal must preserve an unmanaged same-named shortcut.'
        Assert-True (-not (Test-Path -LiteralPath $plan[0].ShortcutPath)) 'The managed localhost shortcut must be gone.'
        Assert-True (Test-Path -LiteralPath $plan[1].ShortcutPath -PathType Leaf) 'The unmanaged localhost shortcut must remain.'
    }

    Write-Output 'Localhost Windows launcher logic tests passed.'
} finally {
    $resolvedTestRoot = [System.IO.Path]::GetFullPath($testRoot)
    $resolvedTempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    if ($resolvedTestRoot.StartsWith($resolvedTempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
        [System.IO.Path]::GetFileName($resolvedTestRoot).StartsWith('OpenSlotting Localhost Launcher Tests ', [System.StringComparison]::Ordinal)) {
        Remove-Item -LiteralPath $resolvedTestRoot -Recurse -Force
    }
}
