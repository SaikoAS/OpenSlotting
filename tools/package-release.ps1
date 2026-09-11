[CmdletBinding()]
param(
    [string]$OutputDirectory,
    [string]$CandidateCommit = 'HEAD'
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))

function Invoke-GitText {
    param([string[]]$Arguments)

    $commandOutput = & git -C $repositoryRoot @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Git command failed: git $($Arguments -join ' ')`n$($commandOutput -join [Environment]::NewLine)"
    }

    return ($commandOutput -join [Environment]::NewLine).TrimEnd()
}

$resolvedCandidate = Invoke-GitText @('rev-parse', '--verify', "${CandidateCommit}^{commit}")
$versionSource = Invoke-GitText @('show', "${resolvedCandidate}:csv.js")
$versionMatch = [regex]::Match(
    $versionSource,
    "const APP_VERSION = '([0-9]+\.[0-9]+\.[0-9]+)';"
)

if (-not $versionMatch.Success) {
    throw "Could not read APP_VERSION from csv.js at commit $resolvedCandidate."
}

$version = $versionMatch.Groups[1].Value
$packageName = "OpenSlotting-v$version"

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $OutputDirectory = Join-Path $repositoryRoot 'dist'
}

$outputRoot = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($outputRoot) | Out-Null
$archivePath = Join-Path $outputRoot "$packageName.zip"

$releaseFiles = @(
    'index.html',
    'app.css',
    'app.js',
    'encoding.js',
    'csv.js',
    'OpenSlotting.Windows.psm1',
    'Start-OpenSlotting.cmd',
    'Start-OpenSlotting.ps1',
    'Install-OpenSlotting.cmd',
    'Install-OpenSlotting.ps1',
    'Remove-OpenSlotting.cmd',
    'Remove-OpenSlotting.ps1',
    'README.md',
    'LICENSE',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    'SECURITY.md',
    'docs/data-format.md',
    'docs/acceptance-v0.2.md',
    'docs/acceptance-v0.2.1.md'
)

$optionalReleaseFiles = @(
    'OpenSlotting.ico'
)

foreach ($relativePath in $releaseFiles) {
    & git -C $repositoryRoot cat-file -e "${resolvedCandidate}:$relativePath" 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Required release file is missing from commit ${resolvedCandidate}: $relativePath"
    }
}

foreach ($relativePath in $optionalReleaseFiles) {
    & git -C $repositoryRoot cat-file -e "${resolvedCandidate}:$relativePath" 2>$null
    if ($LASTEXITCODE -eq 0) {
        $releaseFiles += $relativePath
    }
}

if (Test-Path -LiteralPath $archivePath -PathType Leaf) {
    Remove-Item -LiteralPath $archivePath
}

$archiveArguments = @(
    'archive',
    '--format=zip',
    "--prefix=$packageName/",
    "--output=$archivePath",
    $resolvedCandidate,
    '--'
) + $releaseFiles

$archiveOutput = & git -C $repositoryRoot @archiveArguments 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "Release archive creation failed for commit $resolvedCandidate.`n$($archiveOutput -join [Environment]::NewLine)"
}

Write-Output "Candidate commit: $resolvedCandidate"
Write-Output "Archive: $archivePath"
