$base = "d:\Projects\Alternate Pro\Projects\Leave Management System\leave-management-system\app\leave-request"

function Fix-File($path, $replacements) {
    $content = Get-Content $path -Raw -Encoding UTF8
    foreach ($r in $replacements) {
        $content = $content -replace [regex]::Escape($r[0]), $r[1]
    }
    [System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Updated: $path"
}

$commonReplacements = @(
    @('bg-white rounded-2xl shadow-md p-8', 'bg-card rounded-2xl shadow-md p-8'),
    @('text-2xl font-bold text-gray-800', 'text-2xl font-bold text-foreground'),
    @('text-xl font-bold text-gray-800', 'text-xl font-bold text-foreground'),
    @('block text-sm font-medium text-gray-700 mb-1', 'block text-sm font-medium text-foreground mb-1'),
    @('h-4 w-4 text-gray-400 shrink-0', 'h-4 w-4 text-muted-foreground/60 shrink-0'),
    @('text-base text-gray-900', 'text-base text-foreground'),
    @('h-6 w-6 text-gray-400', 'h-6 w-6 text-muted-foreground/60'),
    @('border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed', 'border-2 border-dashed border-input rounded-lg hover:border-primary hover:bg-primary/5 transition disabled:opacity-50 disabled:cursor-not-allowed'),
    @('flex items-center gap-2 px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700 cursor-not-allowed select-none', 'flex items-center gap-2 px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground cursor-not-allowed select-none')
)

# ── LeaveRequestForm.tsx ─────────────────────────────────────────────────────
$lrfPath = "$base\LeaveRequestForm.tsx"
$lrfReplacements = $commonReplacements + @(
    @('"text-sm text-gray-500 mb-6"', '"text-sm text-muted-foreground mb-6"'),
    @('rounded-xl border border-gray-200 bg-gray-50 divide-y divide-gray-100 mb-6 text-sm', 'rounded-xl border border-border bg-muted/40 divide-y divide-border mb-6 text-sm'),
    @('flex-1 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition disabled:opacity-50', 'flex-1 py-2.5 border border-border text-foreground font-semibold rounded-lg hover:bg-muted/40 transition disabled:opacity-50'),
    @('flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-lg transition', 'flex-1 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-semibold rounded-lg transition'),
    @('px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition', 'px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition'),
    @('w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white', 'w-full px-4 py-2.5 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'),
    @('w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white', 'w-full px-3 py-2.5 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'),
    @('w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none', 'w-full px-4 py-2.5 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none'),
    @('w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed', 'w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed'),
    @('w-36 shrink-0 text-gray-500', 'w-36 shrink-0 text-muted-foreground'),
    @('text-gray-900 font-medium', 'text-foreground font-medium'),
    @('"text-xs text-gray-400">PDF,', '"text-xs text-muted-foreground/60">PDF,'),
    @('"text-sm text-gray-500"' + "`n" + '                {uploading', '"text-sm text-muted-foreground">' + "`n" + '                {uploading')
)
Fix-File $lrfPath $lrfReplacements

# ── EditLeaveForm.tsx ────────────────────────────────────────────────────────
$elfPath = "$base\EditLeaveForm.tsx"
$elfReplacements = $commonReplacements + @(
    @('"text-sm text-gray-500 mb-6"', '"text-sm text-muted-foreground mb-6"'),
    @('"text-sm text-gray-500 mb-5"', '"text-sm text-muted-foreground mb-5"'),
    @('"text-sm text-blue-600 hover:underline"', '"text-sm text-primary hover:underline"'),
    @('w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed', 'w-full px-4 py-2.5 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed'),
    @('w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed', 'w-full px-3 py-2.5 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed'),
    @('px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-400', 'px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-muted-foreground/60'),
    @('w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed', 'w-full px-4 py-2.5 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed'),
    @('flex-1 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition text-center', 'flex-1 py-2.5 border border-border text-foreground font-semibold rounded-lg hover:bg-muted/40 transition text-center'),
    @('flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed', 'flex-1 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed'),
    @('inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition', 'inline-block px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition'),
    @('"text-xs text-gray-400">PDF,', '"text-xs text-muted-foreground/60">PDF,')
)
Fix-File $elfPath $elfReplacements

Write-Host "All done!"
