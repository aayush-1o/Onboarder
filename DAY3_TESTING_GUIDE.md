# Day 3 API Testing Guide

This guide contains manual testing commands for Day 3 functionality. Run these commands in PowerShell.

## Prerequisites
- Backend server must be running: `npm run dev`
- MongoDB must be connected

## Test 1: Create Project with Cloning

```powershell
$body = '{"repoUrl": "https://github.com/octocat/Hello-World"}'
Invoke-RestMethod -Uri "http://localhost:5000/api/projects" -Method POST -Body $body -ContentType "application/json"
```

**Expected**: Project created with `jobId` and `cloneStatus: "pending"`

Save the `_id` from the response for subsequent tests!

## Test 2: Check Health Endpoint

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health"
```

**Expected**: Status OK, MongoDB Connected

## Test 3: Get All Projects

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/projects"
```

**Expected**: List of projects including the newly created one

## Test 4: Get Clone Status

Replace `{projectId}` with the actual project ID from Test 1:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/projects/{projectId}/clone-status"
```

**Expected**: Clone status showing current progress (pending → cloning → cloned)

## Test 5: Get Workspace Information  

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/projects/{projectId}/workspace"
```

**Expected**: Workspace path, size, file count, and existence status

## Test 6: Get Build Logs

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/projects/{projectId}/logs"
```

**Expected**: Array of logs including 'git', 'queue', and 'workspace' log types

## Test 7: Verify Workspace Directory

Replace `{projectId}` with actual ID:

```powershell
Test-Path "C:\Users\Ayush\Desktop\Onboarder\workspace\projects\{projectId}"
Get-ChildItem "C:\Users\Ayush\Desktop\Onboarder\workspace\projects\{projectId}" -Recurse | Measure-Object -Property Length -Sum
```

**Expected**: Directory exists with files from the cloned repository

## Test 8: Reclone Repository

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/projects/{projectId}/reclone" -Method POST
```

**Expected**: New job created, status reset to cloning

## Test 9: Delete Project with Cleanup

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/projects/{projectId}" -Method DELETE
```

**Expected**: Project deleted, workspace removed

Verify deletion:
```powershell
Test-Path "C:\Users\Ayush\Desktop\Onboarder\workspace\projects\{projectId}"
```

**Expected**: False

## Test 10: Test Error Handling (Invalid URL)

```powershell
$badBody = '{"repoUrl": "https://github.com/invalid/nonexistent-repo-abc123xyz"}'
Invoke-RestMethod -Uri "http://localhost:5000/api/projects" -Method POST -Body $badBody -ContentType "application/json"
```

**Expected**: Project created, but cloning should eventually fail gracefully

## Verification Checklist

- [ ] Git validation passes on server startup
- [ ] Workspace directories created successfully
- [ ] Small repository clones successfully
- [ ] Clone status updates in real-time
- [ ] Job queue processes clone requests
- [ ] Database fields update correctly (cloneStatus, clonedAt, workspaceSize)
- [ ] Build logs capture all operations (git, workspace, queue types)
- [ ] Invalid repository URLs fail gracefully
- [ ] Project deletion removes workspace directory
- [ ] Reclone functionality works
- [ ] All API endpoints return correct data

## Common Issues

### Issue: Clone takes too long
- Check server console for Git output
- Verify network connectivity
- Check workspace folder size limits

### Issue: Workspace directory not created
- Verify Git is installed
- Check file system permissions
- Review server logs for errors

### Issue: Clone fails immediately
- Verify repository URL format
- Check if repository is public
- Review Git output in server console
