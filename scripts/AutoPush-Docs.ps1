# Documentation 폴더의 변경사항을 자동으로 커밋/푸시하는 스크립트입니다 (윈도우 스케줄 작업이 5분마다 실행).
$ErrorActionPreference = "SilentlyContinue"
$repo = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)   # scripts의 상위 = 리포 루트
Set-Location $repo

$status = git status --porcelain
if ($status) {
    git add -A | Out-Null
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    git commit -m "docs: auto-sync $stamp" | Out-Null
}

# 오프라인 등으로 밀린 커밋이 있으면 이번 기회에 푸시합니다.
$ahead = git rev-list --count "origin/main..main" 2>$null
if ($ahead -and [int]$ahead -gt 0) {
    git push origin main 2>&1 | Out-Null
}
