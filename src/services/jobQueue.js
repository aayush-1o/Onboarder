/**
 * Job Queue Service
 * Simple in-memory background job processing system
 */

const { v4: uuidv4 } = require('uuid');
const repoCloneService = require('./repoCloneService');
const BuildLog = require('../models/BuildLog');
const Project = require('../models/Project');

// In-memory job storage
const jobs = new Map();
const queue = [];
let isProcessing = false;

// Configuration
const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_JOBS) || 3;
const RETRY_ATTEMPTS = parseInt(process.env.JOB_RETRY_ATTEMPTS) || 2;

// Job status enum
const JobStatus = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

// Job type enum
const JobType = {
    CLONE: 'clone',
    ANALYZE: 'analyze', // Placeholder for Day 4
    BUILD: 'build'      // Placeholder for Days 6-7
};

/**
 * Add a job to the queue
 * @param {string} type - Job type (clone, analyze, build)
 * @param {Object} data - Job data
 * @returns {string} - Job ID
 */
function addJob(type, data) {
    const jobId = uuidv4();

    const job = {
        id: jobId,
        type,
        data,
        status: JobStatus.PENDING,
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
        error: null,
        retryCount: 0,
        result: null
    };

    jobs.set(jobId, job);
    queue.push(jobId);

    console.log(`✓ Job ${jobId} added to queue (type: ${type})`);

    // Start processing if not already running
    if (!isProcessing) {
        processJobs();
    }

    return jobId;
}

/**
 * Process jobs in the queue
 */
async function processJobs() {
    if (isProcessing) {
        return;
    }

    isProcessing = true;

    while (queue.length > 0) {
        // Get currently running jobs
        const runningJobs = Array.from(jobs.values()).filter(
            job => job.status === JobStatus.RUNNING
        );

        // Check if we've reached the concurrent job limit
        if (runningJobs.length >= MAX_CONCURRENT_JOBS) {
            // Wait a bit before checking again
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
        }

        // Get next job from queue
        const jobId = queue.shift();
        const job = jobs.get(jobId);

        if (!job || job.status !== JobStatus.PENDING) {
            continue;
        }

        // Process job asynchronously (don't await here)
        processJob(jobId).catch(error => {
            console.error(`Unhandled error in job ${jobId}:`, error);
        });
    }

    isProcessing = false;
}

/**
 * Process a single job
 * @param {string} jobId - Job ID
 */
async function processJob(jobId) {
    const job = jobs.get(jobId);
    if (!job) {
        return;
    }

    try {
        // Update job status
        job.status = JobStatus.RUNNING;
        job.startedAt = new Date();

        console.log(`→ Processing job ${jobId} (type: ${job.type})`);

        // Log job start
        if (job.data.projectId) {
            await BuildLog.createLog(job.data.projectId, 'queue', `Job ${jobId} started (${job.type})`, {
                level: 'info',
                phase: 'initialization',
                details: { jobId, jobType: job.type }
            });
        }

        // Execute job based on type
        let result;
        switch (job.type) {
            case JobType.CLONE:
                result = await executeCloneJob(job.data);
                break;

            case JobType.ANALYZE:
                result = await executeAnalyzeJob(job.data);
                break;

            case JobType.BUILD:
                // Placeholder for Days 6-7
                throw new Error('Build job type not yet implemented');

            default:
                throw new Error(`Unknown job type: ${job.type}`);
        }

        // Mark job as completed
        job.status = JobStatus.COMPLETED;
        job.completedAt = new Date();
        job.result = result;

        console.log(`✓ Job ${jobId} completed successfully`);

        // Log job completion
        if (job.data.projectId) {
            await BuildLog.createLog(job.data.projectId, 'queue', `Job ${jobId} completed`, {
                level: 'success',
                phase: 'execution',
                details: {
                    jobId,
                    jobType: job.type,
                    duration: job.completedAt - job.startedAt
                }
            });
        }

    } catch (error) {
        console.error(`✗ Job ${jobId} failed:`, error.message);

        job.error = error.message;

        // Check if we should retry
        if (job.retryCount < RETRY_ATTEMPTS) {
            job.retryCount++;
            job.status = JobStatus.PENDING;
            queue.push(jobId);

            console.log(`↻ Retrying job ${jobId} (attempt ${job.retryCount + 1}/${RETRY_ATTEMPTS + 1})`);

            if (job.data.projectId) {
                await BuildLog.createLog(job.data.projectId, 'queue', `Job ${jobId} failed, retrying (attempt ${job.retryCount}/${RETRY_ATTEMPTS})`, {
                    level: 'warn',
                    phase: 'execution',
                    details: { jobId, error: error.message, retryCount: job.retryCount }
                });
            }
        } else {
            // Max retries reached, mark as failed
            job.status = JobStatus.FAILED;
            job.completedAt = new Date();

            if (job.data.projectId) {
                await BuildLog.createLog(job.data.projectId, 'queue', `Job ${jobId} failed after ${RETRY_ATTEMPTS} retries`, {
                    level: 'error',
                    phase: 'execution',
                    details: { jobId, error: error.message }
                });

                // Update project status
                try {
                    const project = await Project.findById(job.data.projectId);
                    if (project) {
                        if (job.type === JobType.CLONE) {
                            project.cloneStatus = 'failed';
                        }
                        project.status = 'failed';
                        project.errorMessage = error.message;
                        await project.save();
                    }
                } catch (updateError) {
                    console.error(`Failed to update project status: ${updateError.message}`);
                }
            }
        }
    }
}

/**
 * Execute a clone job
 * @param {Object} data - Job data (projectId, repoUrl, branch)
 * @returns {Promise<Object>} - Clone result
 */
async function executeCloneJob(data) {
    const { projectId, repoUrl, branch } = data;

    // Update project status to cloning
    const project = await Project.findById(projectId);
    if (!project) {
        throw new Error(`Project ${projectId} not found`);
    }

    project.cloneStatus = 'cloning';
    project.status = 'cloning';
    await project.save();

    // Clone repository
    const result = await repoCloneService.cloneRepository(projectId, repoUrl, branch);

    // Update project with clone information
    project.cloneStatus = 'cloned';
    project.status = 'cloned';
    project.clonedAt = new Date();
    project.workspaceSize = result.size;
    project.workspacePath = result.path;
    await project.save();

    // Trigger analysis job after successful clone
    addJob(JobType.ANALYZE, {
        projectId,
        projectPath: result.path
    });

    return result;
}

/**
 * Execute an analysis job
 * @param {Object} data - Job data (projectId, projectPath)
 * @returns {Promise<Object>} - Analysis result
 */
async function executeAnalyzeJob(data) {
    const { projectId, projectPath } = data;

    // Update project status to analyzing
    const project = await Project.findById(projectId);
    if (!project) {
        throw new Error(`Project ${projectId} not found`);
    }

    project.analysisStatus = 'analyzing';
    await project.save();

    // Run code analysis
    const codeAnalysisService = require('./codeAnalysisService');
    const analysisResult = await codeAnalysisService.analyzeRepository(projectId, projectPath);

    if (!analysisResult.success) {
        project.analysisStatus = 'failed';
        project.errorMessage = analysisResult.error;
        await project.save();
        throw new Error(analysisResult.error);
    }

    // Update project with analysis results
    project.analysis = analysisResult.data.analysis;
    project.dependencies = analysisResult.data.dependencies;
    project.analysisStatus = 'completed';
    project.analyzedAt = new Date();
    await project.save();

    return analysisResult.data;
}

/**
 * Get job status
 * @param {string} jobId - Job ID
 * @returns {Object|null} - Job object or null if not found
 */
function getJobStatus(jobId) {
    const job = jobs.get(jobId);
    if (!job) {
        return null;
    }

    return {
        id: job.id,
        type: job.type,
        status: job.status,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        error: job.error,
        retryCount: job.retryCount,
        result: job.result
    };
}

/**
 * Get all jobs
 * @param {Object} filter - Optional filter (status, type)
 * @returns {Array} - Array of job objects
 */
function getAllJobs(filter = {}) {
    let jobList = Array.from(jobs.values());

    if (filter.status) {
        jobList = jobList.filter(job => job.status === filter.status);
    }

    if (filter.type) {
        jobList = jobList.filter(job => job.type === filter.type);
    }

    return jobList.map(job => ({
        id: job.id,
        type: job.type,
        status: job.status,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        error: job.error,
        retryCount: job.retryCount
    }));
}

/**
 * Clear completed jobs (cleanup)
 * @param {number} olderThanMs - Clear jobs older than this (in milliseconds)
 */
function clearCompletedJobs(olderThanMs = 3600000) { // Default: 1 hour
    const now = Date.now();

    for (const [jobId, job] of jobs.entries()) {
        if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
            const completedAt = job.completedAt ? job.completedAt.getTime() : 0;
            if (now - completedAt > olderThanMs) {
                jobs.delete(jobId);
            }
        }
    }
}

/**
 * Get queue statistics
 * @returns {Object} - Queue stats
 */
function getQueueStats() {
    const allJobs = Array.from(jobs.values());

    return {
        total: allJobs.length,
        pending: allJobs.filter(j => j.status === JobStatus.PENDING).length,
        running: allJobs.filter(j => j.status === JobStatus.RUNNING).length,
        completed: allJobs.filter(j => j.status === JobStatus.COMPLETED).length,
        failed: allJobs.filter(j => j.status === JobStatus.FAILED).length,
        queueLength: queue.length
    };
}

// Periodic cleanup of old jobs (every 10 minutes)
setInterval(() => {
    clearCompletedJobs();
}, 600000);

module.exports = {
    addJob,
    getJobStatus,
    getAllJobs,
    getQueueStats,
    clearCompletedJobs,
    JobType,
    JobStatus
};
