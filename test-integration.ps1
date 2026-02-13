# Onboarder - Core Services & Integration Test
# ==============================================

Write-Host "`n========================================"
Write-Host "CORE SERVICES & INTEGRATION TEST" -ForegroundColor Cyan
Write-Host "========================================`n"

$pass = 0
$fail = 0

function Test-Check {
    param([string]$Name, [scriptblock]$Test)
    Write-Host "`n[$Name]" -ForegroundColor Yellow
    try {
        $result = & $Test
        if ($result) {
            Write-Host "  PASS" -ForegroundColor Green
            $script:pass++
        }
        else {
            Write-Host "  FAIL" -ForegroundColor Red
            $script:fail++
        }
    }
    catch {
        Write-Host "  ERROR: $_" -ForegroundColor Red
        $script:fail++
    }
}

# ===========================================
# Phase 3: Core Services
# ===========================================

Write-Host "========================================" -ForegroundColor Magenta
Write-Host "PHASE 3: Core Services Verification" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

# GitHub Service
Test-Check "GitHub Service Implementation" {
    $exists = Test-Path "src/services/githubService.js"
    if ($exists) {
        $content = Get-Content "src/services/githubService.js" -Raw
        $hasValidation = $content -match "validateGitHubUrl"
        $hasExtraction = $content -match "extract.*owner.*repo"
        Write-Host "  File exists: $exists" -ForegroundColor Gray
        Write-Host "  Has URL validation: $hasValidation" -ForegroundColor Gray
        Write-Host "  Has extraction logic: $hasExtraction" -ForegroundColor Gray
        return ($exists -and $hasValidation -and $hasExtraction)
    }
    return $false
}

# Clone Service
Test-Check "Repository Clone Service" {
    $exists = Test-Path "src/services/repoCloneService.js"
    if ($exists) {
        $content = Get-Content "src/services/repoCloneService.js" -Raw
        $hasClone = $content -match "git clone"
        $hasProgress = $content -match "progress"
        Write-Host "  File exists: $exists" -ForegroundColor Gray
        Write-Host "  Has clone logic: $hasClone" -ForegroundColor Gray
        Write-Host "  Tracks progress: $hasProgress" -ForegroundColor Gray
        return ($exists -and $hasClone)
    }
    return $false
}

# Job Queue
Test-Check "Background Job Queue System" {
    $exists = Test-Path "src/services/jobQueue.js"
    if ($exists) {
        $content = Get-Content "src/services/jobQueue.js" -Raw
        $hasQueue = $content -match "queue|jobs"
        $hasRetry = $content -match "retry"
        Write-Host "  File exists: $exists" -ForegroundColor Gray
        Write-Host "  Has queue system: $hasQueue" -ForegroundColor Gray
        Write-Host "  Has retry mechanism: $hasRetry" -ForegroundColor Gray
        return ($exists -and $hasQueue)
    }
    return $false
}

# File System Utilities
Test-Check "File System Utilities" {
    $exists = Test-Path "src/utils/fileSystem.js"
    if ($exists) {
        $content = Get-Content "src/utils/fileSystem.js" -Raw
        $hasSize = $content -match "calculate.*size|getDirectorySize"
        $hasCleanup = $content -match "delete|remove|cleanup"
        Write-Host "  File exists: $exists" -ForegroundColor Gray
        Write-Host "  Has size calculation: $hasSize" -ForegroundColor Gray
        Write-Host "  Has cleanup logic: $hasCleanup" -ForegroundColor Gray
        return ($exists -and $hasSize)
    }
    return $false
}

# Project Service
Test-Check "Project Service Orchestration" {
    $exists = Test-Path "src/services/projectService.js"
    if ($exists) {
        $content = Get-Content "src/services/projectService.js" -Raw
        $hasCreate = $content -match "create.*project"
        $hasDelete = $content -match "delete.*project"
        Write-Host "  File exists: $exists" -ForegroundColor Gray
        Write-Host "  Has create logic: $hasCreate" -ForegroundColor Gray
        Write-Host "  Has delete logic: $hasDelete" -ForegroundColor Gray
        return ($exists -and $hasCreate)
    }
    return $false
}

# ===========================================
# Phase 4: Database Operations
# ===========================================

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "PHASE 4: Database Operations" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

# Project Model
Test-Check "Project Model Schema" {
    $exists = Test-Path "src/models/Project.js"
    if ($exists) {
        $content = Get-Content "src/models/Project.js" -Raw
        $hasSchema = $content -match "Schema"
        $hasRepoUrl = $content -match "repoUrl"
        $hasCloneStatus = $content -match "cloneStatus"
        Write-Host "  File exists: $exists" -ForegroundColor Gray
        Write-Host "  Has Mongoose Schema: $hasSchema" -ForegroundColor Gray
        Write-Host "  Has repoUrl field: $hasRepoUrl" -ForegroundColor Gray
        Write-Host "  Has cloneStatus field: $hasCloneStatus" -ForegroundColor Gray
        return ($exists -and $hasSchema -and $hasRepoUrl)
    }
    return $false
}

# BuildLog Model
Test-Check "BuildLog Model Schema" {
    $exists = Test-Path "src/models/BuildLog.js"
    if ($exists) {
        $content = Get-Content "src/models/BuildLog.js" -Raw
        $hasSchema = $content -match "Schema"
        $hasProject = $content -match "project"
        $hasMessage = $content -match "message"
        Write-Host "  File exists: $exists" -ForegroundColor Gray
        Write-Host "  Has Mongoose Schema: $hasSchema" -ForegroundColor Gray
        Write-Host "  Linked to Project: $hasProject" -ForegroundColor Gray
        Write-Host "  Has message field: $hasMessage" -ForegroundColor Gray
        return ($exists -and $hasSchema)
    }
    return $false
}

# Database Connection
Test-Check "MongoDB Connection Active" {
    try {
        $response = Invoke-RestMethod "http://localhost:5000/api/health"
        Write-Host "  Database Status: $($response.database)" -ForegroundColor Gray
        return ($response.database -eq "Connected")
    }
    catch {
        return $false
    }
}

# ===========================================
# Phase 5: Workspace & File System
# ===========================================

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "PHASE 5: Workspace & File System" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

# Workspace Directory Structure
Test-Check "Workspace Directory Structure" {
    $workspaceExists = Test-Path "workspace"
    $projectsExists = Test-Path "workspace/projects"
    $tempExists = Test-Path "workspace/temp"
    Write-Host "  workspace/ : $workspaceExists" -ForegroundColor Gray
    Write-Host "  workspace/projects/ : $projectsExists" -ForegroundColor Gray
    Write-Host "  workspace/temp/ : $tempExists" -ForegroundColor Gray
    return ($workspaceExists -and $projectsExists -and $tempExists)
}

# Workspace Configuration
Test-Check "Workspace Configuration File" {
    $exists = Test-Path "workspace.config.js"
    if ($exists) {
        $content = Get-Content "workspace.config.js" -Raw
        $hasMaxSize = $content -match "maxWorkspaceSizeMB|maxProjectSizeMB"
        $hasExports = $content -match "module\.exports"
        Write-Host "  File exists: $exists" -ForegroundColor Gray
        Write-Host "  Has size limits: $hasMaxSize" -ForegroundColor Gray
        Write-Host "  Valid module: $hasExports" -ForegroundColor Gray
        return ($exists -and $hasExports)
    }
    return $false
}

# Workspace Size Calculation
Test-Check "Workspace Size Management" {
    try {
        $size = (Get-ChildItem "workspace" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        $sizeMB = [math]::Round($size / 1MB, 2)
        Write-Host "  Current workspace size: $sizeMB MB" -ForegroundColor Gray
        
        # Check config max size
        $configContent = Get-Content "workspace.config.js" -Raw
        if ($configContent -match "maxWorkspaceSizeMB:\s*(\d+)") {
            $maxSize = [int]$matches[1]
            Write-Host "  Max configured size: $maxSize MB" -ForegroundColor Gray
            Write-Host "  Within limit: $($sizeMB -lt $maxSize)" -ForegroundColor Gray
        }
        return $true
    }
    catch {
        return $false
    }
}

# ===========================================
# Phase 6: Error Handling
# ===========================================

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "PHASE 6: Error Handling & Edge Cases" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

# Error Middleware
Test-Check "Error Handler Middleware" {
    $exists = Test-Path "src/middleware/errorHandler.js"
    if ($exists) {
        $content = Get-Content "src/middleware/errorHandler.js" -Raw
        $isMiddleware = $content -match "req.*res.*next"
        $hasErrorHandling = $content -match "error|err"
        Write-Host "  File exists: $exists" -ForegroundColor Gray
        Write-Host "  Is middleware: $isMiddleware" -ForegroundColor Gray
        Write-Host "  Handles errors: $hasErrorHandling" -ForegroundColor Gray
        return ($exists -and $isMiddleware)
    }
    return $false
}

# Async Handler
Test-Check "Async Error Handler" {
    $exists = Test-Path "src/utils/asyncHandler.js"
    if ($exists) {
        $content = Get-Content "src/utils/asyncHandler.js" -Raw
        $hasAsync = $content -match "async|catch"
        Write-Host "  File exists: $exists" -ForegroundColor Gray
        Write-Host "  Handles async errors: $hasAsync" -ForegroundColor Gray
        return $exists
    }
    return $false
}

# API Error Responses
Test-Check "API Error Responses (Invalid URL)" {
    try {
        $body = @{ repoUrl = "invalid-url" } | ConvertTo-Json
        Invoke-RestMethod "http://localhost:5000/api/projects" -Method POST -Body $body -ContentType "application/json"
        return $false
    }
    catch {
        Write-Host "  Correctly rejected invalid URL" -ForegroundColor Gray
        return $true
    }
}

Test-Check "API Error Responses (Non-existent Project)" {
    try {
        Invoke-RestMethod "http://localhost:5000/api/projects/000000000000000000000000"
        return $false
    }
    catch {
        Write-Host "  Correctly returned 404" -ForegroundColor Gray
        return $true
    }
}

# ===========================================
# Phase 7: Documentation
# ===========================================

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "PHASE 7: Documentation & Code Quality" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

# Documentation Files
$docs = @{
    "README.md"             = @("Quick Start", "API", "Installation")
    "API_TESTING.md"        = @("endpoint", "example", "curl|Invoke")
    "DAY3_TESTING_GUIDE.md" = @("test", "clone", "project")
    ".env.example"          = @("MONGODB_URI", "PORT")
}

foreach ($doc in $docs.Keys) {
    Test-Check "Documentation: $doc" {
        $exists = Test-Path $doc
        if ($exists) {
            $content = Get-Content $doc -Raw
            $requiredItems = $docs[$doc]
            $hasAll = $true
            
            foreach ($item in $requiredItems) {
                if ($content -notmatch $item) {
                    Write-Host "  Missing: $item" -ForegroundColor Yellow
                    $hasAll = $false
                }
            }
            
            $lines = (Get-Content $doc | Measure-Object -Line).Lines
            Write-Host "  File exists: $exists ($lines lines)" -ForegroundColor Gray
            Write-Host "  Has required content: $hasAll" -ForegroundColor Gray
            return ($exists -and $hasAll)
        }
        return $false
    }
}

# Package.json
Test-Check "package.json Structure" {
    $exists = Test-Path "package.json"
    if ($exists) {
        $pkg = Get-Content "package.json" | ConvertFrom-Json
        $hasName = $pkg.name -eq "onboarder"
        $hasScripts = $pkg.scripts.dev -ne $null
        $hasDeps = $pkg.dependencies.express -ne $null
        Write-Host "  Name: $($pkg.name)" -ForegroundColor Gray
        Write-Host "  Has dev script: $hasScripts" -ForegroundColor Gray
        Write-Host "  Has dependencies: $hasDeps" -ForegroundColor Gray
        return ($hasName -and $hasScripts -and $hasDeps)
    }
    return $false
}

# ===========================================
# Summary
# ===========================================

Write-Host "`n========================================"
Write-Host "COMPREHENSIVE TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================`n"

$total = $pass + $fail
$percentage = if ($total -gt 0) { [math]::Round(($pass / $total) * 100, 1) } else { 0 }

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "Passed:      $pass" -ForegroundColor Green
Write-Host "Failed:      $fail" -ForegroundColor Red
Write-Host "`nSuccess Rate: $percentage%" -ForegroundColor $(if ($percentage -ge 90) { "Green" } elseif ($percentage -ge 70) { "Yellow" } else { "Red" })

Write-Host "`n"
if ($percentage -ge 95) {
    Write-Host "EXCELLENT! System is fully verified" -ForegroundColor Green
    Write-Host "Ready to proceed to Day 4" -ForegroundColor Green
}
elseif ($percentage -ge 85) {
    Write-Host "VERY GOOD! Minor improvements possible" -ForegroundColor Green
    Write-Host "Safe to proceed to Day 4" -ForegroundColor Green
}
elseif ($percentage -ge 70) {
    Write-Host "GOOD! Some issues to address" -ForegroundColor Yellow
}
else {
    Write-Host "NEEDS WORK! Critical issues detected" -ForegroundColor Red
}

Write-Host "`n========================================`n"
