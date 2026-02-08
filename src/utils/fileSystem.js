/**
 * File System Utilities
 * Low-level file system operations with error handling and validation
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const workspaceConfig = require('../../workspace.config');

/**
 * Create a directory and all parent directories if they don't exist
 * @param {string} dirPath - Path to create
 * @returns {Promise<boolean>} - True if created successfully
 */
async function createDirectory(dirPath) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
        return true;
    } catch (error) {
        throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
    }
}

/**
 * Remove a directory and all its contents recursively
 * @param {string} dirPath - Path to remove
 * @returns {Promise<boolean>} - True if removed successfully
 */
async function removeDirectory(dirPath) {
    try {
        // Check if directory exists first
        const exists = await directoryExists(dirPath);
        if (!exists) {
            return true; // Already removed
        }

        await fs.rm(dirPath, { recursive: true, force: true });
        return true;
    } catch (error) {
        throw new Error(`Failed to remove directory ${dirPath}: ${error.message}`);
    }
}

/**
 * Check if a directory exists
 * @param {string} dirPath - Path to check
 * @returns {Promise<boolean>} - True if exists
 */
async function directoryExists(dirPath) {
    try {
        const stats = await fs.stat(dirPath);
        return stats.isDirectory();
    } catch (error) {
        if (error.code === 'ENOENT') {
            return false;
        }
        throw error;
    }
}

/**
 * Get total size of a directory in bytes
 * @param {string} dirPath - Path to measure
 * @returns {Promise<number>} - Size in bytes
 */
async function getDirectorySize(dirPath) {
    try {
        const exists = await directoryExists(dirPath);
        if (!exists) {
            return 0;
        }

        let totalSize = 0;

        async function calculateSize(currentPath) {
            const items = await fs.readdir(currentPath, { withFileTypes: true });

            for (const item of items) {
                const fullPath = path.join(currentPath, item.name);

                if (item.isDirectory()) {
                    await calculateSize(fullPath);
                } else if (item.isFile()) {
                    const stats = await fs.stat(fullPath);
                    totalSize += stats.size;
                }
            }
        }

        await calculateSize(dirPath);
        return totalSize;
    } catch (error) {
        throw new Error(`Failed to get directory size for ${dirPath}: ${error.message}`);
    }
}

/**
 * List files in a directory matching a pattern
 * @param {string} dirPath - Directory to search
 * @param {string} pattern - Optional glob pattern (e.g., '*.js')
 * @returns {Promise<string[]>} - Array of file paths
 */
async function listFiles(dirPath, pattern = '*') {
    try {
        const exists = await directoryExists(dirPath);
        if (!exists) {
            return [];
        }

        const items = await fs.readdir(dirPath, { withFileTypes: true });
        const files = [];

        for (const item of items) {
            const fullPath = path.join(dirPath, item.name);

            if (item.isFile()) {
                // Simple pattern matching (supports *.ext)
                if (pattern === '*' || item.name.match(new RegExp(pattern.replace('*', '.*')))) {
                    files.push(fullPath);
                }
            }
        }

        return files;
    } catch (error) {
        throw new Error(`Failed to list files in ${dirPath}: ${error.message}`);
    }
}

/**
 * Copy a file from source to destination
 * @param {string} src - Source file path
 * @param {string} dest - Destination file path
 * @returns {Promise<boolean>} - True if copied successfully
 */
async function copyFile(src, dest) {
    try {
        // Ensure destination directory exists
        const destDir = path.dirname(dest);
        await createDirectory(destDir);

        await fs.copyFile(src, dest);
        return true;
    } catch (error) {
        throw new Error(`Failed to copy file from ${src} to ${dest}: ${error.message}`);
    }
}

/**
 * Check available disk space at a path (in bytes)
 * @param {string} dirPath - Path to check
 * @returns {Promise<number>} - Available space in bytes
 */
async function checkDiskSpace(dirPath) {
    try {
        // Use platform-specific command
        const isWindows = process.platform === 'win32';

        if (isWindows) {
            // Get drive letter from path
            const driveLetter = path.parse(path.resolve(dirPath)).root;
            const { stdout } = await execAsync(`wmic logicaldisk where "DeviceID='${driveLetter.replace('\\', '')}'" get FreeSpace`);

            // Parse output to get free space
            const lines = stdout.trim().split('\n');
            const freeSpace = parseInt(lines[1].trim());
            return freeSpace || 0;
        } else {
            // Linux/Mac: use df command
            const { stdout } = await execAsync(`df -k "${dirPath}" | tail -1 | awk '{print $4}'`);
            return parseInt(stdout.trim()) * 1024; // Convert KB to bytes
        }
    } catch (error) {
        console.warn(`Could not check disk space: ${error.message}`);
        return Infinity; // Return infinity if we can't check (allow operation to proceed)
    }
}

/**
 * Validate that a path is within the allowed workspace
 * @param {string} targetPath - Path to validate
 * @returns {boolean} - True if path is valid
 */
function validatePath(targetPath) {
    const absolutePath = path.resolve(targetPath);
    const workspacePath = path.resolve(workspaceConfig.workspaceRoot);

    // Ensure the path is within the workspace directory
    return absolutePath.startsWith(workspacePath);
}

/**
 * Get file count in a directory
 * @param {string} dirPath - Directory path
 * @returns {Promise<number>} - Number of files
 */
async function getFileCount(dirPath) {
    try {
        const exists = await directoryExists(dirPath);
        if (!exists) {
            return 0;
        }

        let fileCount = 0;

        async function countFiles(currentPath) {
            const items = await fs.readdir(currentPath, { withFileTypes: true });

            for (const item of items) {
                const fullPath = path.join(currentPath, item.name);

                if (item.isDirectory()) {
                    await countFiles(fullPath);
                } else if (item.isFile()) {
                    fileCount++;
                }
            }
        }

        await countFiles(dirPath);
        return fileCount;
    } catch (error) {
        throw new Error(`Failed to count files in ${dirPath}: ${error.message}`);
    }
}

/**
 * Ensure workspace directories exist
 * @returns {Promise<void>}
 */
async function ensureWorkspaceDirectories() {
    await createDirectory(workspaceConfig.projectsDir);
    await createDirectory(workspaceConfig.tempDir);
}

module.exports = {
    createDirectory,
    removeDirectory,
    directoryExists,
    getDirectorySize,
    listFiles,
    copyFile,
    checkDiskSpace,
    validatePath,
    getFileCount,
    ensureWorkspaceDirectories
};
