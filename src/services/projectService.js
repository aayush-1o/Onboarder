/**
 * Project Service
 * High-level service orchestrating project creation, cloning, and management
 */

const Project = require('../models/Project');
const BuildLog = require('../models/BuildLog');
const jobQueue = require('./jobQueue');
const repoCloneService = require('./repoCloneService');
const fileSystem = require('../utils/fileSystem');

/**
 * Extract owner and repo name from GitHub URL
 * @param {string} repoUrl - GitHub repository URL
 * @returns {Object} - { owner, name }
 */
function parseRepoUrl(repoUrl) {
    // Clean URL (remove .git if present)
    const cleanUrl = repoUrl.replace(/\.git$/, '');

    // Extract from https://github.com/owner/repo format
    const match = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);

    if (!match) {
        throw new Error('Invalid GitHub repository URL format');
    }

    return {
        owner: match[1],
        name: match[2]
    };
}

/**
 * Create a project and trigger repository cloning
 * @param {string} repoUrl - GitHub repository URL
 * @param {string} branch - Branch to clone (default: 'main')
 * @returns {Promise<Object>} - Created project with job information
 */
async function createProjectWithClone(repoUrl, branch = 'main') {
    try {
        // Parse repository URL
        const { owner, name } = parseRepoUrl(repoUrl);

        // Create project in database
        const project = await Project.create({
            repoUrl,
            name,
            owner,
            defaultBranch: branch,
            status: 'pending',
            cloneStatus: 'pending'
        });

        // Log project creation
        await BuildLog.createLog(project._id, 'info', `Project created: ${owner}/${name}`, {
            level: 'success',
            phase: 'initialization',
            details: { repoUrl, branch }
        });

        // Add clone job to queue
        const jobId = jobQueue.addJob(jobQueue.JobType.CLONE, {
            projectId: project._id.toString(),
            repoUrl,
            branch
        });

        // Update project with job ID
        project.jobId = jobId;
        await project.save();

        await BuildLog.createLog(project._id, 'queue', `Clone job ${jobId} queued`, {
            level: 'info',
            phase: 'initialization',
            details: { jobId }
        });

        return {
            ...project.toObject(),
            jobId,
            message: 'Project created and clone job queued'
        };

    } catch (error) {
        throw new Error(`Failed to create project: ${error.message}`);
    }
}

/**
 * Get detailed project status including clone progress
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} - Project status with job information
 */
async function getProjectStatus(projectId) {
    try {
        const project = await Project.findById(projectId);

        if (!project) {
            throw new Error('Project not found');
        }

        // Get job status if available
        let jobStatus = null;
        if (project.jobId) {
            jobStatus = jobQueue.getJobStatus(project.jobId);
        }

        // Get workspace information
        let workspaceInfo = null;
        if (project.workspacePath) {
            const exists = await fileSystem.directoryExists(project.workspacePath);
            if (exists) {
                workspaceInfo = {
                    path: project.workspacePath,
                    size: project.workspaceSize || 0,
                    clonedAt: project.clonedAt,
                    exists: true
                };
            }
        }

        return {
            project: project.toObject(),
            jobStatus,
            workspaceInfo,
            cloneProgress: {
                status: project.cloneStatus,
                clonedAt: project.clonedAt,
                size: project.workspaceSize
            }
        };

    } catch (error) {
        throw new Error(`Failed to get project status: ${error.message}`);
    }
}

/**
 * Delete a project with workspace cleanup
 * @param {string} projectId - Project ID
 * @returns {Promise<boolean>} - True if deleted successfully
 */
async function deleteProjectWithCleanup(projectId) {
    try {
        const project = await Project.findById(projectId);

        if (!project) {
            throw new Error('Project not found');
        }

        // Clean up workspace if it exists
        if (project.workspacePath) {
            try {
                await repoCloneService.cleanupRepo(projectId);
            } catch (cleanupError) {
                console.warn(`Workspace cleanup failed: ${cleanupError.message}`);
                // Continue with deletion even if cleanup fails
            }
        }

        // Delete build logs
        await BuildLog.deleteMany({ projectId });

        // Delete project
        await Project.findByIdAndDelete(projectId);

        return true;

    } catch (error) {
        throw new Error(`Failed to delete project: ${error.message}`);
    }
}

/**
 * Re-clone an existing project's repository
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} - Updated project with new job
 */
async function recloneRepository(projectId) {
    try {
        const project = await Project.findById(projectId);

        if (!project) {
            throw new Error('Project not found');
        }

        // Clean up existing workspace
        try {
            await repoCloneService.cleanupRepo(projectId);
        } catch (cleanupError) {
            console.warn(`Cleanup before reclone failed: ${cleanupError.message}`);
        }

        // Reset clone status
        project.cloneStatus = 'pending';
        project.status = 'pending';
        project.clonedAt = null;
        project.workspaceSize = null;
        project.errorMessage = null;

        // Add new clone job
        const jobId = jobQueue.addJob(jobQueue.JobType.CLONE, {
            projectId: project._id.toString(),
            repoUrl: project.repoUrl,
            branch: project.defaultBranch
        });

        project.jobId = jobId;
        await project.save();

        await BuildLog.createLog(project._id, 'queue', `Reclone job ${jobId} queued`, {
            level: 'info',
            phase: 'initialization',
            details: { jobId }
        });

        return {
            ...project.toObject(),
            jobId,
            message: 'Reclone job queued'
        };

    } catch (error) {
        throw new Error(`Failed to reclone repository: ${error.message}`);
    }
}

/**
 * Get workspace information for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} - Workspace details
 */
async function getWorkspaceInfo(projectId) {
    try {
        const project = await Project.findById(projectId);

        if (!project) {
            throw new Error('Project not found');
        }

        if (!project.workspacePath) {
            return {
                exists: false,
                message: 'Workspace not yet created'
            };
        }

        const exists = await fileSystem.directoryExists(project.workspacePath);

        if (!exists) {
            return {
                exists: false,
                message: 'Workspace directory not found',
                expectedPath: project.workspacePath
            };
        }

        const size = await fileSystem.getDirectorySize(project.workspacePath);
        const fileCount = await fileSystem.getFileCount(project.workspacePath);

        return {
            exists: true,
            path: project.workspacePath,
            size,
            fileCount,
            clonedAt: project.clonedAt,
            sizeMB: Math.round(size / 1024 / 1024 * 100) / 100
        };

    } catch (error) {
        throw new Error(`Failed to get workspace info: ${error.message}`);
    }
}

module.exports = {
    createProjectWithClone,
    getProjectStatus,
    deleteProjectWithCleanup,
    recloneRepository,
    getWorkspaceInfo,
    parseRepoUrl
};
