# 🚀 Onboarder

**Automated Developer Environment Setup Tool**

Onboarder reduces developer onboarding time from hours to minutes by automatically preparing working development environments for software projects.

## 📋 Project Status

**Current Phase**: Day 1 Complete ✅  
**MVP Timeline**: 10 Days  
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

### 🔄 Day 2: Backend API & Database (NEXT)
- [ ] Create MongoDB schemas
- [ ] Implement REST API endpoints
- [ ] GitHub API integration
- [ ] Request validation

### 📋 Days 3-10: Remaining Features
See [MVP Development Plan](./docs/mvp-plan.md) for complete schedule.

## 🔌 API Endpoints (Day 1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

*More endpoints will be added in Day 2*

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
