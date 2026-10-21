# graphics-lab 원본(JS·CSS)을 묶어 "테크아트 라이브러리.html"에 주입하는 스크립트입니다.
# 원본(리포 내 graphics-lab 폴더)을 수정한 뒤 이 스크립트를 실행하면 라이브러리에 반영됩니다.
$ErrorActionPreference = "Stop"

$docRoot  = Split-Path -Parent $PSScriptRoot
$srcRoot  = Join-Path $docRoot "graphics-lab"
$htmlPath = Join-Path $docRoot "테크아트 라이브러리.html"

# 로드 순서: core → lessons(파일 이름 = 번호 순) → app. 전역 스크립트라 순서가 중요합니다.
$files = @("js\core\format.js", "js\core\fig.js", "js\core\meta.js", "js\core\lab.js")
$files += Get-ChildItem (Join-Path $srcRoot "js\lessons") -Filter *.js | Sort-Object Name | ForEach-Object { "js\lessons\" + $_.Name }
$files += "js\app.js"

$parts = foreach ($f in $files) {
    $p = Join-Path $srcRoot $f
    if (-not (Test-Path $p)) { throw "원본 파일 없음: $p" }
    "/* ===== $f ===== */`n" + [System.IO.File]::ReadAllText($p)
}

# 전역 오염을 막기 위해 IIFE로 감쌉니다. 라이브러리가 쓰는 window.GFXLab은 app.js가 만듭니다.
$bundle = "(function () {`n" + ($parts -join "`n`n") + "`n})();`n"
$css = [System.IO.File]::ReadAllText((Join-Path $srcRoot "styles\app.css"))

$html = [System.IO.File]::ReadAllText($htmlPath)
$jsPattern = "(?s)(<!-- LAB_BUNDLE_START -->).*?(<!-- LAB_BUNDLE_END -->)"
$cssPattern = "(?s)(/\* LAB_STYLE_START \*/).*?(/\* LAB_STYLE_END \*/)"
if ($html -notmatch $jsPattern) { throw "LAB_BUNDLE 마커를 HTML에서 찾지 못했습니다." }
if ($html -notmatch $cssPattern) { throw "LAB_STYLE 마커를 HTML에서 찾지 못했습니다." }
# MatchEvaluator를 써서 원본 안의 '$' 문자가 치환 패턴으로 해석되지 않게 합니다.
$html = [regex]::Replace($html, $jsPattern, { param($m) $m.Groups[1].Value + "`n<script id=""labBundle"">`n" + $bundle + "</script>`n" + $m.Groups[2].Value }.GetNewClosure())
$html = [regex]::Replace($html, $cssPattern, { param($m) $m.Groups[1].Value + "`n" + $css + "`n" + $m.Groups[2].Value }.GetNewClosure())

[System.IO.File]::WriteAllText($htmlPath, $html, (New-Object System.Text.UTF8Encoding($false)))
$kb = [math]::Round(($bundle.Length / 1KB), 1)
Write-Host "완료: 랩 번들 $($files.Count)개 파일, ${kb}KB + CSS 주입 -> $htmlPath"
