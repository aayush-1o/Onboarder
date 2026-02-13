# Onboarder Day 1-3 Comprehensive Verification Script
# ====================================================

Write-Host "`n========================================"
Write-Host " Onboarder Day 1-3 Verification"  -ForegroundColor Cyan
Write-Host "========================================`n"

$passCount = 0
$failCount = 0
$warnCount = 0

function Test-Check {
    param([string]$Name, [scriptblock]$Test)
    
    Write-Host "`n[TEST] $Name" -ForegroundColor Yellow
    try {
        $result = & $Test
        if ($result) {
            Write-Host "  PASS" -ForegroundColor Green
            $script:passCount++
            return $true
        }
        else {
            Write-Host "  FAIL" -ForegroundColor Red
            $script:failCount++
            return $false
        }
    }
    catch {
        Write-Host "  ERROR: $_" -ForegroundColor Red
        $script:failCount++
        return $false
    }
}

# ====================================================
# PHASE 1: Environment and Dependencies
# ====================================================

Write-Host "`n========================================"
Write-Host "PHASE 1: Environment and Dependencies" -ForegroundColor Magenta
Write-Host "========================================`n"

# Node.js Version
Test-Check "Node.js Version 18 or higher" {
    $version = node --version
    Write-Host "  Detected: $version" -ForegroundColor Gray
    $versionNumber = [int]($version -replace 'v(\d+)\..*', '$1')
    return ($versionNumber -ge 18)
}

# npm Installation
Test-Check "npm Installation" {
    try {
        $npmVersion = & { npm --version 2>&1 }
        if ($npmVersion -and $npmVersion -notmatch "cannot be loaded") {
            Write-Host "  Detected: npm v$npmVersion" -ForegroundColor Gray
            return $true
        }
        return $false
    }
    catch {
        return $false
    }
}

# Backend Dependencies
Test-Check "Backend Dependencies (node_modules)" {
    $exists = Test-Path ".\node_modules"
    if ($exists) {
        Write-Host "  node_modules found" -ForegroundColor Gray
    }
    else {
        Write-Host "  WARNING: Run 'npm install' in root directory" -ForegroundColor Yellow
        $script:warnCount++
    }
    return $exists
}

# Frontend Dependencies
Test-Check "Frontend Dependencies (frontend/node_modules)" {
    $exists = Test-Path ".\frontend\node_modules"
    if ($exists) {
        Write-Host "  frontend/node_modules found" -ForegroundColor Gray
    }
    else {
        Write-Host "  WARNING: Run 'npm install' in frontend/ directory" -ForegroundColor Yellow
        $script:warnCount++
    }
    return $exists
}

# .env File
Test-Check "Environment Configuration (.env)" {
    $exists = Test-Path ".\.env"
    if ($exists) {
        Write-Host "  .env file found" -ForegroundColor Gray
    }
    else {
        Write-Host "  WARNING: Copy .env.example to .env" -ForegroundColor Yellow
        $script:warnCount++
    }
    return $exists
}

# Git Installation
Test-Check "Git Installation" {
    try {
        $gitVersion = git --version 2>&1
        if ($gitVersion) {
            Write-Host "  Detected: $gitVersion" -ForegroundColor Gray
            return $true
        }
        return $false
    }
    catch {
        return $false
    }
}

# Workspace Directory
Test-Check "Workspace Directory" {
    if (Test-Path ".\workspace") {
        try {
            $size = (Get-ChildItem ".\workspace" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
            if ($size) {
                $sizeMB = [math]::Round($size / 1MB, 2)
                Write-Host "  Workspace size: $sizeMB MB" -ForegroundColor Gray
            }
            else {
                Write-Host "  Workspace empty" -ForegroundColor Gray
            }
        }
        catch {
            Write-Host "  Workspace exists" -ForegroundColor Gray
        }
    }
    else {
        Write-Host "  Workspace will be created on first use" -ForegroundColor Gray
    }
    return $true
}

# ====================================================
# PHASE 2: Backend API Testing
# ====================================================

Write-Host "`n========================================"
Write-Host "PHASE 2: Backend API Testing" -ForegroundColor Magenta
Write-Host "========================================`n"

Write-Host "Checking if backend server is running..." -ForegroundColor Yellow

$serverRunning = $false
try {
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 3 -ErrorAction Stop
    if ($healthCheck.status -eq "OK") {
        $serverRunning = $true
        Write-Host "Server is running!" -ForegroundColor Green
    }
}
catch {
    Write-Host "Server is not running" -ForegroundColor Red
    Write-Host "`nTo test API endpoints, start the server with: npm run dev" -ForegroundColor Cyan
    Write-Host "Skipping API tests for now...`n" -ForegroundColor Yellow
}

if ($serverRunning) {
    Test-Check "API Health Check" {
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:5000/api/health"
            Write-Host "  Status: $($response.status)" -ForegroundColor Gray
            Write-Host "  Database: $($response.database)" -ForegroundColor Gray
            return ($response.status -eq "OK")
        }
        catch {
            return $false
        }
    }
    
    Test-Check "List Projects Endpoint" {
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:5000/api/projects"
            Write-Host "  Found $($response.projects.Count) projects" -ForegroundColor Gray
            return $true
        }
        catch {
            return $false
        }
    }
}

# ====================================================
# PHASE 3: Core Files Verification
# ====================================================

Write-Host "`n========================================"
Write-Host "PHASE 3: Core Files Verification" -ForegroundColor Magenta
Write-Host "========================================`n"

$coreFiles = @(
    "src/server.js",
    "src/config/database.js",
    "src/models/Project.js",
    "src/models/BuildLog.js",
    "src/routes/projectRoutes.js",
    "src/services/githubService.js",
    "src/services/repoCloneService.js",
    "src/services/jobQueue.js",
    "src/services/projectService.js",
    "src/utils/fileSystem.js",
    "src/utils/asyncHandler.js",
    "src/middleware/errorHandler.js"
)

foreach ($file in $coreFiles) {
    Test-Check "File: $file" {
        if (Test-Path $file) {
            $lines = (Get-Content $file | Measure-Object -Line).Lines
            Write-Host "  $lines lines" -ForegroundColor Gray
            return $true
        }
        return $false
    }
}

# ====================================================
# PHASE 4: Configuration Files
# ====================================================

Write-Host "`n========================================"
Write-Host "PHASE 4: Configuration Files" -ForegroundColor Magenta
Write-Host "========================================`n"

Test-Check "workspace.config.js" {
    if (Test-Path "workspace.config.js") {
        $content = Get-Content "workspace.config.js" -Raw
        if ($content -match "module\.exports") {
            Write-Host "  Valid Node.js module" -ForegroundColor Gray
            return $true
        }
    }
    return $false
}

Test-Check "package.json" {
    if (Test-Path "package.json") {
        try {
            $pkg = Get-Content "package.json" | ConvertFrom-Json
            Write-Host "  Name: $($pkg.name)" -ForegroundColor Gray
            Write-Host "  Version: $($pkg.version)" -ForegroundColor Gray
            return $true
        }
        catch {
            return $false
        }
    }
    return $false
}

# ====================================================
# PHASE 5: Documentation
# ====================================================

Write-Host "`n========================================"
Write-Host "PHASE 5: Documentation" -ForegroundColor Magenta
Write-Host "========================================`n"

$docs = @(
    "README.md",
    "API_TESTING.md",
    "DAY3_TESTING_GUIDE.md",
    ".env.example"
)

foreach ($doc in $docs) {
    Test-Check "Documentation: $doc" {
        if (Test-Path $doc) {
            $lines = (Get-Content $doc | Measure-Object -Line).Lines
            Write-Host "  $lines lines" -ForegroundColor Gray
            return $true
        }
        return $false
    }
}

# ====================================================
# SUMMARY
# ====================================================

Write-Host "`n========================================"
Write-Host "VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "========================================`n"

Write-Host "Passed:   $passCount tests" -ForegroundColor Green
Write-Host "Failed:   $failCount tests" -ForegroundColor Red
Write-Host "Warnings: $warnCount" -ForegroundColor Yellow

$totalTests = $passCount + $failCount
if ($totalTests -gt 0) {
    $successRate = [math]::Round(($passCount / $totalTests) * 100, 1)
    $color = if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 60) { "Yellow" } else { "Red" }
    Write-Host "`nSuccess Rate: $successRate%" -ForegroundColor $color
}

Write-Host ""
if ($failCount -eq 0) {
    Write-Host "All critical tests passed!" -ForegroundColor Green
    Write-Host "System is ready for Day 4" -ForegroundColor Green
}
elseif ($failCount -le 2) {
    Write-Host "Minor issues detected - review warnings" -ForegroundColor Yellow
}
else {
    Write-Host "Critical issues detected - fix before proceeding" -ForegroundColor Red
}

Write-Host "`n========================================`n"
