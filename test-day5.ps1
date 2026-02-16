# Day 5: Dockerfile Generation - Testing Script
# Tests Dockerfile generation features

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:5000/api"

# Colors for output
function Write-Success { param($msg) Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Error { param($msg) Write-Host "✗ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "→ $msg" -ForegroundColor Cyan }
function Write-Section { param($msg) Write-Host "`n========== $msg ==========" -ForegroundColor Yellow }

# Test counters
$totalTests = 0
$passedTests = 0

# Test helper
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method = "GET",
        [string]$Endpoint,
        [object]$Body = $null,
        [scriptblock]$Validator
    )
    
    $global:totalTests++
    Write-Info "Testing: $Name"
    
    try {
        $uri = "$baseUrl$Endpoint"
        $params = @{
            Uri         = $uri
            Method      = $Method
            ContentType = "application/json"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @params
        
        if ($Validator) {
            $result = & $Validator $response
            if ($result) {
                Write-Success "$Name - PASSED"
                $global:passedTests++
                return $response
            }
            else {
                Write-Error "$Name - FAILED (Validation)"
                return $null
            }
        }
        else {
            Write-Success "$Name - PASSED"
            $global:passedTests++
            return $response
        }
    }
    catch {
        Write-Error "$Name - FAILED: $($_.Exception.Message)"
        return $null
    }
}

Write-Section "Day 5: Dockerfile Generation Tests"

# Check server health
Write-Section "0. Server Health Check"
Test-Endpoint -Name "Server Health" -Endpoint "/health"

# Test 1: Create test project and wait for Dockerfile generation
Write-Section "1. Create Project & Auto-Generate Dockerfile"
$project = Test-Endpoint -Name "Create Node.js Project" `
    -Method "POST" `
    -Endpoint "/projects" `
    -Body @{ repoUrl = "https://github.com/expressjs/express" } `
    -Validator {
    param($response)
    return $response.success -and $response.data.project._id
}

if ($project) {
    $projectId = $project.data.project._id
    Write-Info "Project created: $projectId"
    Write-Info "Waiting 45 seconds for clone + analysis + Dockerfile generation..."
    Start-Sleep -Seconds 45
    
    # Check Dockerfile status
    Test-Endpoint -Name "Check Dockerfile Status" `
        -Endpoint "/projects/$projectId" `
        -Validator {
        param($response)
        Write-Host "  Dockerfile Status: $($response.data.dockerfileStatus)" -ForegroundColor Cyan
        return $response.success
    }
}

# Test 2: Get Dockerfile content
Write-Section "2. Get Generated Dockerfile"
if ($projectId) {
    $dockerfile = Test-Endpoint -Name "GET /projects/:id/dockerfile" `
        -Endpoint "/projects/$projectId/dockerfile" `
        -Validator {
        param($response)
        if ($response.success -and $response.data.content) {
            Write-Host "  Base Image: $($response.data.baseImage)" -ForegroundColor Cyan
            Write-Host "  Strategy: $($response.data.strategy)" -ForegroundColor Cyan
            Write-Host "  Optimizations: $($response.data.optimizations -join ', ')" -ForegroundColor Cyan
            Write-Host "  Content Preview:" -ForegroundColor Cyan
            $preview = $response.data.content.Substring(0, [Math]::Min(200, $response.data.content.Length))
            Write-Host "  $preview..." -ForegroundColor Gray
            return $true
        }
        return $false
    }
}

# Test 3: Get Docker configuration
Write-Section "3. Get Docker Configuration"
if ($projectId) {
    Test-Endpoint -Name "GET /projects/:id/docker-config" `
        -Endpoint "/projects/$projectId/docker-config" `
        -Validator {
        param($response)
        if ($response.success -and $response.data) {
            Write-Host "  Port: $($response.data.port)" -ForegroundColor Cyan
            Write-Host "  Environment Vars: $($response.data.environmentVars.Count)" -ForegroundColor Cyan
            Write-Host "  Health Check: $($response.data.healthCheck.enabled)" -ForegroundColor Cyan
            if ($response.data.healthCheck.enabled) {
                Write-Host "  Health Endpoint: $($response.data.healthCheck.endpoint)" -ForegroundColor Cyan
            }
            return $true
        }
        return $false
    }
}

# Test 4: Manual Dockerfile generation trigger
Write-Section "4. Manual Dockerfile Generation"
$manualProject = Test-Endpoint -Name "Create Python Project" `
    -Method "POST" `
    -Endpoint "/projects" `
    -Body @{ repoUrl = "https://github.com/pallets/flask" } `
    -Validator {
    param($response)
    return $response.success -and $response.data.project._id
}

if ($manualProject) {
    $manualProjectId = $manualProject.data.project._id
    Write-Info "Waiting 30 seconds for clone + analysis..."
    Start-Sleep -Seconds 30
    
    # Manually trigger Dockerfile generation
    Test-Endpoint -Name "POST /projects/:id/generate-dockerfile" `
        -Method "POST" `
        -Endpoint "/projects/$manualProjectId/generate-dockerfile" `
        -Validator {
        param($response)
        if ($response.success -and $response.data.jobId) {
            Write-Host "  Job ID: $($response.data.jobId)" -ForegroundColor Cyan
            return $true
        }
        return $false
    }
    
    Write-Info "Waiting 10 seconds for Dockerfile generation..."
    Start-Sleep -Seconds 10
}

# Test 5: Update Dockerfile with custom content
Write-Section "5. Update Dockerfile Content"
if ($projectId) {
    $customDockerfile = @"
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
"@
    
    Test-Endpoint -Name "PUT /projects/:id/dockerfile" `
        -Method "PUT" `
        -Endpoint "/projects/$projectId/dockerfile" `
        -Body @{ content = $customDockerfile } `
        -Validator {
        param($response)
        return $response.success -and $response.message -like "*updated*"
    }
}

# Test 6: Component File Existence
Write-Section "6. Component File Existence"
$files = @(
    "src/services/dockerfileGeneratorService.js",
    "src/utils/templateParser.js",
    "src/templates/dockerfiles/nodejs.dockerfile.template",
    "src/templates/dockerfiles/python.dockerfile.template",
    "src/templates/dockerfiles/go.dockerfile.template"
)

foreach ($file in $files) {
    $totalTests++
    if (Test-Path $file) {
        Write-Success "File exists: $file"
        $passedTests++
    }
    else {
        Write-Error "File missing: $file"
    }
}

# Test 7: Database Schema Validation
Write-Section "7. Database Schema Validation"
if ($projectId) {
    Test-Endpoint -Name "Verify Dockerfile Fields in Project" `
        -Endpoint "/projects/$projectId" `
        -Validator {
        param($response)
        $project = $response.data
        $hasDockerfileStatus = $null -ne $project.dockerfileStatus
        $hasDockerfile = $null -ne $project.dockerfile
        $hasDockerConfig = $null -ne $project.dockerConfig
            
        Write-Host "  dockerfileStatus: $hasDockerfileStatus" -ForegroundColor Cyan
        Write-Host "  dockerfile: $hasDockerfile" -ForegroundColor Cyan
        Write-Host "  dockerConfig: $hasDockerConfig" -ForegroundColor Cyan
            
        return $hasDockerfileStatus -and $hasDockerfile -and $hasDockerConfig
    }
}

# Summary
Write-Section "Test Summary"
Write-Host ""
Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $($totalTests - $passedTests)" -ForegroundColor Red
$successRate = [math]::Round(($passedTests / $totalTests) * 100, 1)
Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } else { "Yellow" })

if ($successRate -ge 80) {
    Write-Host "`n✅ Day 5 tests PASSED!" -ForegroundColor Green
}
else {
    Write-Host "`n⚠️  Some Day 5 tests failed" -ForegroundColor Yellow
}
