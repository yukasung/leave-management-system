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

# ── EmployeeFilters.tsx ───────────────────────────────────────────────────────
Fix-File "$base\admin\employees\EmployeeFilters.tsx" @(
    @('border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
      'border border-input bg-background text-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary'),
    @('border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500',
      'border border-input bg-background text-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary')
)

# ── AvatarUploader.tsx ────────────────────────────────────────────────────────
Fix-File "$base\admin\employees\AvatarUploader.tsx" @(
    @('text-sm font-medium text-gray-700 mb-0.5', 'text-sm font-medium text-foreground mb-0.5'),
    @('text-xs text-gray-400 mb-2', 'text-xs text-muted-foreground/60 mb-2'),
    @('text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition disabled:opacity-50',
      'text-xs px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/40 text-muted-foreground transition disabled:opacity-50')
)

# ── login/page.tsx ────────────────────────────────────────────────────────────
Fix-File "$base\login\page.tsx" @(
    @('bg-white rounded-2xl shadow-md p-8', 'bg-card rounded-2xl shadow-md p-8'),
    @('text-2xl font-bold text-center text-gray-800 mb-2', 'text-2xl font-bold text-center text-foreground mb-2'),
    @('text-center text-gray-500 mb-8', 'text-center text-muted-foreground mb-8'),
    @('block text-sm font-medium text-gray-700 mb-1', 'block text-sm font-medium text-foreground mb-1'),
    @('w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
      'w-full px-4 py-2.5 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'),
    @('w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-60',
      'w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition disabled:opacity-60')
)

# ── leave-balance/page.tsx ────────────────────────────────────────────────────
Fix-File "$base\leave-balance\page.tsx" @(
    @('text-2xl font-bold text-gray-800', 'text-2xl font-bold text-foreground'),
    @('text-sm text-gray-500 mt-1', 'text-sm text-muted-foreground mt-1'),
    @('text-center text-gray-500 py-16 bg-white rounded-2xl shadow-sm', 'text-center text-muted-foreground py-16 bg-card rounded-2xl shadow-sm'),
    @('table className="w-full bg-white text-sm"', 'table className="w-full bg-card text-sm"'),
    @('bg-gray-50 border-b border-gray-200 text-left text-gray-600 font-semibold', 'bg-muted/40 border-b border-border text-left text-muted-foreground font-semibold'),
    @('px-5 py-4 font-medium text-gray-900', 'px-5 py-4 font-medium text-foreground'),
    @('px-5 py-4 text-center text-gray-700', 'px-5 py-4 text-center text-foreground')
)

# ── my-leaves/page.tsx ────────────────────────────────────────────────────────
Fix-File "$base\my-leaves\page.tsx" @(
    @('text-2xl font-bold text-gray-800', 'text-2xl font-bold text-foreground'),
    @('text-sm text-gray-500 mt-1', 'text-sm text-muted-foreground mt-1'),
    @('text-center text-gray-500 py-16 bg-white rounded-2xl shadow-sm', 'text-center text-muted-foreground py-16 bg-card rounded-2xl shadow-sm'),
    @('table className="w-full bg-white text-sm"', 'table className="w-full bg-card text-sm"'),
    @('bg-gray-50 border-b border-gray-200 text-left text-gray-600 font-semibold', 'bg-muted/40 border-b border-border text-left text-muted-foreground font-semibold'),
    @('"bg-gray-100 text-gray-600"', '"bg-muted text-muted-foreground"'),
    @('px-5 py-4 font-medium text-gray-900', 'px-5 py-4 font-medium text-foreground'),
    @('px-5 py-4 text-gray-700 whitespace-nowrap', 'px-5 py-4 text-foreground whitespace-nowrap'),
    @('px-5 py-4 text-center font-semibold text-gray-900', 'px-5 py-4 text-center font-semibold text-foreground'),
    @('px-5 py-4 text-gray-600 text-xs', 'px-5 py-4 text-muted-foreground text-xs'),
    @('px-5 py-4 text-gray-600 max-w-xs truncate', 'px-5 py-4 text-muted-foreground max-w-xs truncate'),
    @('"text-gray-400">—', '"text-muted-foreground/60">—'),
    @('px-5 py-4 text-gray-500 whitespace-nowrap', 'px-5 py-4 text-muted-foreground whitespace-nowrap')
)

# ── admin/departments/page.tsx ────────────────────────────────────────────────
Fix-File "$base\admin\departments\page.tsx" @(
    @('text-2xl font-bold text-gray-900', 'text-2xl font-bold text-foreground'),
    @('text-sm text-gray-500 mt-1', 'text-sm text-muted-foreground mt-1'),
    @('bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors',
      'bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors'),
    @('bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden', 'bg-card rounded-xl shadow-sm border border-border overflow-hidden'),
    @('text-center py-16 text-gray-400', 'text-center py-16 text-muted-foreground'),
    @('thead className="bg-gray-50 border-b border-gray-200"', 'thead className="bg-muted/40 border-b border-border"'),
    @('font-semibold text-gray-600', 'font-semibold text-muted-foreground'),
    @('px-5 py-4 text-gray-400', 'px-5 py-4 text-muted-foreground/60'),
    @('px-5 py-4 font-medium text-gray-900', 'px-5 py-4 font-medium text-foreground'),
    @('px-5 py-4 text-gray-600', 'px-5 py-4 text-muted-foreground'),
    @('text-gray-400 italic', 'text-muted-foreground/60 italic'),
    @('bg-indigo-50 text-indigo-700', 'bg-primary/10 text-primary')
)

# ── holiday-management/HolidayImportClient.tsx ─────────────────────────────────
Fix-File "$base\admin\holiday-management\HolidayImportClient.tsx" @(
    @('bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4', 'bg-card rounded-xl shadow-sm border border-border p-6 space-y-4'),
    @('bg-white rounded-xl shadow-sm border border-gray-200 p-6"', 'bg-card rounded-xl shadow-sm border border-border p-6"'),
    @('text-base font-semibold text-gray-800', 'text-base font-semibold text-foreground'),
    @('bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed',
      'bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed'),
    @('text-sm text-gray-500', 'text-sm text-muted-foreground'),
    @('rounded-lg border border-gray-200 overflow-hidden', 'rounded-lg border border-border overflow-hidden'),
    @('thead className="bg-gray-50 border-b border-gray-200"', 'thead className="bg-muted/40 border-b border-border"'),
    @('font-semibold text-gray-600', 'font-semibold text-muted-foreground'),
    @('text-center px-4 py-3 text-gray-400', 'text-center px-4 py-3 text-muted-foreground/60'),
    @('px-4 py-3 text-gray-900 font-medium tabular-nums', 'px-4 py-3 text-foreground font-medium tabular-nums'),
    @('px-4 py-3 text-gray-700', 'px-4 py-3 text-foreground'),
    @("'text-gray-500'}", "'text-muted-foreground'}"),
    @('block text-sm font-semibold text-gray-700 mb-2', 'block text-sm font-semibold text-foreground mb-2'),
    @('block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200',
      'block rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20'),
    @('block text-sm font-medium text-gray-700 mb-1', 'block text-sm font-medium text-foreground mb-1'),
    @('block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200',
      'block w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20')
)

Write-Host "All files updated!"
