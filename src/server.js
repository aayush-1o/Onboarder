const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Onboarder Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// API Routes
app.use('/api/projects', require('./routes/projectRoutes'));

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

// Connect to database and initialize services
connectDB();

// Initialize workspace and validate Git
(async () => {
  try {
    const fileSystem = require('./utils/fileSystem');
    const repoCloneService = require('./services/repoCloneService');

    // Ensure workspace directories exist
    await fileSystem.ensureWorkspaceDirectories();
    console.log('✓ Workspace directories initialized');

    // Validate Git installation
    const gitInstalled = await repoCloneService.validateGitInstallation();
    if (!gitInstalled) {
      console.warn('⚠ Warning: Git is not installed. Repository cloning will not work.');
    }
  } catch (error) {
    console.error('Initialization error:', error.message);
  }
})();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
