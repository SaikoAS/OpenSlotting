$ErrorActionPreference = 'Stop'
$global:OpenSlottingWalkLauncherTestResult = $null
function Import-Module { param($Name, [switch]$Force) }
function Find-OpenSlottingEdgePath { return 'C:\Approved Edge\msedge.exe' }
function Start-Process {
    param($FilePath, $ArgumentList, $WorkingDirectory, $WindowStyle)
    $global:OpenSlottingWalkLauncherTestResult = @{ File = $FilePath; Arguments = $ArgumentList; Root = $WorkingDirectory; Style = $WindowStyle }
}
$testLauncher = Join-Path (Split-Path -Parent $PSScriptRoot) 'Start-OpenSlotting-WalkWindow.ps1'
$testSession = 'a' * 64
& $testLauncher -Port 8765 -Session $testSession
if ($global:OpenSlottingWalkLauncherTestResult.File -ne 'C:\Approved Edge\msedge.exe') { throw 'Unexpected executable' }
if ($global:OpenSlottingWalkLauncherTestResult.Arguments -ne ('--app="http://127.0.0.1:8765/warehouse-walk-window.html#{0}" --start-maximized' -f $testSession)) { throw 'Unexpected arguments' }
if ($global:OpenSlottingWalkLauncherTestResult.Style -ne 'Maximized') { throw 'Walk app window must be visible and maximized' }
if ($global:OpenSlottingWalkLauncherTestResult.Root -ne (Split-Path -Parent $PSScriptRoot)) { throw 'Unexpected working directory' }
foreach ($invalidSession in @('x', ('a' * 63), ('a' * 64 + "`n"), ('a' * 64 + ' --app=evil'), 'https://remote.invalid/')) {
    $global:OpenSlottingWalkLauncherTestResult = $null
    try { & $testLauncher -Port 8765 -Session $invalidSession } catch { }
    if ($null -ne $global:OpenSlottingWalkLauncherTestResult) { throw 'Invalid session reached Start-Process' }
}
foreach ($invalidPort in @(0, -1, 65536)) {
    $global:OpenSlottingWalkLauncherTestResult = $null
    try { & $testLauncher -Port $invalidPort -Session $testSession } catch { }
    if ($null -ne $global:OpenSlottingWalkLauncherTestResult) { throw 'Invalid port reached Start-Process' }
}
Write-Host 'Walk window launcher logic tests passed.'

Remove-Variable -Name OpenSlottingWalkLauncherTestResult -Scope Global
