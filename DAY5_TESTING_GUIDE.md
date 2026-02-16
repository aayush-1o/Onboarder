# Day 5: Dockerfile Generation - Testing Guide

## Overview

This guide covers testing the automated Dockerfile generation feature implemented in Day 5. The system generates production-ready, optimized Dockerfiles based on code analysis from Day 4.

---

## Prerequisites

### Required
- ✅ Server running: `npm run dev`
- ✅ MongoDB connected
- ✅ Day 1-4 features working (clone, analysis)
- ✅ Git installed

### Optional
- Docker Desktop (for building generated Dockerfiles)

---

## Quick Test

Run the comprehensive test script:

```powershell
powershell -ExecutionPolicy Bypass -File test-day5.ps1
```

**Expected Output:** 80%+ success rate

---

## Features to Test

### 1. Automatic Dockerfile Generation

After a project is cloned and analyzed, a Dockerfile is automatically generated.

**Test Steps:**
```powershell
# 1. Create a new project
$body = '{"repoUrl": "https://github.com/expressjs/express"}'
Invoke-RestMethod -Uri "http://localhost:5000/api/projects" `
  -Method POST -Body $body -ContentType "application/json"

# 2. Wait 30-45 seconds for clone → analysis → Dockerfile generation

# 3. Check status
Invoke-RestMethod -Uri "http://localhost:5000/api/projects/{id}"
```

**Expected Result:**
```json
{
  "dockerfileStatus": "generated",
  "dockerfile": {
    "generated": true,
    "baseImage": "node:18-alpine",
    "strategy": "multi-stage",
    ...
  }
}
```

---

### 2. Get Dockerfile Content

Retrieve the generated Dockerfile.

```powershell
GET /api/projects/{id}/dockerfile
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "content": "FROM node:18-alpine\nWORKDIR /app\n...",
    "baseImage": "node:18-alpine",
    "strategy": "multi-stage",
    "optimizations": [
      "multi-stage",
      "layer-caching",
      "non-root-user",
      "minimal-image"
    ],
    "generatedAt": "2026-02-16T...",
    "dockerfileStatus": "generated"
  }
}
```

---

### 3. Get Docker Configuration

Get port, environment variables, and health check settings.

```powershell
GET /api/projects/{id}/docker-config
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "port": 3000,
    "environmentVars": [
      { "key": "PORT", "value": "3000", "required": true },
      { "key": "NODE_ENV", "value": "production", "required": false }
    ],
    "volumes": [],
    "healthCheck": {
      "enabled": true,
      "endpoint": "/health",
      "interval": "30s"
    },
    "baseImage": "node:18-alpine"
  }
}
```

---

### 4. Manual Dockerfile Generation

Trigger generation manually (useful for re-generation).

```powershell
POST /api/projects/{id}/generate-dockerfile
```

**Use Cases:**
- Re-generate after code changes
- Generate for old projects (cloned before Day 5)
- Force refresh if auto-generation failed

**Expected Response:**
```json
{
  "success": true,
  "message": "Dockerfile generation started",
  "data": {
    "jobId": "...",
    "projectId": "...",
    "dockerfileStatus": "generating"
  }
}
```

---

### 5. Update Dockerfile

Manually edit the Dockerfile before building.

```powershell
$customDockerfile = @"
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 8080
CMD ["node", "index.js"]
"@

Invoke-RestMethod -Uri "http://localhost:5000/api/projects/{id}/dockerfile" `
  -Method PUT `
  -Body (@{ content = $customDockerfile } | ConvertTo-Json) `
  -ContentType "application/json"
```

---

## Component Verification

### Check Template Files

```powershell
# Verify templates exist
Test-Path src/templates/dockerfiles/nodejs.dockerfile.template
Test-Path src/templates/dockerfiles/python.dockerfile.template
Test-Path src/templates/dockerfiles/java-maven.dockerfile.template
Test-Path src/templates/dockerfiles/go.dockerfile.template
Test-Path src/templates/dockerfiles/ruby.dockerfile.template
Test-Path src/templates/dockerfiles/php.dockerfile.template
```

### Check Service Files

```powershell
Test-Path src/services/dockerfileGeneratorService.js
Test-Path src/utils/templateParser.js
```

---

## Supported Technologies

### Languages & Frameworks

| Language | Base Image | Frameworks Supported |
|----------|-----------|---------------------|
| JavaScript/TypeScript | node:18-alpine | Express, Next.js, React, Vue |
| Python | python:3.11-slim | Django, Flask, FastAPI |
| Java | openjdk:17-jdk-slim | Spring Boot |
| Go | golang:1.21-alpine | Gin, Echo |
| Ruby | ruby:3.2-alpine | Rails |
| PHP | php:8.2-fpm-alpine | Laravel, Symfony |

### Package Managers Detected

- **Node.js:** npm, yarn, pnpm (from lock files)
- **Python:** pip, poetry, pipenv
- **Java:** maven, gradle
- **Go:** go modules
- **Ruby:** bundler
- **PHP:** composer

---

## Validation Checklist

Use this checklist when testing:

### Automatic Generation
- [ ] Dockerfile generated after clone + analysis
- [ ] `dockerfileStatus` changes: pending → generating → generated
- [ ] Dockerfile saved to database
- [ ] Dockerfile saved to workspace/project/Dockerfile

### Dockerfile Quality
- [ ] Multi-stage build used (when applicable)
- [ ] Non-root user created
- [ ] Minimal base image (alpine/slim)
- [ ] Health check configured
- [ ] Appropriate port exposed

### API Endpoints
- [ ] GET /dockerfile returns content
- [ ] POST /generate-dockerfile triggers job
- [ ] PUT /dockerfile updates content
- [ ] GET /docker-config returns config

### Framework Detection
- [ ] Express projects get port 3000, /health endpoint
- [ ] Django projects get port 8000, gunicorn
- [ ] React projects get nginx + port 80
- [ ] Correct package manager detected

---

## Building Generated Dockerfiles

To test if generated Dockerfiles actually work:

```bash
# 1. Get Dockerfile content
$dockerfile = (Invoke-RestMethod -Uri "http://localhost:5000/api/projects/{id}/dockerfile").data.content

# 2. Save to file
Set-Content -Path "Dockerfile" -Value $dockerfile

# 3. Build image
docker build -t test-app .

# 4. Run container
docker run -p 3000:3000 test-app
```

**Expected:** Container builds and runs successfully

---

## Troubleshooting

### Issue: "Dockerfile not generated yet"

**Possible Causes:**
- Analysis not complete (`analysisStatus` not 'completed')
- Job queue error
- Workspace path missing

**Solution:**
1. Check analysis status: `GET /projects/{id}`
2. Manually trigger: `POST /projects/{id}/generate-dockerfile`
3. Check logs: `GET /projects/{id}/logs`

### Issue: "Project analysis must be completed"

**Cause:** Trying to generate Dockerfile before analysis finishes

**Solution:** Wait for `analysisStatus: 'completed'`, then retry

### Issue: Generated Dockerfile has placeholder variables

**Cause:** Template parser might not be working correctly

**Solution:** Check `templateParser.js` is loaded correctly

---

## Example Test Flows

### Flow 1: Node.js Express Project

```powershell
# Create project
$project = Invoke-RestMethod -Uri "http://localhost:5000/api/projects" `
  -Method POST `
  -Body '{"repoUrl": "https://github.com/expressjs/express"}' `
  -ContentType "application/json"

$id = $project.data.project._id

# Wait for auto-generation
Start-Sleep -Seconds 45

# Get Dockerfile
$dockerfile = Invoke-RestMethod -Uri "http://localhost:5000/api/projects/$id/dockerfile"

# Verify it's Node.js
$dockerfile.data.baseImage  # Should be node:18-alpine
$dockerfile.data.strategy   # Should be multi-stage
```

### Flow 2: Python Django Project

```powershell
# Create project
$project = Invoke-RestMethod -Uri "http://localhost:5000/api/projects" `
  -Method POST `
  -Body '{"repoUrl": "https://github.com/django/django"}' `
  -ContentType "application/json"

$id = $project.data.project._id

# Wait
Start-Sleep -Seconds 45

# Get config
$config = Invoke-RestMethod -Uri "http://localhost:5000/api/projects/$id/docker-config"

# Verify Django settings
$config.data.port  # Should be 8000
```

---

## Success Criteria

✅ **Pass if:**
- Dockerfiles generate automatically after analysis
- Generated Dockerfiles are valid and build successfully
- All 4 API endpoints work correctly
- Framework-specific configurations applied
- Database fields populated correctly
- At least 80% test success rate

---

## Next Steps

After Day 5 testing passes:
- **Day 6-7:** Docker Compose generation
- Integration with Docker commands
- Container orchestration
