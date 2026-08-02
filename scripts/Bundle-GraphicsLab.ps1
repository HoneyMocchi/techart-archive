# graphics-lab 원본 JS를 하나로 묶어 "테크아트 라이브러리.html"의 랩 번들 구간에 주입하는 스크립트입니다.
# 원본(리포 내 graphics-lab 폴더)을 수정한 뒤 이 스크립트를 실행하면 라이브러리에 반영됩니다.
$ErrorActionPreference = "Stop"

$docRoot  = Split-Path -Parent $PSScriptRoot
$srcRoot  = Join-Path $docRoot "graphics-lab"
$htmlPath = Join-Path $docRoot "테크아트 라이브러리.html"

# index.html의 로드 순서 그대로 (전역 스크립트라 순서가 중요합니다)
$files = @(
    "js\sections\registry.js",
    "js\sections\vector.js",
    "js\sections\trig.js",
    "js\sections\dotcross.js",
    "js\sections\transform.js",
    "js\sections\projection.js",
    "js\sections\raster.js",
    "js\sections\texture.js",
    "js\sections\lighting.js",
    "js\sections\gpu.js",
    "js\sections\render.js",
    "js\common\state.js",
    "js\common\app-core.js",
    "js\common\canvas-utils.js",
    "js\common\interaction.js",
    "js\topics\vector.js",
    "js\topics\trig.js",
    "js\topics\dotcross.js",
    "js\topics\transform.js",
    "js\topics\projection.js",
    "js\topics\raster.js",
    "js\topics\texture.js",
    "js\topics\lighting.js",
    "js\topics\gpu.js",
    "js\app.js"
)

$parts = foreach ($f in $files) {
    $p = Join-Path $srcRoot $f
    if (-not (Test-Path $p)) { throw "원본 파일 없음: $p" }
    "/* ===== $f ===== */`n" + [System.IO.File]::ReadAllText($p)
}

# 전역 오염을 막기 위해 IIFE로 감싸고, 라이브러리가 쓰는 API만 노출합니다.
$bundle = "(function () {`n" + ($parts -join "`n`n") + @"


window.GFXLab = { setActive: setActive, render: render, lessons: lessons };
})();
"@

$html = [System.IO.File]::ReadAllText($htmlPath)
$pattern = "(?s)(<!-- LAB_BUNDLE_START -->).*?(<!-- LAB_BUNDLE_END -->)"
if ($html -notmatch $pattern) { throw "LAB_BUNDLE 마커를 HTML에서 찾지 못했습니다." }
$replacement = { param($m) $m.Groups[1].Value + "`n<script id=""labBundle"">`n" + $bundle + "</script>`n" + $m.Groups[2].Value }.GetNewClosure()
$html = [regex]::Replace($html, $pattern, $replacement)

[System.IO.File]::WriteAllText($htmlPath, $html, (New-Object System.Text.UTF8Encoding($false)))
$kb = [math]::Round(($bundle.Length / 1KB), 1)
Write-Host "완료: 랩 번들 $($files.Count)개 파일, ${kb}KB 주입 -> $htmlPath"
