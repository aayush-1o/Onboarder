# Day 4 Testing Guide

This guide covers testing the code analysis features implemented in Day 4.

## Prerequisites

- Backend server running (`npm run dev`)
- MongoDB connected
- At least one project cloned (for analysis testing)

## Features to Test

### 1. Automatic Analysis
When a project is cloned, analysis should trigger automatically:
```powershell
# Create a new project
$body = '{"repoUrl": "https://github.com/expressjs/express"}'
Invoke-RestMethod -Uri "http://localhost:5000/api/projects" -Method POST -Body $body -ContentType "application/json"

# Wait ~10-30 seconds for clone and analysis to complete
```

### 2. Get Analysis Results
```powershell
GET /api/projects/:id/analysis
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "analysisStatus": "completed",
    "analysis": {
      "languages": [
        { "name": "JavaScript", "percentage": 85.5, "fileCount": 120 }
      ],
      "primaryLanguage": "JavaScript",
      "frameworks": [
        { "name": "Express.js", "type": "backend", "confidence": 0.95 }
      ],
      "hasDatabase": false,
      "databases": [],
      "buildTools": ["npm"],
      "packageManager": "npm"
    },
    "dependencies": {
      "files": ["package.json"],
      "runtime": [...],
      "development": [...],
      "totalCount": 24,
      "ecosystems": ["npm"]
    },
    "analyzedAt": "2026-02-13T..."
  }
}
```

### 3. Manual Analysis Trigger
```powershell
POST /api/projects/:id/analyze
```

**Use Cases:**
- Re-analyze after code changes
- Analyze projects cloned before Day 4
- Force refresh of analysis data

### 4. Get Dependencies
```powershell
GET /api/projects/:id/dependencies
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "files": ["package.json"],
    "ecosystems": ["npm"],
    "runtime": [
      { "name": "express", "version": "4.18.0", "ecosystem": "npm" }
    ],
    "development": [
      { "name": "nodemon", "version": "3.0.0", "ecosystem": "npm" }
    ],
    "totalCount": 24
  }
}
```

### 5. Get Tech Stack Summary
```powershell
GET /api/projects/:id/tech-stack
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "primaryLanguage": "JavaScript",
    "languages": [
      { "name": "JavaScript", "percentage": 85.5 }
    ],
    "frameworks": ["Express.js", "React"],
    "databases": ["MongoDB"],
    "hasDatabase": true,
    "buildTools": ["Webpack", "npm"],
    "packageManager": "npm"
  }
}
```

## Automated Test Script

Run the comprehensive test script:
```powershell
powershell -ExecutionPolicy Bypass -File test-day4.ps1
```

**Test Coverage:**
- ✓ API endpoint availability
- ✓ Full analysis workflow
- ✓ Component file existence
- ✓ Language detection
- ✓ Framework detection
- ✓ Dependency parsing

## Supported Languages & Ecosystems

| Language | Dependency Files | Frameworks Detected |
|----------|------------------|---------------------|
| **JavaScript/Node.js** | package.json | Express, React, Next.js, Vue, Angular, NestJS |
| **Python** | requirements.txt, pyproject.toml | Django, Flask, FastAPI |
| **Java** | pom.xml, build.gradle | Spring Boot |
| **Go** | go.mod | Gin, Echo |
| **Ruby** | Gemfile | Ruby on Rails |
| **PHP** | composer.json | Laravel, Symfony |
| **C#** | *.csproj | (Basic detection) |

## Verification Checklist

- [ ] Analysis triggers automatically after clone
- [ ] Languages detected correctly
- [ ] Frameworks identified with confidence scores
- [ ] Dependencies parsed from package files
- [ ] Database usage detected
- [ ] Build tools  identified
- [ ] All 4 new API endpoints respond
- [ ] Analysis status tracking works

## Troubleshooting

### Analysis Status "pending"
- Clone may not be complete yet
- Check `cloneStatus` field
- Wait for job queue to process

### Analysis Status "failed"
- Check build logs: `GET /api/projects/:id/logs?phase=analysis`
- Verify workspace path exists
- Check for permission issues

### No Dependencies Found
- Project may not have dependency files
- Check `analysis.languages` to confirm project was scanned
- Some projects use non-standard package managers

## Example Test Flow

```powershell
# 1. Create project
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/projects" `
    -Method POST `
    -Body '{"repoUrl":"https://github.com/facebook/react"}' `
    -ContentType "application/json"

$projectId = $response.data.project._id

# 2. Wait for analysis
Start-Sleep -Seconds 20

# 3. Check status
$status = Invoke-RestMethod -Uri "http://localhost:5000/api/projects/$projectId"
Write-Host "Clone: $($status.data.cloneStatus)"
Write-Host "Analysis: $($status.data.analysisStatus)"

# 4. Get tech stack
$techStack = Invoke-RestMethod -Uri "http://localhost:5000/api/projects/$projectId/tech-stack"
$techStack.data | ConvertTo-Json -Depth 3

# 5. Get dependencies
$deps = Invoke-RestMethod -Uri "http://localhost:5000/api/projects/$projectId/dependencies"
Write-Host "Total dependencies: $($deps.data.totalCount)"
```

## Expected Behavior

**For a Node.js/Express project:**
- Primary Language: JavaScript
- Frameworks: Express.js (high confidence)
- Dependencies: All npm packages listed
- Build Tools: npm, possibly Webpack/Vite
- Package Manager: npm/yarn/pnpm (detected from lock files)

**For a Python/Django project:**
- Primary Language: Python
- Frameworks: Django (high confidence)
- Dependencies: All pip packages listed
- Databases: Usually PostgreSQL/MySQL detected

**For a multi-language project:**
- Languages: Listed by percentage
- Primary Language: Highest percentage (excluding HTML/CSS/JSON)
- Frameworks: Detected for each language
- Dependencies: Combined from all ecosystems
