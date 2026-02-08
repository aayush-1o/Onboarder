/**
 * Workspace Configuration
 * Defines paths, size limits, and cleanup policies for the workspace directory
 */

const path = require('path');

module.exports = {
    // Base paths
    workspaceRoot: './workspace',
    projectsDir: './workspace/projects',
    tempDir: './workspace/temp',

    // Size limits (in MB)
    maxWorkspaceSizeMB: parseInt(process.env.WORKSPACE_MAX_SIZE_MB) || 5000,
    maxProjectSizeMB: 1000,

    // Cleanup policies
    cleanupOlderThanDays: 30,
    cleanupOnStartup: false,

    // Git clone settings
    gitCloneTimeoutMs: parseInt(process.env.GIT_CLONE_TIMEOUT_MS) || 300000, // 5 minutes
    useShallowClone: false, // Set to true for --depth 1 clones

    // Helper functions
    getProjectPath: (projectId) => {
        return path.join('./workspace/projects', projectId.toString());
    },

    getTempPath: (identifier) => {
        return path.join('./workspace/temp', identifier || Date.now().toString());
    }
};
