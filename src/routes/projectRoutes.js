const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const BuildLog = require('../models/BuildLog');
const githubService = require('../services/githubService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   POST /api/projects
 * @desc    Create a new project from GitHub URL
 * @access  Public
 */
router.post('/', asyncHandler(async (req, res) => {
    const { repoUrl } = req.body;

    // Validate input
    if (!repoUrl) {
        return res.status(400).json({
            success: false,
            error: 'Repository URL is required'
        });
    }

    // Get repository metadata from GitHub
    let repoMetadata;
    try {
        repoMetadata = await githubService.getRepoMetadata(repoUrl);
    } catch (error) {
        return res.status(400).json({
            success: false,
            error: error.message
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

    // Create new project
    const project = await Project.create({
        repoUrl,
        name: repoMetadata.name,
        owner: repoMetadata.owner,
        defaultBranch: repoMetadata.defaultBranch,
        status: 'pending'
    });

    // Create initial log entry
    await BuildLog.createLog(
        project._id,
        'info',
        `Project created: ${repoMetadata.fullName}`,
        { level: 'success', phase: 'initialization' }
    );

    res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: project
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
 * @desc    Delete a project
 * @access  Public
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id);

    if (!project) {
        return res.status(404).json({
            success: false,
            error: 'Project not found'
        });
    }

    // Delete associated logs
    await BuildLog.deleteMany({ projectId: req.params.id });

    // Delete project
    await project.deleteOne();

    res.json({
        success: true,
        message: 'Project and associated logs deleted successfully'
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
