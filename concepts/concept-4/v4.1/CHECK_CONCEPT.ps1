$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$html = Get-Content (Join-Path $root 'index.html') -Raw -Encoding UTF8
$css = Get-Content (Join-Path $root 'styles.css') -Raw -Encoding UTF8
Write-Host 'Concept 4.1 — local checks'
$sectionCount = [regex]::Matches($html, '<section\b').Count
$mobilePortraitCount = [regex]::Matches($html, '<section class="mobile-portrait-block"').Count
$faqCount = [regex]::Matches($html, '<details class="faq-item"').Count
$priceCount = [regex]::Matches($html, '<article class="price-card').Count
$openBraces = [regex]::Matches($css, '\{').Count
$closeBraces = [regex]::Matches($css, '\}').Count
Write-Host "Content sections: $sectionCount (expected 10 content sections + mobile photo block)"
Write-Host "Mobile photo blocks: $mobilePortraitCount (expected 1)"
Write-Host "FAQ items: $faqCount (expected 6)"
Write-Host "Price cards: $priceCount (expected 4)"
Write-Host "CSS brace balance: $($openBraces - $closeBraces)"
if ($sectionCount -ne 11) { throw "Unexpected section count: $sectionCount" }
if ($mobilePortraitCount -ne 1) { throw "Unexpected mobile photo block count: $mobilePortraitCount" }
if ($faqCount -ne 6) { throw "Unexpected FAQ count: $faqCount" }
if ($priceCount -ne 4) { throw "Unexpected price card count: $priceCount" }
if ($openBraces -ne $closeBraces) { throw 'CSS brace mismatch' }
$missing = @()
foreach ($m in [regex]::Matches($css, 'url\("([^"]+)"\)')) {
  $relative = $m.Groups[1].Value
  if ($relative.StartsWith('./assets/')) {
    $local = Join-Path $root ($relative.Substring(2).Replace('/', '\'))
    if (-not (Test-Path $local)) { $missing += $relative }
  }
}
foreach ($m in [regex]::Matches($html, '(?:src|href)="(\./assets/[^"]+)"')) {
  $relative = $m.Groups[1].Value
  $local = Join-Path $root ($relative.Substring(2).Replace('/', '\'))
  if (-not (Test-Path $local)) { $missing += $relative }
}
Write-Host "Missing local image/style assets: $($missing.Count)"
if ($missing.Count -gt 0) { $missing | ForEach-Object { Write-Host "  $_" }; throw 'Missing local assets' }
node --check (Join-Path $root 'script.js')
if ($LASTEXITCODE -ne 0) { throw 'JavaScript syntax check failed' }
Write-Host 'JavaScript syntax: OK'
Write-Host "Optimized backgrounds: $((Get-ChildItem (Join-Path $root 'assets\backgrounds') -Filter 'section-*.jpg').Count) / 12"
Write-Host 'All checks passed.'
