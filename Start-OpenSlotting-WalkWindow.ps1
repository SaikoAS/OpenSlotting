[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateRange(1, 65535)]
    [int]$Port,
    [Parameter(Mandatory = $true)]
    [ValidatePattern('\A[a-f0-9]{64}\z')]
    [string]$Session
)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'OpenSlotting.Windows.psm1') -Force
$edgePath = Find-OpenSlottingEdgePath
$viewerUrl = 'http://127.0.0.1:{0}/warehouse-walk-window.html#{1}' -f $Port, $Session
Start-Process -FilePath $edgePath -ArgumentList ('--app="{0}" --start-maximized' -f $viewerUrl) -WorkingDirectory $PSScriptRoot -WindowStyle Maximized
