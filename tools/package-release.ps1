[CmdletBinding()]
param(
    [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$versionSource = Join-Path $repositoryRoot 'csv.js'
$versionMatch = [regex]::Match(
    [System.IO.File]::ReadAllText($versionSource),
    "const APP_VERSION = '([0-9]+\.[0-9]+\.[0-9]+)';"
)

if (-not $versionMatch.Success) {
    throw 'Could not read APP_VERSION from csv.js.'
}

$version = $versionMatch.Groups[1].Value
$packageName = "OpenSlotting-v$version"

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $OutputDirectory = Join-Path $repositoryRoot 'dist'
}

$outputRoot = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($outputRoot) | Out-Null
$archivePath = Join-Path $outputRoot "$packageName.zip"

$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("openslotting-release-" + [guid]::NewGuid().ToString('N'))
$packageRoot = Join-Path $temporaryRoot $packageName

$releaseFiles = @(
    'index.html',
    'app.css',
    'app.js',
    'csv.js',
    'README.md',
    'LICENSE',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    'SECURITY.md',
    'docs\data-format.md'
)

try {
    [System.IO.Directory]::CreateDirectory($packageRoot) | Out-Null

    foreach ($relativePath in $releaseFiles) {
        $sourcePath = Join-Path $repositoryRoot $relativePath
        if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
            throw "Required release file is missing: $relativePath"
        }

        $destinationPath = Join-Path $packageRoot $relativePath
        [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($destinationPath)) | Out-Null
        Copy-Item -LiteralPath $sourcePath -Destination $destinationPath
    }

    if (Test-Path -LiteralPath $archivePath -PathType Leaf) {
        Remove-Item -LiteralPath $archivePath
    }

    Compress-Archive -LiteralPath $packageRoot -DestinationPath $archivePath -CompressionLevel Optimal
    Write-Output $archivePath
}
finally {
    if (Test-Path -LiteralPath $temporaryRoot -PathType Container) {
        $resolvedTemporaryRoot = [System.IO.Path]::GetFullPath($temporaryRoot)
        $systemTemporaryRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
        if (-not $resolvedTemporaryRoot.StartsWith($systemTemporaryRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to remove an unexpected temporary path: $resolvedTemporaryRoot"
        }
        Remove-Item -LiteralPath $resolvedTemporaryRoot -Recurse -Force
    }
}
