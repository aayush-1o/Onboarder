// Code Analysis Service
// Main orchestration service for analyzing cloned repositories

const { detectLanguages, getPrimaryLanguage } = require('../utils/languageDetector');
const { detectFrameworks, detectDatabases, detectBuildTools, detectPackageManager } = require('../utils/frameworkDetector');
const { parseDependencies } = require('../parsers/dependencyParser');
const BuildLog = require('../models/BuildLog');

/**
 * Analyze a repository and detect tech stack
 * @param {string} projectId - Project ID for logging
 * @param {string} projectPath - Path to cloned repository
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeRepository(projectId, projectPath) {
    try {
        await logAnalysis(projectId, 'info', 'Starting code analysis...');

        // Step 1: Detect programming languages
        await logAnalysis(projectId, 'info', 'Detecting programming languages...');
        const languages = await detectLanguages(projectPath);
        const primaryLanguage = getPrimaryLanguage(languages);

        await logAnalysis(projectId, 'info', `Detected ${languages.length} languages. Primary: ${primaryLanguage || 'None'}`);

        // Step 2: Parse dependencies
        await logAnalysis(projectId, 'info', 'Parsing dependency files...');
        const dependencies = await parseDependencies(projectPath);

        await logAnalysis(projectId, 'info', `Found ${dependencies.totalCount} dependencies across ${dependencies.files.length} files`);

        // Step 3: Detect frameworks
        await logAnalysis(projectId, 'info', 'Detecting frameworks and libraries...');
        const frameworks = await detectFrameworks(projectPath, dependencies);

        await logAnalysis(projectId, 'info', `Detected ${frameworks.length} frameworks`);

        // Step 4: Detect databases
        await logAnalysis(projectId, 'info', 'Detecting database usage...');
        const databases = detectDatabases(dependencies);

        if (databases.length > 0) {
            await logAnalysis(projectId, 'info', `Detected databases: ${databases.join(', ')}`);
        }

        // Step 5: Detect build tools
        await logAnalysis(projectId, 'info', 'Detecting build tools...');
        const buildTools = await detectBuildTools(projectPath, dependencies);

        if (buildTools.length > 0) {
            await logAnalysis(projectId, 'info', `Detected build tools: ${buildTools.join(', ')}`);
        }

        // Step 6: Detect package manager
        const packageManager = await detectPackageManager(projectPath);
        if (packageManager) {
            await logAnalysis(projectId, 'info', `Package manager: ${packageManager}`);
        }

        await logAnalysis(projectId, 'info', 'Code analysis completed successfully');

        // Prepare analysis results
        const analysisResult = {
            analysis: {
                languages: languages.map(lang => ({
                    name: lang.name,
                    percentage: lang.percentage,
                    fileCount: lang.fileCount
                })),
                primaryLanguage,
                frameworks: frameworks.map(fw => ({
                    name: fw.name,
                    type: fw.type,
                    confidence: fw.confidence
                })),
                hasDatabase: databases.length > 0,
                databases,
                buildTools,
                packageManager
            },
            dependencies: {
                files: dependencies.files,
                runtime: dependencies.runtime,
                development: dependencies.development,
                totalCount: dependencies.totalCount,
                ecosystems: dependencies.ecosystems
            }
        };

        return {
            success: true,
            data: analysisResult
        };

    } catch (error) {
        await logAnalysis(projectId, 'error', `Analysis failed: ${error.message}`);

        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get analysis summary for a project
 * @param {Object} project - Project document from database
 * @returns {Object} Analysis summary
 */
function getAnalysisSummary(project) {
    if (!project.analysis || !project.analysis.languages) {
        return {
            status: project.analysisStatus || 'pending',
            message: 'Analysis not yet completed'
        };
    }

    const { analysis, dependencies } = project;

    return {
        status: 'completed',
        primaryLanguage: analysis.primaryLanguage,
        languages: analysis.languages.map(l => l.name),
        frameworks: analysis.frameworks.map(f => f.name),
        databases: analysis.databases || [],
        dependencyCount: dependencies?.totalCount || 0,
        buildTools: analysis.buildTools || []
    };
}

/**
 * Get tech stack summary (most relevant information)
 * @param {Object} project - Project document from database
 * @returns {Object} Tech stack summary
 */
function getTechStackSummary(project) {
    if (!project.analysis) {
        return null;
    }

    const { analysis } = project;

    // Get top 3 languages
    const topLanguages = (analysis.languages || [])
        .slice(0, 3)
        .map(l => ({ name: l.name, percentage: l.percentage }));

    // Get high-confidence frameworks
    const mainFrameworks = (analysis.frameworks || [])
        .filter(f => f.confidence >= 0.7)
        .map(f => f.name);

    return {
        primaryLanguage: analysis.primaryLanguage,
        languages: topLanguages,
        frameworks: mainFrameworks,
        databases: analysis.databases || [],
        hasDatabase: analysis.hasDatabase || false,
        buildTools: analysis.buildTools || [],
        packageManager: analysis.packageManager
    };
}

/**
 * Log analysis event to BuildLog
 * @param {string} projectId - Project ID
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Log message
 */
async function logAnalysis(projectId, level, message) {
    try {
        await BuildLog.create({
            project: projectId,
            level,
            message,
            phase: 'analysis'
        });
    } catch (error) {
        console.error('Failed to create build log:', error.message);
    }
}

/**
 * Validate analysis result structure
 * @param {Object} analysisResult - Analysis result to validate
 * @returns {boolean} True if valid
 */
function validateAnalysisResult(analysisResult) {
    if (!analysisResult || typeof analysisResult !== 'object') {
        return false;
    }

    const { analysis, dependencies } = analysisResult;

    // Check required fields
    if (!analysis || !Array.isArray(analysis.languages)) {
        return false;
    }

    if (!dependencies || typeof dependencies.totalCount !== 'number') {
        return false;
    }

    return true;
}

module.exports = {
    analyzeRepository,
    getAnalysisSummary,
    getTechStackSummary,
    validateAnalysisResult
};
