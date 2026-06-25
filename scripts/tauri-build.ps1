# Build Tauri app on Windows (requires MSVC via Visual Studio Build Tools)
$vcvars = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if (-not (Test-Path $vcvars)) {
  Write-Error "Visual Studio Build Tools not found. Install with C++ workload first."
  exit 1
}

$bundle = $args -contains "--installer"
$noBundle = if ($bundle) { "" } else { "--no-bundle" }

cmd /c "`"$vcvars`" && cd /d `"$PSScriptRoot\..`" && pnpm tauri build $noBundle"
exit $LASTEXITCODE
