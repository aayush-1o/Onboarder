/**
 * Repository Cloning Service
 * Handles Git operations and repository management
 */

const { spawn } = require('child_process');
const path = require('path');
const workspaceConfig = require('../../workspace.config');
const fileSystem = require('../utils/fileSystem');
const BuildLog = require('../models/BuildLog');

/**
 * Validate that Git is installed on the system
 * @returns {Promise<boolean>} - True if Git is installed
 */
async function validateGitInstallation() {
    return new Promise((resolve) => {
        const git = spawn('git', ['--version']);

        let output = '';
        git.stdout.on('data', (data) => {
            output += data.toString();
        });

        git.on('close', (code) => {
            if (code === 0) {
                console.log(`✓ Git is installed: ${output.trim()}`);
                resolve(true);
            } else {
                console.error('✗ Git is not installed or not in PATH');
                resolve(false);
            }
        });

        git.on('error', () => {
            console.error('✗ Git is not installed or not in PATH');
            resolve(false);
        });
    });
}

/**
 * Get the workspace path for a project
 * @param {string} projectId - MongoDB ObjectId as string
 * @returns {string} - Full path to project workspace
 */
function getClonePath(projectId) {
    return path.resolve(workspaceConfig.getProjectPath(projectId));
}

/**
 * Clone a repository to the workspace
 * @param {string} projectId - Project ID
 * @param {string} repoUrl - GitHub repository URL
 * @param {string} branch - Branch to clone (default: main)
 * @returns {Promise<Object>} - Clone result with path and size
 */
async function cloneRepository(projectId, repoUrl, branch = 'main') {
    const clonePath = getClonePath(projectId);
    const timeout = workspaceConfig.gitCloneTimeoutMs;

    try {
        // Ensure workspace directories exist
        await fileSystem.ensureWorkspaceDirectories();

        // Check if clone path already exists
        const exists = await fileSystem.directoryExists(clonePath);
        if (exists) {
            await BuildLog.createLog(projectId, 'git', `Removing existing directory at ${clonePath}`, {
                level: 'info',
                phase: 'cloning'
            });
            await fileSystem.removeDirectory(clonePath);
        }

        // Check available disk space (require at least 100MB)
        const availableSpace = await fileSystem.checkDiskSpace(clonePath);
        const requiredSpace = 100 * 1024 * 1024; // 100MB in bytes

        if (availableSpace < requiredSpace && availableSpace !== Infinity) {
            throw new Error(`Insufficient disk space. Available: ${Math.round(availableSpace / 1024 / 1024)}MB, Required: ${Math.round(requiredSpace / 1024 / 1024)}MB`);
        }

        await BuildLog.createLog(projectId, 'git', `Starting clone of ${repoUrl} to ${clonePath}`, {
            level: 'info',
            phase: 'cloning',
            details: { repoUrl, branch, clonePath }
        });

        // Build Git clone command
        const args = ['clone'];

        // Add branch specification
        if (branch) {
            args.push('-b', branch);
        }

        // Add shallow clone if configured
        if (workspaceConfig.useShallowClone) {
            args.push('--depth', '1');
        }

        args.push(repoUrl, clonePath);

        // Execute Git clone
        const result = await executeGitCommand(args, projectId, timeout);

        // Get repository size
        const repoSize = await fileSystem.getDirectorySize(clonePath);
        const fileCount = await fileSystem.getFileCount(clonePath);

        await BuildLog.createLog(projectId, 'git', `Successfully cloned repository (${Math.round(repoSize / 1024 / 1024)}MB, ${fileCount} files)`, {
            level: 'success',
            phase: 'cloning',
            details: {
                repoSize,
                fileCount,
                duration: result.duration
            }
        });

        return {
            success: true,
            path: clonePath,
            size: repoSize,
            fileCount,
            duration: result.duration
        };

    } catch (error) {
        await BuildLog.createLog(projectId, 'git', `Clone failed: ${error.message}`, {
            level: 'error',
            phase: 'cloning',
            details: { error: error.message, repoUrl, branch }
        });

        // Cleanup failed clone
        try {
            const exists = await fileSystem.directoryExists(clonePath);
            if (exists) {
                await fileSystem.removeDirectory(clonePath);
            }
        } catch (cleanupError) {
            console.error(`Failed to cleanup after failed clone: ${cleanupError.message}`);
        }

        throw error;
    }
}

/**
 * Execute a Git command with timeout
 * @param {string[]} args - Git command arguments
 * @param {string} projectId - Project ID for logging
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Object>} - Result with stdout, stderr, and duration
 */
function executeGitCommand(args, projectId, timeout) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const git = spawn('git', args);

        let stdout = '';
        let stderr = '';
        let killed = false;

        // Set timeout
        const timeoutHandle = setTimeout(() => {
            killed = true;
            git.kill();
            reject(new Error(`Git command timed out after ${timeout}ms`));
        }, timeout);

        git.stdout.on('data', (data) => {
            const message = data.toString();
            stdout += message;

            // Log progress for clone operations
            if (args[0] === 'clone') {
                const progressMatch = message.match(/Receiving objects:\s+(\d+)%/);
                if (progressMatch) {
                    console.log(`Clone progress: ${progressMatch[1]}%`);
                }
            }
        });

        git.stderr.on('data', (data) => {
            const message = data.toString();
            stderr += message;

            // Git outputs progress to stderr, so log it
            console.log(`Git: ${message.trim()}`);
        });

        git.on('close', (code) => {
            clearTimeout(timeoutHandle);

            if (killed) {
                return; // Already rejected due to timeout
            }

            const duration = Date.now() - startTime;

            if (code === 0) {
                resolve({
                    stdout,
                    stderr,
                    duration,
                    exitCode: code
                });
            } else {
                reject(new Error(`Git command failed with exit code ${code}: ${stderr || stdout}`));
            }
        });

        git.on('error', (error) => {
            clearTimeout(timeoutHandle);
            reject(new Error(`Failed to execute git command: ${error.message}`));
        });
    });
}

/**
 * Remove a cloned repository from workspace
 * @param {string} projectId - Project ID
 * @returns {Promise<boolean>} - True if removed successfully
 */
async function cleanupRepo(projectId) {
    const clonePath = getClonePath(projectId);

    try {
        const exists = await fileSystem.directoryExists(clonePath);

        if (!exists) {
            return true; // Already cleaned up
        }

        await BuildLog.createLog(projectId, 'workspace', `Cleaning up repository at ${clonePath}`, {
            level: 'info',
            phase: 'cleanup'
        });

        await fileSystem.removeDirectory(clonePath);

        await BuildLog.createLog(projectId, 'workspace', 'Repository cleanup completed', {
            level: 'success',
            phase: 'cleanup'
        });

        return true;
    } catch (error) {
        await BuildLog.createLog(projectId, 'workspace', `Cleanup failed: ${error.message}`, {
            level: 'error',
            phase: 'cleanup',
            details: { error: error.message }
        });

        throw error;
    }
}

/**
 * Get the size of a cloned repository
 * @param {string} projectId - Project ID
 * @returns {Promise<number>} - Size in bytes
 */
async function getRepoSize(projectId) {
    const clonePath = getClonePath(projectId);

    try {
        return await fileSystem.getDirectorySize(clonePath);
    } catch (error) {
        console.error(`Failed to get repo size: ${error.message}`);
        return 0;
    }
}

/**
 * Check if a repository is already cloned
 * @param {string} projectId - Project ID
 * @returns {Promise<boolean>} - True if cloned
 */
async function isRepoCloned(projectId) {
    const clonePath = getClonePath(projectId);
    return await fileSystem.directoryExists(clonePath);
}

module.exports = {
    validateGitInstallation,
    getClonePath,
    cloneRepository,
    cleanupRepo,
    getRepoSize,
    isRepoCloned
};
