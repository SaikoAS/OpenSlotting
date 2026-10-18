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
$buildPattern = "const APP_BUILD = Object\.freeze\(\{ status: '(development|release)', commit: null \}\);"
$buildMatches = [regex]::Matches($versionSource, $buildPattern)
if ($buildMatches.Count -ne 1) {
    throw "Expected one unstamped APP_BUILD declaration in csv.js at commit $resolvedCandidate."
}
$buildStatus = $buildMatches[0].Groups[1].Value
$packageName = "OpenSlotting-v$version"
$candidateName = "$packageName-$resolvedCandidate"

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $OutputDirectory = Join-Path $repositoryRoot 'dist'
}

$outputRoot = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($outputRoot) | Out-Null
$archivePath = Join-Path $outputRoot "$candidateName.zip"

$releaseFiles = @(
    'index.html',
    'app.css',
    'terminal-theme.css',
    'warehouse-editor.css',
    'runtime.js',
    'app.js',
    'src/application/workspace-preparation.js',
    'src/application/worker-session.js',
    'src/application/import-profile-batch.js',
    'src/ui/import-profile-panel.js',
    'src/ui/coverage-calendar.js',
    'src/ui/shared/windowed-dom.js',
    'src/workers/workspace-worker.mjs',
    'terminal.js',
    'warehouse-webgl.js',
    'warehouse-scene.js',
    'warehouse-editor.js',
    'warehouse-analysis.js',
    'warehouse-walk-model.js',
    'warehouse-walk-renderer.js',
    'warehouse-walk.js',
    'warehouse-walk.css',
    'encoding.js',
    'csv.js',
    'periods.js',
    'warehouse.js',
    'workspace.js',
    'storage.js',
    'docs/warehouse-editor.md',
    'docs/warehouse-walk.md',
    'docs/acceptance-warehouse-workflow.md',
    'OpenSlotting.Windows.psm1',
    'Start-OpenSlotting.cmd',
    'Start-OpenSlotting.ps1',
    'Install-OpenSlotting.cmd',
    'Install-OpenSlotting.ps1',
    'Remove-OpenSlotting.cmd',
    'Remove-OpenSlotting.ps1',
    'Stop-OpenSlotting.cmd',
    'Stop-OpenSlotting.ps1',
    'OpenSlotting.Localhost.Windows.psm1',
    'Start-OpenSlotting-Localhost.cmd',
    'Start-OpenSlotting-Localhost.ps1',
    'Start-OpenSlotting-Localhost.py',
    'Stop-OpenSlotting-Localhost.cmd',
    'Stop-OpenSlotting-Localhost.ps1',
    'Install-OpenSlotting-Localhost.cmd',
    'Install-OpenSlotting-Localhost.ps1',
    'Remove-OpenSlotting-Localhost.cmd',
    'Remove-OpenSlotting-Localhost.ps1',
    'README.md',
    'LICENSE',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    'SECURITY.md',
    'docs/data-format.md',
    'docs/workspace-format.md',
    'docs/period-comparison.md',
    'docs/architecture.md',
    'docs/release-checklist.md',
    'docs/versioning.md',
    'docs/performance/README.md',
    'docs/performance/workspace-ui.md',
    'docs/performance/terminal-search.md',
    'docs/performance/period-index.md',
    'docs/performance/warehouse.md',
    'docs/performance/warehouse-layout-v2.md',
    'docs/performance/results/terminal-search.json',
    'docs/performance/results/period-index.json',
    'docs/performance/results/warehouse.json',
    'docs/performance/results/warehouse-memory.json',
    'docs/performance/results/warehouse-layout-v2.json',
    'docs/performance/results/warehouse-memory-layout-v2.json',
    'docs/performance/results/warehouse-scopes-layout-v2.json',
    'docs/performance/results/browser-worker-edge.json',
    'docs/performance/results/browser-worker-edge.png',
    'docs/large-imports.md',
    'docs/search-performance.md',
    'docs/project-structure-plan.md',
    'docs/portable-mode-paused.md',
    'docs/runtime.md',
    'docs/localhost-start.md',
    'docs/acceptance-localhost.md',
    'docs/acceptance-workspaces.md',
    'docs/acceptance-period-comparison.md',
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
    # Missing optional files are normal. Avoid native stderr here: Windows
    # PowerShell 5.1 turns it into a terminating error under Stop, even redirected.
    $optionalPath = Invoke-GitText @('ls-tree', '--name-only', $resolvedCandidate, '--', $relativePath)
    if ($optionalPath -eq $relativePath) {
        $releaseFiles += $relativePath
    }
}

# Stage on the same filesystem. Validate any existing acceptance record
# before touching its archive or manifest, including compression-runtime changes.
$stagingRoot = Join-Path $outputRoot ('.package-' + [guid]::NewGuid().ToString('N'))
[System.IO.Directory]::CreateDirectory($stagingRoot) | Out-Null
$stagedArchivePath = Join-Path $stagingRoot "$candidateName.zip"
$stagedManifestPath = Join-Path $stagingRoot "$candidateName.candidate.json"
$stagedRecordPath = Join-Path $stagingRoot "$candidateName.acceptance.md"
$removeStaging = $true
try {
    $archiveArguments = @(
        'archive',
        '--format=zip',
        "--prefix=$packageName/",
        "--output=$stagedArchivePath",
        $resolvedCandidate,
        '--'
    ) + $releaseFiles

    $archiveOutput = & git -C $repositoryRoot @archiveArguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Release archive creation failed for commit $resolvedCandidate.`n$($archiveOutput -join [Environment]::NewLine)"
    }

    # Stamp the archived candidate, never the working tree. All other entries remain
    # from git archive. The committed status is explicit; packaging does not release it.
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::Open($stagedArchivePath, [System.IO.Compression.ZipArchiveMode]::Update)
    try {
        $entryName = "$packageName/csv.js"
        $entry = $archive.GetEntry($entryName)
        $entryTimestamp = $entry.LastWriteTime
        $reader = [System.IO.StreamReader]::new($entry.Open(), [System.Text.Encoding]::UTF8)
        try { $csvSource = $reader.ReadToEnd() } finally { $reader.Dispose() }
        $stampedSource = [regex]::Replace($csvSource, $buildPattern,
            "const APP_BUILD = Object.freeze({ status: '$buildStatus', commit: '$resolvedCandidate' });")
        $entry.Delete()
        $stampedEntry = $archive.CreateEntry($entryName)
        $stampedEntry.LastWriteTime = $entryTimestamp
        $writer = [System.IO.StreamWriter]::new($stampedEntry.Open(), [System.Text.UTF8Encoding]::new($false))
        try { $writer.Write($stampedSource) } finally { $writer.Dispose() }
    } finally { $archive.Dispose() }

    $archiveHash = (Get-FileHash -LiteralPath $stagedArchivePath -Algorithm SHA256).Hash.ToLowerInvariant()
    $manifestPath = Join-Path $outputRoot "$candidateName.candidate.json"
    $manifest = [ordered]@{
        candidateCommit = $resolvedCandidate
        productVersion = $version
        buildStatus = $buildStatus
        archive = [System.IO.Path]::GetFileName($archivePath)
        archiveSha256 = $archiveHash
    }
    $utf8 = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($stagedManifestPath, ($manifest | ConvertTo-Json), $utf8)

    # A fresh result/evidence row for every current checklist item. Historical
    # evidence is deliberately excluded. No automatic or manual pass is inferred.
    $record = [System.Collections.Generic.List[string]]::new()
    $record.Add('# Candidate acceptance record')
    $record.Add('')
    $record.Add("Candidate commit: $resolvedCandidate")
    $record.Add("Product version: $version; build status: $buildStatus")
    $record.Add("Archive: $([System.IO.Path]::GetFileName($archivePath))")
    $record.Add("Archive SHA-256: $archiveHash")
    $record.Add('')
    $record.Add('| Environment | Value |')
    $record.Add('| --- | --- |')
    foreach ($field in @('Extracted folder', 'Windows version', 'Edge version and profile', 'Python version and path', 'Tester and date')) {
        $record.Add("| $field | NOT RECORDED |")
    }
    $record.Add('')
    $record.Add('Decision: PENDING — native Windows/Edge acceptance has not been recorded.')
    $record.Add('Use only fully synthetic fixtures and evidence. Record PASS, FAIL, or NOT RUN for every row, with an evidence reference and any blocker. Every result must refer to this commit and ZIP checksum. A changed candidate requires a new record; do not reuse historical results.')

    foreach ($checklist in @('docs/acceptance-localhost.md', 'docs/acceptance-workspaces.md', 'docs/acceptance-period-comparison.md', 'docs/acceptance-warehouse-workflow.md')) {
        $source = Invoke-GitText @('show', "${resolvedCandidate}:$checklist")
        $record.Add('')
        $record.Add("## $checklist")
        $record.Add('')
        $record.Add('| Check | Result | Synthetic evidence / blocker |')
        $record.Add('| --- | --- | --- |')
        $warehouseSection = $false
        $task = ''
        foreach ($line in ($source -split '\r?\n')) {
            if ($line -match '^## ') {
                $warehouseSection = $line -eq '## Required manual checks in the current localhost runtime'
            }
            $isTask = $line -match '^(?:-|\d+\.) \[ \] (.+)$'
            if (-not $isTask -and $warehouseSection) { $isTask = $line -match '^\d+\. (.+)$' }
            if ($isTask) {
                if ($task) { $record.Add("| $($task.Replace('|', '\|')) | NOT RUN | |") }
                $task = $Matches[1]
            } elseif ($task -and $line -match '^\s+\S') {
                $task += ' ' + $line.Trim()
            } elseif ($task) {
                $record.Add("| $($task.Replace('|', '\|')) | NOT RUN | |")
                $task = ''
            }
        }
        if ($task) { $record.Add("| $($task.Replace('|', '\|')) | NOT RUN | |") }
    }
    $recordPath = Join-Path $outputRoot "$candidateName.acceptance.md"
    if (Test-Path -LiteralPath $recordPath) {
        $existingRecord = [System.IO.File]::ReadAllText($recordPath)
        # Only the single metadata header binds the record to its archive.
        # Matching hashes in evidence notes cannot override missing/stale headers.
        $checksumHeaders = [regex]::Matches($existingRecord, '(?m)^Archive SHA-256:([^\r\n]*)\r?$')
        if ($checksumHeaders.Count -ne 1) {
            throw 'Existing acceptance record must contain exactly one Archive SHA-256 header. Use a new output directory for a fresh acceptance run.'
        }
        $recordedHash = $checksumHeaders[0].Groups[1].Value.Trim()
        if (-not [string]::Equals($recordedHash, $archiveHash, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw 'Existing acceptance record has a different ZIP checksum. Use a new output directory for a fresh acceptance run.'
        }
    } else {
        [System.IO.File]::WriteAllText($stagedRecordPath, ($record -join [Environment]::NewLine) + [Environment]::NewLine, $utf8)
    }

    # Each replacement is atomic on the output filesystem. Roll back prior
    # replacements if a later file cannot be published, retaining the evidence set.
    $artifacts = @(
        @{ Source = $stagedArchivePath; Destination = $archivePath; Backup = $null },
        @{ Source = $stagedManifestPath; Destination = $manifestPath; Backup = $null }
    )
    if (Test-Path -LiteralPath $stagedRecordPath) {
        $artifacts += @{ Source = $stagedRecordPath; Destination = $recordPath; Backup = $null }
    }
    $published = [System.Collections.Generic.List[object]]::new()
    try {
        foreach ($artifact in $artifacts) {
            if (Test-Path -LiteralPath $artifact.Destination) {
                $artifact.Backup = Join-Path $stagingRoot ([System.IO.Path]::GetFileName($artifact.Destination) + '.previous')
                [System.IO.File]::Replace($artifact.Source, $artifact.Destination, $artifact.Backup)
            } else {
                [System.IO.File]::Move($artifact.Source, $artifact.Destination)
            }
            $published.Add($artifact)
        }
    } catch {
        $publicationFailure = $_
        try {
            for ($index = $published.Count - 1; $index -ge 0; $index--) {
                $artifact = $published[$index]
                if ($artifact.Backup) {
                    [System.IO.File]::Replace($artifact.Backup, $artifact.Destination, [NullString]::Value)
                } else {
                    [System.IO.File]::Delete($artifact.Destination)
                }
            }
        } catch {
            $removeStaging = $false
            throw "Package publication and rollback failed. Recovery files remain in ${stagingRoot}: $_"
        }
        throw $publicationFailure
    }
} finally {
    if ($removeStaging) { Remove-Item -LiteralPath $stagingRoot -Recurse -Force }
}

Write-Output "Candidate commit: $resolvedCandidate"
Write-Output "Build status: $buildStatus"
Write-Output "Archive: $archivePath"
Write-Output "Archive SHA-256: $archiveHash"
Write-Output "Candidate manifest: $manifestPath"
Write-Output "Pending acceptance record: $recordPath"
