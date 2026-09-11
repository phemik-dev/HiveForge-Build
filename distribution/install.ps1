$ErrorActionPreference = 'Stop'

$repository = if ($env:HIVEFORGE_REPOSITORY) { $env:HIVEFORGE_REPOSITORY } else { 'phemik-dev/HiveForge-Build' }
$tag = if ($env:HIVEFORGE_RELEASE_TAG) { $env:HIVEFORGE_RELEASE_TAG } else { 'latest' }
$target = if ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture -eq 'X64') { 'windows-x64' } else { throw 'HiveForge currently supports Windows x64 only.' }
$base = if ($env:HIVEFORGE_DOWNLOAD_BASE) { $env:HIVEFORGE_DOWNLOAD_BASE.TrimEnd('/') } elseif ($tag -eq 'latest') { "https://github.com/$repository/releases/latest/download" } else { "https://github.com/$repository/releases/download/$tag" }
$archiveName = "hiveforge-harness-$target.zip"
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("hiveforge-install-" + [guid]::NewGuid())

try {
  New-Item -ItemType Directory -Force $temp | Out-Null
  $archive = Join-Path $temp $archiveName
  $checksumFile = "$archive.sha256"
  Invoke-WebRequest "$base/$archiveName" -OutFile $archive
  Invoke-WebRequest "$base/$archiveName.sha256" -OutFile $checksumFile
  $expected = ((Get-Content $checksumFile -Raw).Trim() -split '\s+')[0].ToLowerInvariant()
  $actual = (Get-FileHash $archive -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $expected) { throw "HiveForge archive checksum mismatch (expected $expected, received $actual)." }

  $unpacked = Join-Path $temp 'unpacked'
  New-Item -ItemType Directory -Force $unpacked | Out-Null
  & tar.exe -xf $archive -C $unpacked
  if ($LASTEXITCODE -ne 0) { throw "HiveForge archive extraction failed with exit code $LASTEXITCODE." }
  $manifest = Get-Content (Join-Path $unpacked 'hiveforge\manifest.json') -Raw | ConvertFrom-Json
  if ($manifest.target -ne $target) { throw "HiveForge archive target is $($manifest.target), expected $target." }

  $root = if ($env:HIVEFORGE_INSTALL_ROOT) { $env:HIVEFORGE_INSTALL_ROOT } else { Join-Path $env:LOCALAPPDATA 'HiveForge' }
  $versionDir = Join-Path $root $manifest.version
  $incoming = "$versionDir.incoming"
  Remove-Item $incoming -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force $root | Out-Null
  Move-Item (Join-Path $unpacked 'hiveforge') $incoming
  Remove-Item $versionDir -Recurse -Force -ErrorAction SilentlyContinue
  Move-Item $incoming $versionDir

  $bin = Join-Path $root 'bin'
  New-Item -ItemType Directory -Force $bin | Out-Null
  $shim = Join-Path $bin 'dsh.cmd'
  "@echo off`r`n`"$versionDir\dsh.cmd`" %*`r`n" | Set-Content $shim -NoNewline
  if (-not $env:HIVEFORGE_SKIP_PATH_UPDATE) {
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if (($userPath -split ';') -notcontains $bin) {
      [Environment]::SetEnvironmentVariable('Path', (($userPath.TrimEnd(';') + ';' + $bin).TrimStart(';')), 'User')
    }
  }
  & (Join-Path $versionDir 'dsh.cmd') --version
  Write-Host "HiveForge installed. Open a new terminal, then run: dsh web"
} finally {
  Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue
}
