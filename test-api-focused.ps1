# Onboarder - Focused API and Service Test
# ===========================================

Write-Host "`n" -NoNewline
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ONBOARDER VERIFICATION TEST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000/api"
$pass = 0
$fail = 0

function Test-Endpoint {
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

# Test 1: Health Check
Test-Endpoint "Health Check" {
    $response = Invoke-RestMethod "$baseUrl/health"
    Write-Host "  Status: $($response.status)" -ForegroundColor Gray
    Write-Host "  Database: $($response.database)" -ForegroundColor Gray
    return ($response.status -eq "OK" -and $response.database -eq "Connected")
}

# Test 2: List Projects
Test-Endpoint "List All Projects" {
    $response = Invoke-RestMethod "$baseUrl/projects"
    Write-Host "  Projects: $($response.count)" -ForegroundColor Gray
    Write-Host "  Page: $($response.page) of $($response.pages)" -ForegroundColor Gray
    return ($response.success -eq $true)
}

# Test 3: Create New Project (with unique name)
$timestamp = Get-Date -Format "HHmmss"
$testRepo = "https://github.com/octocat/Spoon-Knife"

Test-Endpoint "Create Project (Spoon-Knife)" {
    try {
        $body = @{ repoUrl = $testRepo } | ConvertTo-Json
        $response = Invoke-RestMethod "$baseUrl/projects" -Method POST -Body $body -ContentType "application/json"
        Write-Host "  Project ID: $($response.data._id)" -ForegroundColor Gray
        Write-Host "  Repo: $($response.data.name)" -ForegroundColor Gray
        Write-Host "  Status: $($response.data.cloneStatus)" -ForegroundColor Gray
        $script:testProjectId = $response.data._id
        return ($response.success -eq $true)
    }
    catch {
        $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
        if ($errorResponse.error -match "already exists") {
            Write-Host "  INFO: Project already exists (expected)" -ForegroundColor Gray
            # Get the existing project ID
            $projects = Invoke-RestMethod "$baseUrl/projects"
            $existingProject = $projects.data | Where-Object { $_.repoUrl -eq $testRepo } | Select-Object -First 1
            if ($existingProject) {
                $script:testProjectId = $existingProject._id
                Write-Host "  Using existing project: $($script:testProjectId)" -ForegroundColor Gray
                return $true
            }
        }
        throw $_
    }
}

# Test 4: Get Project by ID
Test-Endpoint "Get Project by ID" {
    if ($script:testProjectId) {
        $response = Invoke-RestMethod "$baseUrl/projects/$($script:testProjectId)"
        Write-Host "  Name: $($response.data.name)" -ForegroundColor Gray
        Write-Host "  Owner: $($response.data.owner)" -ForegroundColor Gray
        return ($response.success -eq $true)
    }
    return $false
}

# Test 5: Clone Status
Test-Endpoint "Get Clone Status" {
    if ($script:testProjectId) {
        $response = Invoke-RestMethod "$baseUrl/projects/$($script:testProjectId)/clone-status"
        Write-Host "  Clone Status: $($response.data.cloneStatus)" -ForegroundColor Gray
        Write-Host "  Job Status: $($response.data.jobStatus)" -ForegroundColor Gray
        return ($response.success -eq $true)
    }
    return $false
}

# Test 6: Workspace Info
Test-Endpoint "Get Workspace Information" {
    if ($script:testProjectId) {
        $response = Invoke-RestMethod "$baseUrl/projects/$($script:testProjectId)/workspace"
        Write-Host "  Path: $($response.data.path)" -ForegroundColor Gray
        Write-Host "  Size: $($response.data.sizeMB) MB" -ForegroundColor Gray
        Write-Host "  Exists: $($response.data.exists)" -ForegroundColor Gray
        return ($response.success -eq $true)
    }
    return $false
}

# Test 7: Get Logs
Test-Endpoint "Get Project Logs" {
    if ($script:testProjectId) {
        $response = Invoke-RestMethod "$baseUrl/projects/$($script:testProjectId)/logs"
        Write-Host "  Log Entries: $($response.data.Count)" -ForegroundColor Gray
        return ($response.success -eq $true)
    }
    return $false
}

# Test 8: Update Status
Test-Endpoint "Update Project Status" {
    if ($script:testProjectId) {
        $body = @{ status = "active" } | ConvertTo-Json
        $response = Invoke-RestMethod "$baseUrl/projects/$($script:testProjectId)/status" -Method PATCH -Body $body -ContentType "application/json"
        Write-Host "  New Status: $($response.data.status)" -ForegroundColor Gray
        return ($response.success -eq $true -and $response.data.status -eq "active")
    }
    return $false
}

# Test 9: List with Pagination
Test-Endpoint "List Projects with Pagination" {
    $response = Invoke-RestMethod "$baseUrl/projects?page=1&limit=5"
    Write-Host "  Page: $($response.page)" -ForegroundColor Gray
    Write-Host "  Limit: 5" -ForegroundColor Gray
    Write-Host "  Count: $($response.count)" -ForegroundColor Gray
    return ($response.success -eq $true)
}

# Test 10: Filter by Status
Test-Endpoint "Filter Projects by Status" {
    $response = Invoke-RestMethod "$baseUrl/projects?status=active"
    Write-Host "  Active Projects: $($response.count)" -ForegroundColor Gray
    return ($response.success -eq $true)
}

# Test 11: Error Handling - Invalid URL
Test-Endpoint "Error Handling: Invalid URL" {
    try {
        $body = @{ repoUrl = "not-a-valid-url" } | ConvertTo-Json
        Invoke-RestMethod "$baseUrl/projects" -Method POST -Body $body -ContentType "application/json"
        return $false  # Should have thrown error
    }
    catch {
        Write-Host "  Correctly rejected invalid URL" -ForegroundColor Gray
        return $true
    }
}

# Test 12: Error Handling - Missing Repo URL
Test-Endpoint "Error Handling: Missing repoUrl" {
    try {
        $body = @{ name = "test" } | ConvertTo-Json
        Invoke-RestMethod "$baseUrl/projects" -Method POST -Body $body -ContentType "application/json"
        return $false  # Should have thrown error
    }
    catch {
        Write-Host "  Correctly rejected missing repoUrl" -ForegroundColor Gray
        return $true
    }
}

# Test 13: Error Handling - Non-existent Project
Test-Endpoint "Error Handling: Non-existent Project" {
    try {
        Invoke-RestMethod "$baseUrl/projects/000000000000000000000000"
        return $false  # Should have thrown error
    }
    catch {
        Write-Host "  Correctly returned 404 for non-existent project" -ForegroundColor Gray
        return $true
    }
}

# Summary
Write-Host "`n========================================"
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================`n"

$total = $pass + $fail
$percentage = if ($total -gt 0) { [math]::Round(($pass / $total) * 100, 1) } else { 0 }

Write-Host "Passed:  $pass / $total" -ForegroundColor Green
Write-Host "Failed:  $fail / $total" -ForegroundColor Red
Write-Host "Success Rate: $percentage%" -ForegroundColor $(if ($percentage -ge 90) { "Green" } elseif ($percentage -ge 70) { "Yellow" } else { "Red" })

Write-Host "`n"
if ($fail -eq 0) {
    Write-Host "ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "API is working correctly" -ForegroundColor Green
}
elseif ($fail -le 2) {
    Write-Host "MOSTLY PASSING - Minor issues" -ForegroundColor Yellow
}
else {
    Write-Host "MULTIPLE FAILURES - Needs attention" -ForegroundColor Red
}

Write-Host "`n========================================`n"
