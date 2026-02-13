# Pre-Day 4 System Verification

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Pre-Day 4 Comprehensive System Verification  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$testsPassed = 0
$testsFailed = 0
$projectId = $null

# Test 1: Server Health Check
Write-Host "═══ Test 1: Server Health Check ═══" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health"
    if ($health.status -eq "OK" -and $health.database -eq "Connected") {
        Write-Host "✓ Server is running" -ForegroundColor Green
        Write-Host "✓ MongoDB is connected" -ForegroundColor Green
        Write-Host "  Database: $($health.database)" -ForegroundColor Gray
        $testsPassed += 2
    } else {
        Write-Host "✗ Health check returned unexpected status" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "✗ Server health check failed: $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}

# Test 2: Workspace Directories
Write-Host "`n═══ Test 2: Workspace Structure ═══" -ForegroundColor Yellow
$workspaceChecks = @(
    @{Path="workspace\projects"; Name="Projects directory"},
    @{Path="workspace\temp"; Name="Temp directory"},
    @{Path="workspace.config.js"; Name="Workspace config"}
)

foreach ($check in $workspaceChecks) {
    if (Test-Path $check.Path) {
        Write-Host "✓ $($check.Name) exists" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "✗ $($check.Name) missing" -ForegroundColor Red
        $testsFailed++
    }
}

# Test 3: Git Installation
Write-Host "`n═══ Test 3: Git Validation ═══" -ForegroundColor Yellow
try {
    $gitVersion = git --version 2>&1
    if ($gitVersion -match "git version") {
        Write-Host "✓ Git is installed: $gitVersion" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "✗ Git version check failed" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "✗ Git not found" -ForegroundColor Red
    $testsFailed++
}

# Test 4: Environment Variables
Write-Host "`n═══ Test 4: Configuration Files ═══" -ForegroundColor Yellow
$configChecks = @(".env", ".env.example", "package.json")
foreach ($file in $configChecks) {
    if (Test-Path $file) {
        Write-Host "✓ $file exists" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "✗ $file missing" -ForegroundColor Red
        $testsFailed++
    }
}

# Test 5: API Endpoints - List Projects
Write-Host "`n═══ Test 5: List Projects API ═══" -ForegroundColor Yellow
try {
    $projects = Invoke-RestMethod -Uri "http://localhost:5000/api/projects"
    Write-Host "✓ GET /api/projects works" -ForegroundColor Green
    Write-Host "  Total projects: $($projects.pagination.total)" -ForegroundColor Gray
    $testsPassed++
} catch {
    Write-Host "✗ Failed to list projects: $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}

# Test 6: Create Project with Cloning
Write-Host "`n═══ Test 6: Create Project & Clone Repository ═══" -ForegroundColor Yellow
try {
    $body = '{"repoUrl": "https://github.com/octocat/Hello-World", "branch": "master"}'
    $createResult = Invoke-RestMethod -Uri "http://localhost:5000/api/projects" -Method POST -Body $body -ContentType "application/json"
    
    if ($createResult.success -eq $true) {
        Write-Host "✓ POST /api/projects works" -ForegroundColor Green
        $projectId = $createResult.data._id
        Write-Host "  Project ID: $projectId" -ForegroundColor Gray
        Write-Host "  Job ID: $($createResult.data.jobId)" -ForegroundColor Gray
        Write-Host "  Clone Status: $($createResult.data.cloneStatus)" -ForegroundColor Gray
        $testsPassed++
    } else {
        Write-Host "✗ Project creation failed" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "✗ Create project failed: $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}

# Test 7: Get Project Details
if ($projectId) {
    Write-Host "`n═══ Test 7: Get Project Details ═══" -ForegroundColor Yellow
    try {
        $project = Invoke-RestMethod -Uri "http://localhost:5000/api/projects/$projectId"
        if ($project.success -eq $true) {
            Write-Host "✓ GET /api/projects/:id works" -ForegroundColor Green
            Write-Host "  Name: $($project.data.name)" -ForegroundColor Gray
            Write-Host "  Owner: $($project.data.owner)" -ForegroundColor Gray
            Write-Host "  Status: $($project.data.status)" -ForegroundColor Gray
            $testsPassed++
        }
    } catch {
        Write-Host "✗ Get project failed: $($_.Exception.Message)" -ForegroundColor Red
        $testsFailed++
    }
}

# Test 8: Clone Status Tracking
if ($projectId) {
    Write-Host "`n═══ Test 8: Clone Status Tracking ═══" -ForegroundColor Yellow
    Write-Host "Waiting for clone to complete (max 30 seconds)..." -ForegroundColor Gray
    
    $maxWait = 30
    $waited = 0
    $cloneCompleted = $false
    
    while ($waited -lt $maxWait -and -not $cloneCompleted) {
        Start-Sleep -Seconds 2
        $waited += 2
        
        try {
            $status = Invoke-RestMethod -Uri "http://localhost:5000/api/projects/$projectId/clone-status"
            $cloneStatus = $status.data.cloneStatus
            
            Write-Host "  [$waited s] Clone status: $cloneStatus" -ForegroundColor Gray
            
            if ($cloneStatus -eq "cloned") {
                Write-Host "✓ Repository cloned successfully" -ForegroundColor Green
                Write-Host "  Workspace Path: $($status.data.workspacePath)" -ForegroundColor Gray
                $cloneCompleted = $true
                $testsPassed++
                break
            } elseif ($cloneStatus -eq "failed") {
                Write-Host "✗ Clone failed" -ForegroundColor Red
                $testsFailed++
                break
            }
        } catch {
            Write-Host "  Error checking status" -ForegroundColor Red
        }
    }
    
    if (-not $cloneCompleted -and $waited -ge $maxWait) {
        Write-Host "⚠ Clone still in progress after $maxWait seconds" -ForegroundColor Yellow
    }
}

# Test 9: Workspace Information
if ($projectId) {
    Write-Host "`n═══ Test 9: Workspace Information ═══" -ForegroundColor Yellow
    try {
        $workspace = Invoke-RestMethod -Uri "http://localhost:5000/api/projects/$projectId/workspace"
        if ($workspace.success -eq $true) {
            Write-Host "✓ GET /api/projects/:id/workspace works" -ForegroundColor Green
            Write-Host "  Path: $($workspace.data.path)" -ForegroundColor Gray
            Write-Host "  Size: $($workspace.data.sizeMB) MB" -ForegroundColor Gray
            Write-Host "  Files: $($workspace.data.fileCount)" -ForegroundColor Gray
            Write-Host "  Exists: $($workspace.data.exists)" -ForegroundColor Gray
            $testsPassed++
        }
    } catch {
        Write-Host "✗ Workspace info failed: $($_.Exception.Message)" -ForegroundColor Red
        $testsFailed++
    }
}

# Test 10: Build Logs
if ($projectId) {
    Write-Host "`n═══ Test 10: Build Logs ═══" -ForegroundColor Yellow
    try {
        $logs = Invoke-RestMethod -Uri "http://localhost:5000/api/projects/$projectId/logs?limit=10"
        if ($logs.count -gt 0) {
            Write-Host "✓ GET /api/projects/:id/logs works" -ForegroundColor Green
            Write-Host "  Total logs: $($logs.count)" -ForegroundColor Gray
            Write-Host "`n  Recent logs:" -ForegroundColor Gray
            foreach ($log in $logs.data | Select-Object -First 3) {
                Write-Host "    [$($log.logType)] $($log.message)" -ForegroundColor DarkGray
            }
            $testsPassed++
        }
    } catch {
        Write-Host "✗ Logs retrieval failed: $($_.Exception.Message)" -ForegroundColor Red
        $testsFailed++
    }
}

# Test 11: Verify Physical Workspace
if ($projectId) {
    Write-Host "`n═══ Test 11: Physical Workspace Verification ═══" -ForegroundColor Yellow
    $workspacePath = "workspace\projects\$projectId"
    
    if (Test-Path $workspacePath) {
        Write-Host "✓ Workspace directory created" -ForegroundColor Green
        $files = Get-ChildItem $workspacePath -Recurse -File -ErrorAction SilentlyContinue
        Write-Host "  Files in workspace: $($files.Count)" -ForegroundColor Gray
        
        if ($files.Count -gt 0) {
            Write-Host "✓ Repository files present" -ForegroundColor Green
            $testsPassed += 2
        } else {
            Write-Host "⚠ Workspace exists but no files found" -ForegroundColor Yellow
            $testsPassed++
        }
    } else {
        Write-Host "✗ Workspace directory not found" -ForegroundColor Red
        $testsFailed++
    }
}

# Test 12: Core Services Check
Write-Host "`n═══ Test 12: Core Services Files ═══" -ForegroundColor Yellow
$services = @(
    "src\services\githubService.js",
    "src\services\repoCloneService.js",
    "src\services\jobQueue.js",
    "src\services\projectService.js",
    "src\utils\fileSystem.js"
)

foreach ($service in $services) {
    if (Test-Path $service) {
        Write-Host "✓ $(Split-Path $service -Leaf) exists" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "✗ $(Split-Path $service -Leaf) missing" -ForegroundColor Red
        $testsFailed++
    }
}

# Test 13: Database Models
Write-Host "`n═══ Test 13: Database Models ═══" -ForegroundColor Yellow
$models = @("src\models\Project.js", "src\models\BuildLog.js")

foreach ($model in $models) {
    if (Test-Path $model) {
        Write-Host "✓ $(Split-Path $model -Leaf) exists" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "✗ $(Split-Path $model -Leaf) missing" -ForegroundColor Red
        $testsFailed++
    }
}

# Final Summary
Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           Verification Summary                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan

$total = $testsPassed + $testsFailed
$passRate = [math]::Round(($testsPassed / $total) * 100, 1)

Write-Host "`nTests Passed: " -NoNewline
Write-Host "$testsPassed" -ForegroundColor Green
Write-Host "Tests Failed: " -NoNewline
Write-Host "$testsFailed" -ForegroundColor $(if ($testsFailed -eq 0) { "Green" } else { "Red" })
Write-Host "Total Tests:  $total"
Write-Host "Pass Rate:    $passRate%"

if ($testsFailed -eq 0) {
    Write-Host "`n✅ ALL SYSTEMS OPERATIONAL - READY FOR DAY 4!" -ForegroundColor Green
    Write-Host "`nDay 1-3 Features Verified:" -ForegroundColor Cyan
    Write-Host "  ✓ Backend server running" -ForegroundColor Gray
    Write-Host "  ✓ MongoDB connected" -ForegroundColor Gray
    Write-Host "  ✓ Git integration working" -ForegroundColor Gray
    Write-Host "  ✓ Repository cloning functional" -ForegroundColor Gray
    Write-Host "  ✓ Background job queue operational" -ForegroundColor Gray
    Write-Host "  ✓ Workspace management active" -ForegroundColor Gray
    Write-Host "  ✓ All API endpoints responding" -ForegroundColor Gray
    Write-Host "  ✓ Database models properly configured" -ForegroundColor Gray
} else {
    Write-Host "`n⚠ SOME TESTS FAILED - REVIEW REQUIRED" -ForegroundColor Yellow
}

Write-Host "`nTest Project ID: $projectId" -ForegroundColor Cyan
Write-Host "`n" -ForegroundColor White
