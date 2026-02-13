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

module.exports = {
    addJob,
    getJobStatus,
    getAllJobs,
    getQueueStats,
    clearCompletedJobs,
    JobType,
    JobStatus
};
