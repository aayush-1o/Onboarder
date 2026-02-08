const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const BuildLog = require('../models/BuildLog');
const githubService = require('../services/githubService');
const projectService = require('../services/projectService');
const jobQueue = require('../services/jobQueue');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   POST /api/projects
 * @desc    Create a new project from GitHub URL and trigger cloning
 * @access  Public
 */
router.post('/', asyncHandler(async (req, res) => {
    const { repoUrl, branch } = req.body;

    // Validate input
    if (!repoUrl) {
        return res.status(400).json({
            success: false,
            error: 'Repository URL is required'
        });
    }

    // Check if project already exists
    const existingProject = await Project.findOne({ repoUrl });
    if (existingProject) {
        return res.status(400).json({
            success: false,
            error: 'Project already exists',
            data: existingProject
        });
    }

    // Create project and trigger cloning
    const result = await projectService.createProjectWithClone(
        repoUrl,
        branch || 'main'
    );

    res.status(201).json({
        success: true,
        message: result.message,
        data: result
    });
}));

/**
 * @route   GET /api/projects
 * @desc    Get all projects
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
    const { status, limit = 50, page = 1 } = req.query;

    const query = status ? { status } : {};
    const skip = (page - 1) * limit;

    const projects = await Project.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip);

    const total = await Project.countDocuments(query);

    res.json({
        success: true,
        count: projects.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        data: projects
    });
}));

/**
 * @route   GET /api/projects/:id
 * @desc    Get single project by ID
 * @access  Public
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id);

    if (!project) {
        return res.status(404).json({
            success: false,
            error: 'Project not found'
        });
    }

    res.json({
        success: true,
        data: project
    });
}));

/**
 * @route   GET /api/projects/:id/logs
 * @desc    Get build logs for a project
 * @access  Public
 */
router.get('/:id/logs', asyncHandler(async (req, res) => {
    const { limit = 100, logType, level } = req.query;

    // Check if project exists
    const project = await Project.findById(req.params.id);
    if (!project) {
        return res.status(404).json({
            success: false,
            error: 'Project not found'
        });
    }

    const logs = await BuildLog.getProjectLogs(req.params.id, {
        limit: parseInt(limit),
        logType,
        level
    });

    res.json({
        success: true,
        count: logs.length,
        projectId: req.params.id,
        projectName: project.name,
        data: logs
    });
}));

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete a project with workspace cleanup
 * @access  Public
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    await projectService.deleteProjectWithCleanup(req.params.id);

    res.json({
        success: true,
        message: 'Project and workspace deleted successfully'
    });
}));

/**
 * @route   GET /api/projects/:id/clone-status
 * @desc    Get clone status for a project
 * @access  Public
 */
router.get('/:id/clone-status', asyncHandler(async (req, res) => {
    const status = await projectService.getProjectStatus(req.params.id);

    res.json({
        success: true,
        data: {
            cloneStatus: status.project.cloneStatus,
            clonedAt: status.project.clonedAt,
            workspacePath: status.project.workspacePath,
            workspaceSize: status.project.workspaceSize,
            jobStatus: status.jobStatus,
            progress: status.cloneProgress
        }
    });
}));

/**
 * @route   POST /api/projects/:id/reclone
 * @desc    Re-clone a repository
 * @access  Public
 */
router.post('/:id/reclone', asyncHandler(async (req, res) => {
    const result = await projectService.recloneRepository(req.params.id);

    res.json({
        success: true,
        message: result.message,
        data: result
    });
}));

/**
 * @route   GET /api/projects/:id/workspace
 * @desc    Get workspace information
 * @access  Public
 */
router.get('/:id/workspace', asyncHandler(async (req, res) => {
    const workspaceInfo = await projectService.getWorkspaceInfo(req.params.id);

    res.json({
        success: true,
        data: workspaceInfo
    });
}));

/**
 * @route   PATCH /api/projects/:id/status
 * @desc    Update project status
 * @access  Public
 */
router.patch('/:id/status', asyncHandler(async (req, res) => {
    const { status, errorMessage } = req.body;

    if (!status) {
        return res.status(400).json({
            success: false,
            error: 'Status is required'
        });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
        return res.status(404).json({
            success: false,
            error: 'Project not found'
        });
    }

    await project.updateStatus(status, errorMessage);

    // Log status change
    await BuildLog.createLog(
        project._id,
        'info',
        `Status changed to: ${status}`,
        {
            level: status === 'failed' || status === 'error' ? 'error' : 'info',
            details: { previousStatus: project.status, newStatus: status }
        }
    );

    res.json({
        success: true,
        message: 'Project status updated',
        data: project
    });
}));

module.exports = router;
