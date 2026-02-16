const fs = require('fs').promises;
const path = require('path');
const Project = require('../models/Project');
const BuildLog = require('../models/BuildLog');
const serviceDetector = require('../utils/serviceDetector');
const templateParser = require('../utils/templateParser');

/**
 * Docker Compose Generator Service
 * Generates docker-compose.yml for multi-service applications
 */

/**
 * Select appropriate compose template
 */
function selectComposeTemplate(services) {
    const { databases, caches } = services;

    // No external services - single service
    if (databases.length === 0 && caches.length === 0) {
        return 'single-service.compose.template';
    }

    // Database + Cache
    if (databases.length > 0 && caches.length > 0) {
        return 'app-database-cache.compose.template';
    }

    // Just database (most common)
    if (databases.length > 0) {
        return 'app-database.compose.template';
    }

    // Fallback to app-database
    return 'app-database.compose.template';
}

/**
 * Generate app service configuration
 */
function generateAppService(project) {
    const { name, dockerConfig } = project;

    return {
        serviceName: 'app',
        containerName: `${name.toLowerCase()}-app`,
        port: dockerConfig?.port || 3000,
        envVars: dockerConfig?.environmentVars || []
    };
}

/**
 * Generate database service configuration
 */
function generateDatabaseService(dbType, projectName) {
    const config = serviceDetector.getDatabaseConfig(dbType);

    if (!config) {
        throw new Error(`Unsupported database type: ${dbType}`);
    }

    const serviceName = dbType === 'postgresql' ? 'postgres' : dbType;
    const dbName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '_');

    return {
        serviceName,
        containerName: `${projectName.toLowerCase()}-${serviceName}`,
        image: config.image,
        port: config.port,
        volumeName: `${projectName.toLowerCase()}_${serviceName}_data`,
        volumePath: config.volumePath,
        envVars: config.envVars.map(ev => ({
            ...ev,
            value: ev.value.replace('{{DB_NAME}}', dbName)
        })),
        healthCheck: config.healthCheck,
        connectionString: config.connectionString
            .replace('{{DB_SERVICE_NAME}}', serviceName)
            .replace('{{DB_NAME}}', dbName),
        envKey: config.envKey
    };
}

/**
 * Generate cache service configuration
 */
function generateCacheService(cacheType, projectName) {
    const config = serviceDetector.getCacheConfig(cacheType);

    if (!config) {
        throw new Error(`Unsupported cache type: ${cacheType}`);
    }

    return {
        serviceName: cacheType,
        containerName: `${projectName.toLowerCase()}-${cacheType}`,
        image: config.image,
        port: config.port,
        volumeName: config.volumePath ? `${projectName.toLowerCase()}_${cacheType}_data` : null,
        volumePath: config.volumePath,
        connectionString: config.connectionString.replace('{{CACHE_SERVICE_NAME}}', cacheType),
        envKey: config.envKey
    };
}

/**
 * Generate docker-compose.yml content
 */
async function generateDockerComposeContent(projectId) {
    try {
        // Fetch project
        const project = await Project.findById(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        // Check prerequisites
        if (!project.analysis || project.analysisStatus !== 'completed') {
            throw new Error('Project analysis not complete');
        }

        if (!project.dockerfile || !project.dockerfile.generated) {
            throw new Error('Dockerfile not generated. Generate Dockerfile first.');
        }

        const { analysis, dependencies, name } = project;

        await BuildLog.createLog(projectId, 'docker-compose', 'Starting Docker Compose generation', {
            level: 'info'
        });

        // Detect required services
        const services = serviceDetector.detectRequiredServices(analysis, dependencies);

        await BuildLog.createLog(projectId, 'docker-compose', 'Services detected', {
            level: 'info',
            details: {
                databases: services.databases.map(d => d.type),
                caches: services.caches.map(c => c.type)
            }
        });

        // Select template
        const templateName = selectComposeTemplate(services);
        const templatePath = path.join(__dirname, '../templates/docker-compose', templateName);

        // Read template
        let composeContent = await fs.readFile(templatePath, 'utf-8');

        // Generate service configurations
        const appService = generateAppService(project);
        const networkName = `${name.toLowerCase()}_network`;

        // Template variables
        const templateVars = {
            APP_SERVICE_NAME: appService.serviceName,
            CONTAINER_NAME: appService.containerName,
            APP_PORT: appService.port,
            NODE_ENV: 'development',
            NETWORK_NAME: networkName,
            APP_ENV_VARS: appService.envVars
        };

        // Add database if detected
        if (services.databases.length > 0) {
            const dbType = services.databases[0].type;
            const dbService = generateDatabaseService(dbType, name);

            templateVars.DB_SERVICE_NAME = dbService.serviceName;
            templateVars.DB_CONTAINER_NAME = dbService.containerName;
            templateVars.DB_IMAGE = dbService.image;
            templateVars.DB_PORT = dbService.port;
            templateVars.DB_VOLUME_NAME = dbService.volumeName;
            templateVars.DB_VOLUME_PATH = dbService.volumePath;
            templateVars.DB_ENV_VARS = dbService.envVars;
            templateVars.DB_HEALTH_CHECK = dbService.healthCheck;
            templateVars.DB_CONNECTION_STRING = dbService.connectionString;
            templateVars.DB_ENV_KEY = dbService.envKey;
        }

        // Add cache if detected
        if (services.caches.length > 0) {
            const cacheType = services.caches[0].type;
            const cacheService = generateCacheService(cacheType, name);

            templateVars.CACHE_SERVICE_NAME = cacheService.serviceName;
            templateVars.CACHE_CONTAINER_NAME = cacheService.containerName;
            templateVars.CACHE_IMAGE = cacheService.image;
            templateVars.CACHE_PORT = cacheService.port;
            templateVars.CACHE_VOLUME_NAME = cacheService.volumeName;
            templateVars.CACHE_CONNECTION_STRING = cacheService.connectionString;
            templateVars.CACHE_ENV_KEY = cacheService.envKey;
        }

        // Parse template with variables
        composeContent = templateParser.parse(composeContent, templateVars);

        await BuildLog.createLog(projectId, 'docker-compose', 'Docker Compose generated successfully', {
            level: 'info',
            details: { template: templateName }
        });

        // Collect service info for database
        const servicesList = [
            { name: appService.serviceName, type: 'app', image: 'custom', port: appService.port }
        ];

        if (services.databases.length > 0) {
            const dbService = generateDatabaseService(services.databases[0].type, name);
            servicesList.push({
                name: dbService.serviceName,
                type: 'database',
                image: dbService.image,
                port: dbService.port
            });
        }

        if (services.caches.length > 0) {
            const cacheService = generateCacheService(services.caches[0].type, name);
            servicesList.push({
                name: cacheService.serviceName,
                type: 'cache',
                image: cacheService.image,
                port: cacheService.port
            });
        }

        const volumes = [];
        if (services.databases.length > 0) {
            volumes.push(`${name.toLowerCase()}_${services.databases[0].type}_data`);
        }
        if (services.caches.length > 0 && services.caches[0].type === 'redis') {
            volumes.push(`${name.toLowerCase()}_redis_data`);
        }

        return {
            content: composeContent,
            services: servicesList,
            volumes,
            networks: [networkName],
            detectedServices: services
        };

    } catch (error) {
        await BuildLog.createLog(projectId, 'docker-compose', `Generation failed: ${error.message}`, {
            level: 'error',
            details: { error: error.stack }
        });
        throw error;
    }
}

/**
 * Main entry point - Generate and save docker-compose.yml
 */
async function generateDockerCompose(projectId) {
    try {
        const { content, services, volumes, networks, detectedServices } =
            await generateDockerComposeContent(projectId);

        // Update project
        const project = await Project.findById(projectId);

        project.dockerCompose = {
            generated: true,
            content,
            services,
            volumes,
            networks,
            generatedAt: new Date()
        };

        // Save detected services
        project.services = {
            databases: detectedServices.databases.map(db => ({
                type: db.type,
                version: 'latest',
                port: serviceDetector.getDatabaseConfig(db.type)?.port
            })),
            caches: detectedServices.caches.map(cache => ({
                type: cache.type,
                port: serviceDetector.getCacheConfig(cache.type)?.port
            })),
            messageQueues: []
        };

        project.dockerComposeStatus = 'generated';

        await project.save();

        // Save to filesystem
        const workspacePath = project.workspacePath;
        if (workspacePath) {
            const composePath = path.join(workspacePath, 'docker-compose.yml');
            await fs.writeFile(composePath, content, 'utf-8');

            await BuildLog.createLog(projectId, 'docker-compose', `Saved to ${composePath}`, {
                level: 'info'
            });
        }

        return {
            success: true,
            dockerCompose: project.dockerCompose,
            services: project.services
        };

    } catch (error) {
        // Update status to failed
        await Project.findByIdAndUpdate(projectId, {
            dockerComposeStatus: 'failed'
        });

        throw error;
    }
}

module.exports = {
    generateDockerCompose,
    generateDockerComposeContent,
    selectComposeTemplate,
    generateAppService,
    generateDatabaseService,
    generateCacheService
};
