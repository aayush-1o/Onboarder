# 🚀 Onboarder

**Automated Developer Environment Setup Tool**

Onboarder reduces developer onboarding time from hours to minutes by automatically preparing working development environments for software projects.

## 📋 Project Status

**Current Phase**: Day 3 Complete ✅  
**MVP Timeline**: 10 Days (Day 4 next)  
**Technology**: MERN Stack + Docker


## 🎯 What is Onboarder?

When developers join a new project, they often spend hours:
- Installing dependencies
- Configuring tools
- Debugging environment issues
- Getting the project to run

**Onboarder automates this entire process.**

### How It Works

1. User pastes a GitHub repository URL
2. System analyzes the project dependencies and structure
3. Tool generates a Docker-based environment
4. User clicks "Run" and gets a working setup

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **Axios** - HTTP client

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Axios** - API client

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

## 📂 Project Structure

```
onboarder/
├── src/                    # Backend source
│   ├── config/            # Configuration files
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── utils/             # Helper functions
│   └── server.js          # Entry point
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API service layer
│   │   └── App.jsx       # Main component
│   └── vite.config.js
├── .env                   # Environment variables
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB installed and running (or MongoDB Atlas account)
- Docker Desktop installed
- Git installed

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/aayush-1o/Onboarder.git
   cd Onboarder
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Set up environment variables**
   ```bash
   # Copy the example env file
   cp .env.example .env
   
   # Edit .env and configure:
   # - MONGODB_URI (your MongoDB connection string)
   # - GITHUB_TOKEN (optional for Day 1)
   ```

5. **Start MongoDB**
   ```bash
   # If using local MongoDB
   mongod
   
   # Or use MongoDB Atlas (cloud) - update MONGODB_URI in .env
   ```

### Running the Application

#### Development Mode

**Terminal 1 - Backend:**
```bash
npm run dev
```
The backend will run on `http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
The frontend will run on `http://localhost:3000`

#### Testing the Setup

1. Open `http://localhost:3000` in your browser
2. You should see the Onboarder welcome screen
3. Test the backend API: `http://localhost:5000/api/health`

## 📅 Development Timeline

### ✅ Day 1: Foundation (COMPLETED)
- [x] Project initialization
- [x] Backend setup with Express
- [x] Frontend setup with React + Vite
- [x] MongoDB configuration
- [x] Tailwind CSS integration
- [x] Basic project structure

### ✅ Day 2: Backend API & Database (COMPLETED)
- [x] Create MongoDB schemas (Project, BuildLog)
- [x] Implement REST API endpoints
- [x] GitHub API integration
- [x] Request validation & error handling
- [x] API testing guide

### ✅ Day 3: Repository Cloning (COMPLETED)
- [x] Workspace management
- [x] Git clone service  
- [x] File system utilities
- [x] Background job queue
- [x] API integration

### 🔄 Day 4: Code Analysis (NEXT)
- [ ] Tech stack detection
- [ ] Dependency analysis
- [ ] Language detection
- [ ] Framework identification

### 📋 Days 4-10: Remaining Features
See [MVP Development Plan](./docs/mvp-plan.md) for complete schedule.

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check with DB status |
| POST | `/api/projects` | Create project from GitHub URL |
| GET | `/api/projects` | List all projects (paginated) |
| GET | `/api/projects/:id` | Get project details |
| GET | `/api/projects/:id/logs` | Get build logs |
| GET | `/api/projects/:id/clone-status` | Get clone progress |
| POST | `/api/projects/:id/reclone` | Re-clone repository |
| GET | `/api/projects/:id/workspace` | Get workspace info |
| PATCH | `/api/projects/:id/status` | Update project status |
| DELETE | `/api/projects/:id` | Delete project + workspace |

**Testing Guide**: See [API_TESTING.md](./API_TESTING.md)

## 🧪 Testing the API

### Quick Test (PowerShell)
```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:5000/api/health"

# Create a project
$body = @{ repoUrl = "https://github.com/aayush-1o/Onboarder" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5000/api/projects" -Method POST -Body $body -ContentType "application/json"

# List all projects
Invoke-RestMethod -Uri "http://localhost:5000/api/projects"
```


## 🌟 Planned Features

### MVP (Days 1-10)
- ✅ Project foundation
- ⏳ Repository analysis
- ⏳ Environment detection
- ⏳ Dockerfile generation
- ⏳ Docker Compose generation
- ⏳ Container build & execution
- ⏳ Web UI for management
- ⏳ Build logs display

### Post-MVP
- User authentication
- Private repository support
- Advanced language support
- Cloud deployment
- Real-time collaboration
- CI/CD integration

## 📝 Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/onboarder
GITHUB_TOKEN=
FRONTEND_URL=http://localhost:3000

# Workspace Configuration (Day 3)
WORKSPACE_ROOT=./workspace
WORKSPACE_MAX_SIZE_MB=5000
GIT_CLONE_TIMEOUT_MS=300000
MAX_CONCURRENT_JOBS=3
JOB_RETRY_ATTEMPTS=2
```

## 🤝 Contributing

This is a learning project built as part of a 10-day MVP challenge. Contributions and suggestions are welcome!

## 👤 Author

**Ayush**
- GitHub: [@aayush-1o](https://github.com/aayush-1o)
- Email: ayushh.ofc10@gmail.com

## 📄 License

MIT License - feel free to use this project for learning and development.

## 🙏 Acknowledgments

Built as a practical solution to a common developer pain point - slow onboarding processes.

---

**Current Version**: 1.0.0 (Day 1)  
**Last Updated**: February 6, 2026
