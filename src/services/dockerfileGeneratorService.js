const fs = require('fs').promises;
const path = require('path');
const Project = require('../models/Project');
const BuildLog = require('../models/BuildLog');

/**
 * Dockerfile Generator Service
 * Generates optimized Dockerfiles based on project analysis
 */

// Base image mappings
const BASE_IMAGES = {
    javascript: { default: 'node:18-alpine', lts: 'node:20-alpine', latest: 'node:21-alpine' },
    typescript: { default: 'node:18-alpine', lts: 'node:20-alpine' },
    python: { default: 'python:3.11-slim', '3.9': 'python:3.9-slim', '3.10': 'python:3.10-slim', '3.11': 'python:3.11-slim' },
    java: { default: 'openjdk:17-jdk-slim', '11': 'openjdk:11-jdk-slim', '17': 'openjdk:17-jdk-slim' },
    go: { default: 'golang:1.21-alpine', '1.20': 'golang:1.20-alpine', '1.21': 'golang:1.21-alpine' },
    ruby: { default: 'ruby:3.2-alpine', '3.0': 'ruby:3.0-alpine', '3.1': 'ruby:3.1-alpine', '3.2': 'ruby:3.2-alpine' },
    php: { default: 'php:8.2-fpm-alpine', '8.0': 'php:8.0-fpm-alpine', '8.1': 'php:8.1-fpm-alpine', '8.2': 'php:8.2-fpm-alpine' }
};

/**
 * Select appropriate base image for language
 */
function selectBaseImage(language, version = null) {
    const lang = language.toLowerCase();
    const imageMap = BASE_IMAGES[lang] || {};

    if (version && imageMap[version]) {
        return imageMap[version];
    }

    return imageMap.default || 'alpine:latest';
}

/**
 * Determine package manager from dependencies and lock files
 */
function determinePackageManager(dependencies) {
    if (!dependencies || !dependencies.files) {
        return 'npm';
    }

    const files = dependencies.files;

    if (files.includes('pnpm-lock.yaml')) return 'pnpm';
    if (files.includes('yarn.lock')) return 'yarn';
    if (files.includes('package-lock.json')) return 'npm';

    return 'npm';
}

/**
 * Select appropriate Dockerfile template
 */
function selectTemplate(primaryLanguage) {
    const lang = primaryLanguage.toLowerCase();

    const templateMap = {
        javascript: 'nodejs.dockerfile.template',
        typescript: 'nodejs.dockerfile.template',
        python: 'python.dockerfile.template',
        java: 'java-maven.dockerfile.template',
        go: 'go.dockerfile.template',
        ruby: 'ruby.dockerfile.template',
        php: 'php.dockerfile.template'
    };

    return templateMap[lang] || 'nodejs.dockerfile.template';
}

/**
 * Generate environment variables array
 */
function generateEnvVars(framework, databases) {
    const envVars = [];

    // Common variables
    envVars.push({ key: 'PORT', value: '{{PORT}}', required: true });

    // Database-specific
    if (databases && databases.length > 0) {
        if (databases.includes('MongoDB')) {
            envVars.push({ key: 'MONGODB_URI', value: 'mongodb://mongo:27017/app', required: true });
        }
        if (databases.includes('PostgreSQL')) {
            envVars.push({ key: 'DATABASE_URL', value: 'postgresql://user:pass@postgres:5432/db', required: true });
        }
        if (databases.includes('MySQL')) {
            envVars.push({ key: 'DATABASE_URL', value: 'mysql://user:pass@mysql:3306/db', required: true });
        }
        if (databases.includes('Redis')) {
            envVars.push({ key: 'REDIS_URL', value: 'redis://redis:6379', required: false });
        }
    }

    return envVars;
}

/**
 * Get framework-specific port
 */
function getDefaultPort(frameworks) {
    if (!frameworks || frameworks.length === 0) return 3000;

    const framework = frameworks[0].name.toLowerCase();

    const portMap = {
        'express.js': 3000,
        'express': 3000,
        'next.js': 3000,
        'react': 80,
        'vue.js': 80,
        'angular': 80,
        'django': 8000,
        'flask': 5000,
        'fastapi': 8000,
        'spring boot': 8080,
        'rails': 3000,
        'laravel': 80,
        'symfony': 80
    };

    return portMap[framework] || 3000;
}

/**
 * Get health check endpoint for framework
 */
function getHealthCheckEndpoint(frameworks) {
    if (!frameworks || frameworks.length === 0) return null;

    const framework = frameworks[0].name.toLowerCase();

    const healthCheckMap = {
        'express.js': '/health',
        'express': '/health',
        'next.js': '/api/health',
        'django': '/health/',
        'flask': '/health',
        'fastapi': '/health',
        'spring boot': '/actuator/health',
        'rails': '/health'
    };

    return healthCheckMap[framework] || '/health';
}

/**
 * Generate Dockerfile content from template
 */
async function generateDockerfileContent(projectId) {
    try {
        // Fetch project with analysis
        const project = await Project.findById(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        if (!project.analysis || project.analysisStatus !== 'completed') {
            throw new Error('Project analysis not complete. Run analysis first.');
        }

        const { analysis, dependencies } = project;
        const { primaryLanguage, frameworks, databases } = analysis;

        // Log start
        await BuildLog.createLog(projectId, 'dockerfile', 'Starting Dockerfile generation', {
            level: 'info',
            details: { primaryLanguage, frameworks: frameworks.map(f => f.name) }
        });

        // Select base image
        const baseImage = selectBaseImage(primaryLanguage);

        // Determine package manager (for Node.js)
        const packageManager = primaryLanguage.toLowerCase() === 'javascript' || primaryLanguage.toLowerCase() === 'typescript'
            ? determinePackageManager(dependencies)
            : null;

        // Get port
        const port = getDefaultPort(frameworks);

        // Get health check
        const healthCheckEndpoint = getHealthCheckEndpoint(frameworks);

        // Generate environment variables
        const envVars = generateEnvVars(frameworks[0]?.name, databases);

        // Template variables
        const templateVars = {
            BASE_IMAGE: baseImage,
            WORKDIR: '/app',
            PORT: port,
            HEALTH_CHECK_ENDPOINT: healthCheckEndpoint,
            ENV_VARS: envVars,

            // Package manager flags (Node.js)
            USE_NPM: packageManager === 'npm',
            USE_YARN: packageManager === 'yarn',
            USE_PNPM: packageManager === 'pnpm',
            YARN_LOCK: packageManager === 'yarn',
            PNPM_LOCK: packageManager === 'pnpm',

            // Build configuration
            HAS_BUILD_SCRIPT: dependencies?.files?.includes('package.json'), // Simplified
            BUILD_COMMAND: 'npm run build',
            START_COMMAND: '"node", "server.js"',

            // Python-specific
            HAS_POETRY: dependencies?.files?.includes('poetry.lock'),
            HAS_PIPENV: dependencies?.files?.includes('Pipfile'),
            IS_DJANGO: frameworks.some(f => f.name.toLowerCase() === 'django'),
            IS_FLASK: frameworks.some(f => f.name.toLowerCase() === 'flask'),
            PROJECT_NAME: project.name.replace(/[^a-zA-Z0-9]/g, '_'),
            APP_MODULE: 'app',
            WORKERS: 4,

            // Java-specific
            JAVA_VERSION: '17',
            MAVEN_IMAGE: 'alpine',
            JAVA_OPTS: '-Xms512m -Xmx1024m',

            // Go-specific
            GO_VERSION: '1.21',
            MAIN_PACKAGE: '.',

            // Ruby-specific
            RUBY_VERSION: '3.2',
            IS_RAILS: frameworks.some(f => f.name.toLowerCase().includes('rails')),

            // PHP-specific
            PHP_VERSION: '8.2',
            COMPOSER_VERSION: 'latest'
        };

        // Select template
        const templateName = selectTemplate(primaryLanguage);
        const templatePath = path.join(__dirname, '../templates/dockerfiles', templateName);

        // Read template
        let dockerfileContent = await fs.readFile(templatePath, 'utf-8');

        // Simple variable substitution (we'll use template parser in Phase 3)
        dockerfileContent = dockerfileContent.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return templateVars[key] !== undefined ? templateVars[key] : match;
        });

        await BuildLog.createLog(projectId, 'dockerfile', 'Dockerfile generated successfully', {
            level: 'info',
            details: { baseImage, port, template: templateName }
        });

        return {
            content: dockerfileContent,
            config: {
                baseImage,
                port,
                healthCheck: healthCheckEndpoint,
                envVars,
                strategy: 'multi-stage',
                templateUsed: templateName
            }
        };

    } catch (error) {
        await BuildLog.createLog(projectId, 'dockerfile', `Dockerfile generation failed: ${error.message}`, {
            level: 'error',
            details: { error: error.stack }
        });
        throw error;
    }
}

/**
 * Main entry point - Generate and save Dockerfile
 */
async function generateDockerfile(projectId, options = {}) {
    try {
        const { content, config } = await generateDockerfileContent(projectId);

        // Update project with Dockerfile
        const project = await Project.findById(projectId);

        project.dockerfile = {
            generated: true,
            content,
            baseImage: config.baseImage,
            strategy: config.strategy,
            optimizations: ['multi-stage', 'layer-caching', 'non-root-user', 'minimal-image'],
            generatedAt: new Date()
        };

        project.dockerConfig = {
            port: config.port,
            environmentVars: config.envVars,
            volumes: [],
            healthCheck: {
                enabled: !!config.healthCheck,
                endpoint: config.healthCheck,
                interval: '30s'
            }
        };

        project.dockerfileStatus = 'generated';

        await project.save();

        // Also save to filesystem
        const workspacePath = project.workspacePath;
        if (workspacePath) {
            const dockerfilePath = path.join(workspacePath, 'Dockerfile');
            await fs.writeFile(dockerfilePath, content, 'utf-8');

            await BuildLog.createLog(projectId, 'dockerfile', `Dockerfile saved to ${dockerfilePath}`, {
                level: 'info'
            });
        }

        return {
            success: true,
            dockerfile: project.dockerfile,
            config: project.dockerConfig
        };

    } catch (error) {
        // Update status to failed
        await Project.findByIdAndUpdate(projectId, {
            dockerfileStatus: 'failed'
        });

        throw error;
    }
}

module.exports = {
    generateDockerfile,
    generateDockerfileContent,
    selectBaseImage,
    determinePackageManager,
    getDefaultPort,
    getHealthCheckEndpoint
};
