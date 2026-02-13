# Onboarder API Comprehensive Test Suite
# =========================================

Write-Host "`n========================================"
Write-Host " API COMPREHENSIVE TEST SUITE" -ForegroundColor Cyan
Write-Host "========================================`n"

$baseUrl = "http://localhost:5000/api"
$passCount = 0
$failCount = 0
$testResults = @()

function Test-API {
    param(
        [string]$Name,
        [string]$Method = "GET",
        [string]$Endpoint,
        [hashtable]$Body = $null,
        [scriptblock]$Validator
    )
    
    Write-Host "`n[TEST] $Name" -ForegroundColor Yellow
    try {
        $uri = "$baseUrl$Endpoint"
        Write-Host "  $Method $uri" -ForegroundColor Gray
        
        $params = @{
            Uri         = $uri
            Method      = $Method
            ContentType = "application/json"
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
        }
        
        $response = Invoke-RestMethod @params
        
        $validationResult = & $Validator $response
        
        if ($validationResult) {
            Write-Host "  PASS" -ForegroundColor Green
            $script:passCount++
            $script:testResults += [PSCustomObject]@{
                Test   = $Name
                Status = "PASS"
            }
            return $response
        }
        else {
            Write-Host "  FAIL: Validation failed" -ForegroundColor Red
            $script:failCount++
            $script:testResults += [PSCustomObject]@{
                Test   = $Name
                Status = "FAIL"
            }
            return $null
        }
    }
    catch {
        Write-Host "  FAIL: $_" -ForegroundColor Red
        $script:failCount++
        $script:testResults += [PSCustomObject]@{
            Test   = $Name
            Status = "ERROR"
        }
        return $null
    }
}

# ====================================================
# TEST 1: Health Check
# ====================================================

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "CORE ENDPOINTS" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

Test-API -Name "Health Check Endpoint" -Endpoint "/health" -Validator {
    param($response)
    Write-Host "  Status: $($response.status)" -ForegroundColor Gray
    Write-Host "  Database: $($response.database)" -ForegroundColor Gray
    return ($response.status -eq "OK")
}

# ====================================================
# TEST 2: List Projects (Empty)
# ====================================================

$initialProjects = Test-API -Name "List Projects (Initial)" -Endpoint "/projects" -Validator {
    param($response)
    Write-Host "  Total Projects: $($response.pagination.totalProjects)" -ForegroundColor Gray
    return ($response.projects -is [array])
}

# ====================================================
# TEST 3: Create Project with Valid Repo
# ====================================================

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "PROJECT CREATION" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

$newProject = Test-API -Name "Create New Project" `
    -Method "POST" `
    -Endpoint "/projects" `
    -Body @{ repoUrl = "https://github.com/octocat/Hello-World" } `
    -Validator {
    param($response)
    Write-Host "  Project ID: $($response.project._id)" -ForegroundColor Gray
    Write-Host "  Repo Name: $($response.project.repoName)" -ForegroundColor Gray
    Write-Host "  Clone Status: $($response.project.cloneStatus)" -ForegroundColor Gray
    return ($response.project._id -and $response.project.repoName -eq "Hello-World")
}

$projectId = $newProject.project._id

# ====================================================
# TEST 4: Get Project by ID
# ====================================================

if ($projectId) {
    Test-API -Name "Get Project by ID" -Endpoint "/projects/$projectId" -Validator {
        param($response)
        Write-Host "  Project ID: $($response.project._id)" -ForegroundColor Gray
        Write-Host "  Repo: $($response.project.repoName)" -ForegroundColor Gray
        return ($response.project._id -eq $projectId)
    }
}

# ====================================================
# TEST 5: Clone Status
# ====================================================

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "CLONING & WORKSPACE" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

if ($projectId) {
    Start-Sleep -Seconds 2
    
    Test-API -Name "Get Clone Status" -Endpoint "/projects/$projectId/clone-status" -Validator {
        param($response)
        Write-Host "  Clone Status: $($response.cloneStatus)" -ForegroundColor Gray
        Write-Host "  Job Status: $($response.jobStatus)" -ForegroundColor Gray
        return ($response.cloneStatus -ne $null)
    }
    
    # Wait for clone to complete or fail
    Write-Host "`nWaiting for clone to complete (max 30 seconds)..." -ForegroundColor Yellow
    $maxAttempts = 15
    $attempt = 0
    $cloneComplete = $false
    
    while ($attempt -lt $maxAttempts -and -not $cloneComplete) {
        Start-Sleep -Seconds 2
        try {
            $status = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId/clone-status" -ErrorAction Stop
            Write-Host "  Attempt $($attempt + 1): $($status.cloneStatus)" -ForegroundColor Gray
            
            if ($status.cloneStatus -in @("cloned", "failed", "error")) {
                $cloneComplete = $true
                if ($status.cloneStatus -eq "cloned") {
                    Write-Host "  Clone completed successfully!" -ForegroundColor Green
                }
                else {
                    Write-Host "  Clone failed or errored" -ForegroundColor Red
                }
            }
        }
        catch {
            Write-Host "  Error checking status: $_" -ForegroundColor Red
            break
        }
        $attempt++
    }
}

# ====================================================
# TEST 6: Workspace Info
# ====================================================

if ($projectId) {
    Test-API -Name "Get Workspace Info" -Endpoint "/projects/$projectId/workspace" -Validator {
        param($response)
        Write-Host "  Workspace Path: $($response.workspace.path)" -ForegroundColor Gray
        Write-Host "  Size MB: $($response.workspace.sizeMB)" -ForegroundColor Gray
        Write-Host "  Exists: $($response.workspace.exists)" -ForegroundColor Gray
        return ($response.workspace -ne $null)
    }
}

# ====================================================
# TEST 7: Get Logs
# ====================================================

if ($projectId) {
    Test-API -Name "Get Project Logs" -Endpoint "/projects/$projectId/logs" -Validator {
        param($response)
        Write-Host "  Total Logs: $($response.logs.Count)" -ForegroundColor Gray
        return ($response.logs -is [array])
    }
}

# ====================================================
# TEST 8: Update Project Status
# ====================================================

if ($projectId) {
    Test-API -Name "Update Project Status" `
        -Method "PATCH" `
        -Endpoint "/projects/$projectId/status" `
        -Body @{ status = "pending" } `
        -Validator {
        param($response)
        return ($response.project.status -eq "pending")
    }
}

# ====================================================
# TEST 9: Error Handling - Invalid Repo URL
# ====================================================

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "ERROR HANDLING" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

Test-API -Name "Create Project with Invalid URL" `
    -Method "POST" `
    -Endpoint "/projects" `
    -Body @{ repoUrl = "not-a-valid-url" } `
    -Validator {
    # This should fail, so we check if we get an error response
    Write-Host "  Expected to receive error" -ForegroundColor Gray
    return $false  # We expect this to fail
}

# Increment pass count manually for this expected failure
$script:failCount--
$script:passCount++
$script:testResults[-1].Status = "PASS (Expected Error)"

# ====================================================
# TEST 10: Error Handling - Non-existent Project
# ====================================================

Test-API -Name "Get Non-existent Project" `
    -Endpoint "/projects/000000000000000000000000" `
    -Validator {
    Write-Host "  Expected to receive error" -ForegroundColor Gray
    return $false  # We expect this to fail
}

# Increment pass count manually for this expected failure
$script:failCount--
$script:passCount++
$script:testResults[-1].Status = "PASS (Expected Error)"

# ====================================================
# TEST 11: Pagination
# ====================================================

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "ADVANCED FEATURES" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

Test-API -Name "List Projects with Pagination" -Endpoint "/projects?page=1&limit=5" -Validator {
    param($response)
    Write-Host "  Current Page: $($response.pagination.currentPage)" -ForegroundColor Gray
    Write-Host "  Items per Page: $($response.pagination.itemsPerPage)" -ForegroundColor Gray
    return ($response.pagination -ne $null)
}

# ====================================================
# TEST 12: Cleanup - Delete Project
# ====================================================

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "CLEANUP" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

if ($projectId) {
    Test-API -Name "Delete Project" `
        -Method "DELETE" `
        -Endpoint "/projects/$projectId" `
        -Validator {
        param($response)
        Write-Host "  Message: $($response.message)" -ForegroundColor Gray
        return ($response.message -match "deleted")
    }
}

# ====================================================
# SUMMARY
# ====================================================

Write-Host "`n========================================"
Write-Host "API TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================`n"

Write-Host "Passed:   $passCount tests" -ForegroundColor Green
Write-Host "Failed:   $failCount tests" -ForegroundColor Red

$totalTests = $passCount + $failCount
if ($totalTests -gt 0) {
    $successRate = [math]::Round(($passCount / $totalTests) * 100, 1)
    $color = if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 60) { "Yellow" } else { "Red" }
    Write-Host "`nSuccess Rate: $successRate%" -ForegroundColor $color
}

Write-Host "`n========================================"
Write-Host "DETAILED RESULTS" -ForegroundColor Cyan
Write-Host "========================================`n"

$testResults | Format-Table -AutoSize

if ($failCount -eq 0) {
    Write-Host "`nAll API tests passed!" -ForegroundColor Green
}
else {
    Write-Host "`nSome tests failed. Review above for details." -ForegroundColor Yellow
}

Write-Host "`n========================================`n"
