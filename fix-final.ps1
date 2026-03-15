$base = "d:\Projects\Alternate Pro\Projects\Leave Management System\leave-management-system\app"

function Fix-File($path, $replacements) {
    if (-not (Test-Path $path)) { Write-Host "NOT FOUND: $path"; return }
    $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    foreach ($r in $replacements) {
        $content = $content -replace [regex]::Escape($r[0]), $r[1]
    }
    [System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Updated: $path"
}

# ── Navbar.tsx ────────────────────────────────────────────────────────────────
Fix-File "$base\components\Navbar.tsx" @(
    @('w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40', 'w-full bg-card border-b border-border shadow-sm sticky top-0 z-40'),
    @('h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold select-none group-hover:bg-blue-700 transition',
      'h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold select-none group-hover:bg-primary/90 transition'),
    @('hidden sm:block font-semibold text-gray-800 text-sm tracking-tight', 'hidden sm:block font-semibold text-foreground text-sm tracking-tight'),
    @("'bg-blue-50 text-blue-700 font-medium'", "'bg-primary/10 text-primary font-medium'"),
    @("'text-gray-600 hover:text-gray-900 hover:bg-gray-100'", "'text-muted-foreground hover:text-foreground hover:bg-muted/40'"),
    @('hidden md:block text-sm font-medium text-gray-700 max-w-30 truncate', 'hidden md:block text-sm font-medium text-foreground max-w-30 truncate'),
    @('lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
      'lg:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'),
    @('border-t border-gray-100 bg-white px-4 pb-4', 'border-t border-border bg-card px-4 pb-4'),
    @('flex items-center justify-between py-3 border-b border-gray-100 mb-2', 'flex items-center justify-between py-3 border-b border-border mb-2'),
    @('text-sm font-medium text-gray-700 truncate', 'text-sm font-medium text-foreground truncate'),
    @('px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400', 'px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60'),
    @("'text-gray-600 hover:text-gray-900 hover:bg-gray-50'", "'text-muted-foreground hover:text-foreground hover:bg-muted/40'"),
    @('h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0', 'h-1.5 w-1.5 rounded-full bg-primary shrink-0')
)

# ── HolidayDatePicker.tsx ─────────────────────────────────────────────────────
Fix-File "$base\components\HolidayDatePicker.tsx" @(
    @("'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300'", "'bg-muted text-muted-foreground cursor-not-allowed border-input'"),
    @("'bg-white border-gray-300 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500'", "'bg-background border-input hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary'"),
    @('"text-gray-900">{formatThaiDateFromISO', '"text-foreground">{formatThaiDateFromISO'),
    @('"text-gray-400">\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48</span>', '"text-muted-foreground/60">\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48</span>'),
    @('"float-right text-gray-400 mt-0.5"', '"float-right text-muted-foreground/60 mt-0.5"'),
    @('absolute z-50 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-72', 'absolute z-50 mt-1 bg-card rounded-xl shadow-xl border border-border p-3 w-72'),
    @('w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 text-lg leading-none', 'w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted/40 text-muted-foreground text-lg leading-none'),
    @('text-sm font-semibold text-gray-800', 'text-sm font-semibold text-foreground'),
    @("'text-gray-300 cursor-not-allowed'", "'text-muted-foreground/30 cursor-not-allowed'"),
    @("'text-gray-700 hover:bg-blue-50 cursor-pointer'", "'text-foreground hover:bg-primary/5 cursor-pointer'"),
    @("'bg-blue-600 text-white font-semibold shadow-sm'", "'bg-primary text-primary-foreground font-semibold shadow-sm'"),
    @('mt-3 pt-2 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500', 'mt-3 pt-2 border-t border-border flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground')
)

# ── admin/employees/page.tsx ──────────────────────────────────────────────────
Fix-File "$base\admin\employees\page.tsx" @(
    @('text-gray-500 text-sm mt-1', 'text-muted-foreground text-sm mt-1'),
    @('text-2xl font-bold text-gray-800', 'text-2xl font-bold text-foreground'),
    @('text-sm text-gray-500 mt-0.5', 'text-sm text-muted-foreground mt-0.5'),
    @('px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition', 'px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition'),
    @('bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden', 'bg-card rounded-2xl shadow-sm border border-border overflow-hidden'),
    @('py-20 text-center text-gray-400', 'py-20 text-center text-muted-foreground'),
    @('bg-gray-50 border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide', 'bg-muted/40 border-b border-border text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide'),
    @('px-5 py-3.5 font-mono text-gray-600 text-xs', 'px-5 py-3.5 font-mono text-muted-foreground text-xs'),
    @('font-medium text-gray-800', 'font-medium text-foreground'),
    @('text-xs text-gray-400', 'text-xs text-muted-foreground/60'),
    @('px-5 py-3.5 text-gray-600', 'px-5 py-3.5 text-muted-foreground'),
    @('"text-gray-300">—', '"text-muted-foreground/30">—'),
    @('text-sm text-gray-500"' + "`n", 'text-sm text-muted-foreground"' + "`n"),
    @("'pointer-events-none border-gray-200 text-gray-300'", "'pointer-events-none border-border text-muted-foreground/30'"),
    @("'border-gray-300 text-gray-600 hover:bg-gray-50'", "'border-border text-muted-foreground hover:bg-muted/40'"),
    @("'border-blue-600 bg-blue-600 text-white'", "'border-primary bg-primary text-primary-foreground'")
)

# ── my-leaves/page.tsx remaining ──────────────────────────────────────────────
Fix-File "$base\my-leaves\page.tsx" @(
    @('"bg-gray-100 text-gray-600"', '"bg-muted text-muted-foreground"'),
    @('"text-gray-400">—', '"text-muted-foreground/60">—')
)

# ── HolidayImportClient.tsx - w-40 year select ────────────────────────────────
Fix-File "$base\admin\holiday-management\HolidayImportClient.tsx" @(
    @('block w-40 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200',
      'block w-40 rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20')
)

Write-Host "Final batch done!"
