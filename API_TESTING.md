# Onboarder API Testing Guide - Day 2

## Quick Start: Testing the API

### Prerequisites
- Backend server running: `npm run dev`
- MongoDB connected
- GitHub token (optional for initial testing)

---

## API Endpoints

### 1. Health Check
**Endpoint**: `GET /api/health`  
**Description**: Check if server and database are running

```bash
curl http://localhost:5000/api/health
```

**Expected Response**:
```json
{
  "status": "OK",
  "message": "Onboarder Backend is running",
  "timestamp": "2026-02-07T00:19:35.123Z",
  "environment": "development",
  "database": "Connected"
}
```

---

### 2. Create Project
**Endpoint**: `POST /api/projects`  
**Description**: Create a new project from GitHub URL

**Request**:
```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -d "{\"repoUrl\": \"https://github.com/aayush-1o/Onboarder\"}"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Project created successfully",
  "data": {
    "_id": "65c1234567890abcdef12345",
    "repoUrl": "https://github.com/aayush-1o/Onboarder",
    "name": "Onboarder",
    "owner": "aayush-1o",
    "defaultBranch": "main",
    "status": "pending",
    "createdAt": "2026-02-07T00:19:35.123Z",
    "updatedAt": "2026-02-07T00:19:35.123Z"
  }
}
```

---

### 3. List All Projects
**Endpoint**: `GET /api/projects`  
**Description**: Get all projects with pagination

**Request**:
```bash
curl http://localhost:5000/api/projects
```

**With Filters**:
```bash
curl "http://localhost:5000/api/projects?status=pending&limit=10&page=1"
```

**Expected Response**:
```json
{
  "success": true,
  "count": 1,
  "total": 1,
  "page": 1,
  "pages": 1,
  "data": [...]
}
```

---

### 4. Get Single Project
**Endpoint**: `GET /api/projects/:id`  
**Description**: Get project details by ID

**Request**:
```bash
curl http://localhost:5000/api/projects/65c1234567890abcdef12345
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "_id": "65c1234567890abcdef12345",
    "repoUrl": "https://github.com/aayush-1o/Onboarder",
    "name": "Onboarder",
    "owner": "aayush-1o",
    ...
  }
}
```

---

### 5. Get Project Logs
**Endpoint**: `GET /api/projects/:id/logs`  
**Description**: Get build logs for a project

**Request**:
```bash
curl http://localhost:5000/api/projects/65c1234567890abcdef12345/logs
```

**With Filters**:
```bash
curl "http://localhost:5000/api/projects/65c1234567890abcdef12345/logs?limit=50&level=error"
```

**Expected Response**:
```json
{
  "success": true,
  "count": 1,
  "projectId": "65c1234567890abcdef12345",
  "projectName": "Onboarder",
  "data": [
    {
      "_id": "...",
      "projectId": "65c1234567890abcdef12345",
      "logType": "info",
      "message": "Project created: aayush-1o/Onboarder",
      "level": "success",
      "phase": "initialization",
      "createdAt": "..."
    }
  ]
}
```

---

### 6. Update Project Status
**Endpoint**: `PATCH /api/projects/:id/status`  
**Description**: Update project status

**Request**:
```bash
curl -X PATCH http://localhost:5000/api/projects/65c1234567890abcdef12345/status \
  -H "Content-Type: application/json" \
  -d "{\"status\": \"analyzing\"}"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Project status updated",
  "data": {
    ...
    "status": "analyzing"
  }
}
```

---

### 7. Delete Project
**Endpoint**: `DELETE /api/projects/:id`  
**Description**: Delete project and associated logs

**Request**:
```bash
curl -X DELETE http://localhost:5000/api/projects/65c1234567890abcdef12345
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Project and associated logs deleted successfully"
}
```

---

## Testing with PowerShell (Windows)

### Using Invoke-RestMethod

**Health Check**:
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET
```

**Create Project**:
```powershell
$body = @{
  repoUrl = "https://github.com/aayush-1o/Onboarder"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/projects" -Method POST -Body $body -ContentType "application/json"
```

**List Projects**:
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/projects" -Method GET
```

---

## Error Responses

### Invalid Repository URL
```json
{
  "success": false,
  "error": "Invalid GitHub repository URL"
}
```

### Repository Not Found
```json
{
  "success": false,
  "error": "Repository not found"
}
```

### Project Already Exists
```json
{
  "success": false,
  "error": "Project already exists",
  "data": {...}
}
```

### Invalid ID
```json
{
  "success": false,
  "error": "Invalid ID format"
}
```

### Project Not Found
```json
{
  "success": false,
  "error": "Project not found"
}
```

---

## Testing Workflow

1. **Start Server**:
   ```bash
   cd c:\Users\Ayush\Desktop\Onboarder
   npm run dev
   ```

2. **Test Health Check**:
   ```bash
   curl http://localhost:5000/api/health
   ```

3. **Create Test Project** (use a real GitHub repo):
   ```bash
   curl -X POST http://localhost:5000/api/projects \
     -H "Content-Type: application/json" \
     -d "{\"repoUrl\": \"https://github.com/aayush-1o/Onboarder\"}"
   ```

4. **List Projects**:
   ```bash
   curl http://localhost:5000/api/projects
   ```

5. **Get Logs** (replace with actual ID):
   ```bash
   curl http://localhost:5000/api/projects/<ID>/logs
   ```

6. **Delete Project** (replace with actual ID):
   ```bash
   curl -X DELETE http://localhost:5000/api/projects/<ID>
   ```

---

## Next Steps

To enable full GitHub functionality:
1. Get GitHub Personal Access Token (see main documentation)
2. Add to `.env`: `GITHUB_TOKEN=your_token_here`
3. Restart server
4. Test with public and private repositories

---

## MongoDB Compass Verification

You can also verify data in MongoDB Compass:
1. Connect to `localhost:27017`
2. Open `onboarder` database
3. Check `projects` and `buildlogs` collections
4. See data created by API calls

---

**Day 2 API Testing Guide Complete** ✅
