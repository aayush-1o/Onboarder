# Day 3 Testing Script

Write-Host "`n=== Day 3 API Testing ===`n" -ForegroundColor Cyan

# Test 1: Create project with cloning
Write-Host "Test 1: Creating project with repository cloning..." -ForegroundColor Yellow
$body1 = @{
    repoUrl = "https://github.com/octocat/Hello-World"
} | ConvertTo-Json

try {
    $project = Invoke-RestMethod -Uri "http://localhost:5000/api/projects" -Method POST -Body $body1 -ContentType "application/json"
    Write-Host "✓ Project created" -ForegroundColor Green
    Write-Host "  Project ID: $($project.data._id)"
    Write-Host "  Job ID: $($project.data.jobId)"
    Write-Host "  Clone Status: $($project.data.cloneStatus)"
    $projectId = $project.data._id
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Check clone status
Write-Host "`nTest 2: Checking clone status..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

try {
    $status = Invoke-RestMethod -Uri "http://localhost:5000/api/projects/$projectId/clone-status"
    Write-Host "✓ Clone status retrieved" -ForegroundColor Green
    Write-Host "  Clone Status: $($status.data.cloneStatus)"
    Write-Host "  Workspace Path: $($status.data.workspacePath)"
    if ($status.data.jobStatus) {
        Write-Host "  Job Status: $($status.data.jobStatus.status)"
    }
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Wait for cloning to complete
Write-Host "`nTest 3: Waiting for clone to complete (max 30 seconds)..." -ForegroundColor Yellow
$maxWait = 30
$waited = 0

while ($waited -lt $maxWait) {
    Start-Sleep -Seconds 2
    $waited += 2
    
    try {
        $status = Invoke-RestMethod -Uri "http://localhost:5000/api/projects/$projectId/clone-status"
        $cloneStatus = $status.data.cloneStatus
        
        Write-Host "  Status: $cloneStatus (${waited}s)" -NoNewline
        
        if ($cloneStatus -eq "cloned") {
            Write-Host ""
            Write-Host "✓ Clone completed successfully" -ForegroundColor Green
            break
        } elseif ($cloneStatus -eq "failed") {
            Write-Host ""
            Write-Host "✗ Clone failed" -ForegroundColor Red
            break
        }
        
        Write-Host ""
    } catch {
        Write-Host " (error)" -ForegroundColor Red
    }
}

# Test 4: Get workspace information
Write-Host "`nTest 4: Getting workspace information..." -ForegroundColor Yellow
try {
    $workspace = Invoke-RestMethod -Uri "http://localhost:5000/api/projects/$projectId/workspace"
    Write-Host "✓ Workspace info retrieved" -ForegroundColor Green
    Write-Host "  Path: $($workspace.data.path)"
    Write-Host "  Size: $($workspace.data.sizeMB) MB"
    Write-Host "  Files: $($workspace.data.fileCount)"
    Write-Host "  Exists: $($workspace.data.exists)"
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Get project details
Write-Host "`nTest 5: Getting full project details..." -ForegroundColor Yellow
try {
    $fullProject = Invoke-RestMethod -Uri "http://localhost:5000/api/projects/$projectId"
    Write-Host "✓ Project details retrieved" -ForegroundColor Green
    Write-Host "  Name: $($fullProject.data.name)"
    Write-Host "  Owner: $($fullProject.data.owner)"
    Write-Host "  Status: $($fullProject.data.status)"
    Write-Host "  Clone Status: $($fullProject.data.cloneStatus)"
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Get build logs
Write-Host "`nTest 6: Getting build logs..." -ForegroundColor Yellow
try {
    $logs = Invoke-RestMethod -Uri "http://localhost:5000/api/projects/$projectId/logs?limit=20"
    Write-Host "✓ Build logs retrieved" -ForegroundColor Green
    Write-Host "  Total logs: $($logs.count)"
    
    Write-Host "`n  Recent logs:" -ForegroundColor Gray
    foreach ($log in $logs.data | Select-Object -First 5) {
        Write-Host "    [$($log.logType)] $($log.message)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Verify workspace directory exists
Write-Host "`nTest 7: Verifying workspace directory..." -ForegroundColor Yellow
$workspacePath = "C:\Users\Ayush\Desktop\Onboarder\workspace\projects\$projectId"
if (Test-Path $workspacePath) {
    Write-Host "✓ Workspace directory exists" -ForegroundColor Green
    $files = Get-ChildItem $workspacePath -Recurse -File
    Write-Host "  Files in workspace: $($files.Count)"
} else {
    Write-Host "✗ Workspace directory not found" -ForegroundColor Red
}

Write-Host "`n=== Testing Complete ===`n" -ForegroundColor Cyan
Write-Host "Project ID for manual testing: $projectId" -ForegroundColor Yellow
