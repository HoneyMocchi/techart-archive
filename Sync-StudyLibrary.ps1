# ue-study-library.html에 내장된 md 스냅샷을 같은 폴더의 실제 md 파일 내용으로 갱신하는 스크립트입니다.
# 로컬 HTTP 서버로 열면 스냅샷과 무관하게 항상 md 파일이 직접 로드되므로,
# 이 스크립트는 file:// 로 열 때와 아티팩트 재배포용 스냅샷을 맞출 때만 필요합니다.
$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$htmlPath = Join-Path $root "ue-study-library.html"
$html = [System.IO.File]::ReadAllText($htmlPath)

$docs = [ordered]@{
    "shading-model"       = "쉐이딩모델 시스템 정리.md"
    "toonlit"             = "툰릿 구현 보고서.md"
    "substrate"           = "Substrate 시스템 분석.md"
    "mesh-pipeline"       = "메시 렌더링 파이프라인.md"
    "rendering-internals" = "렌더링 내부구조 스터디.md"
    "compile-perf"        = "컴파일 성능 노트.md"
}

foreach ($id in $docs.Keys) {
    $mdPath = Join-Path $root $docs[$id]
    $md = [System.IO.File]::ReadAllText($mdPath).Trim()
    $pattern = "(?s)(<script type=""text/markdown"" id=""md-$id"">).*?(</script>)"
    if ($html -notmatch $pattern) { throw "md-$id 블록을 HTML에서 찾지 못했습니다." }
    # MatchEvaluator를 사용해 $md 안의 '$' 문자가 치환 패턴으로 해석되는 것을 방지합니다.
    $html = [regex]::Replace($html, $pattern, { param($m) $m.Groups[1].Value + "`n" + $md + "`n" + $m.Groups[2].Value }.GetNewClosure())
    Write-Host "갱신: md-$id  <-  $($docs[$id])"
}

[System.IO.File]::WriteAllText($htmlPath, $html, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "완료: $htmlPath"
