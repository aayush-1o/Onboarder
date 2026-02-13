// Framework Detection Utility
// Identifies frameworks and libraries based on dependencies and file patterns

const { fileExists, checkFiles } = require('./languageDetector');
const path = require('path');
const fs = require('fs').promises;

// Framework detection patterns
const FRAMEWORKS = {
    // JavaScript/Node.js
    'Express.js': {
        type: 'backend',
        ecosystem: 'npm',
        indicators: {
            dependencies: ['express'],
            files: []
        }
    },
    'React': {
        type: 'frontend',
        ecosystem: 'npm',
        indicators: {
            dependencies: ['react'],
            files: []
        }
    },
    'Next.js': {
        type: 'fullstack',
        ecosystem: 'npm',
        indicators: {
            dependencies: ['next'],
            files: ['next.config.js', 'next.config.mjs']
        }
    },
    'Vue.js': {
        type: 'frontend',
        ecosystem: 'npm',
        indicators: {
            dependencies: ['vue'],
            files: []
        }
    },
    'Nuxt.js': {
        type: 'fullstack',
        ecosystem: 'npm',
        indicators: {
            dependencies: ['nuxt'],
            files: ['nuxt.config.js', 'nuxt.config.ts']
        }
    },
    'Angular': {
        type: 'frontend',
        ecosystem: 'npm',
        indicators: {
            dependencies: ['@angular/core'],
            files: ['angular.json']
        }
    },
    'NestJS': {
        type: 'backend',
        ecosystem: 'npm',
        indicators: {
            dependencies: ['@nestjs/core'],
            files: ['nest-cli.json']
        }
    },
    'Fastify': {
        type: 'backend',
        ecosystem: 'npm',
        indicators: {
            dependencies: ['fastify'],
            files: []
        }
    },

    // Python
    'Django': {
        type: 'fullstack',
        ecosystem: 'pip',
        indicators: {
            dependencies: ['django', 'Django'],
            files: ['manage.py']
        }
    },
    'Flask': {
        type: 'backend',
        ecosystem: 'pip',
        indicators: {
            dependencies: ['flask', 'Flask'],
            files: []
        }
    },
    'FastAPI': {
        type: 'backend',
        ecosystem: 'pip',
        indicators: {
            dependencies: ['fastapi'],
            files: []
        }
    },

    // Java
    'Spring Boot': {
        type: 'backend',
        ecosystem: 'maven',
        indicators: {
            dependencies: ['spring-boot'],
            files: []
        }
    },

    // Ruby
    'Ruby on Rails': {
        type: 'fullstack',
        ecosystem: 'gem',
        indicators: {
            dependencies: ['rails'],
            files: ['config/routes.rb']
        }
    },

    // PHP
    'Laravel': {
        type: 'fullstack',
        ecosystem: 'composer',
        indicators: {
            dependencies: ['laravel/framework'],
            files: ['artisan']
        }
    },
    'Symfony': {
        type: 'fullstack',
        ecosystem: 'composer',
        indicators: {
            dependencies: ['symfony/framework-bundle'],
            files: []
        }
    },

    // Go
    'Gin': {
        type: 'backend',
        ecosystem: 'go',
        indicators: {
            dependencies: ['github.com/gin-gonic/gin'],
            files: []
        }
    },
    'Echo': {
        type: 'backend',
        ecosystem: 'go',
        indicators: {
            dependencies: ['github.com/labstack/echo'],
            files: []
        }
    }
};

// Database detection patterns
const DATABASES = {
    MongoDB: ['mongodb', 'mongoose'],
    PostgreSQL: ['pg', 'postgresql', 'psycopg2'],
    MySQL: ['mysql', 'mysql2', 'pymysql', 'mysqlclient'],
    SQLite: ['sqlite', 'sqlite3'],
    Redis: ['redis', 'ioredis'],
    MariaDB: ['mariadb'],
    'SQL Server': ['mssql', 'pyodbc'],
    Oracle: ['oracledb', 'cx_Oracle']
};

// Build tools detection
const BUILD_TOOLS = {
    Webpack: ['webpack', 'webpack.config.js'],
    Vite: ['vite', 'vite.config.js', 'vite.config.ts'],
    Rollup: ['rollup', 'rollup.config.js'],
    Parcel: ['parcel'],
    esbuild: ['esbuild'],
    Gradle: ['build.gradle', 'build.gradle.kts'],
    Maven: ['pom.xml'],
    npm: ['package.json'],
    Yarn: ['yarn.lock'],
    pnpm: ['pnpm-lock.yaml']
};

/**
 * Detect frameworks based on dependencies and files
 * @param {string} projectPath - Path to project directory
 * @param {Object} dependencies - Parsed dependencies object
 * @returns {Promise<Array>} Array of detected frameworks
 */
async function detectFrameworks(projectPath, dependencies = {}) {
    const detectedFrameworks = [];

    // Get all dependency names (runtime + dev)
    const allDeps = [
        ...(dependencies.runtime || []).map(d => d.name),
        ...(dependencies.development || []).map(d => d.name)
    ];

    for (const [frameworkName, config] of Object.entries(FRAMEWORKS)) {
        let confidence = 0;
        const detectionReasons = [];

        // Check dependencies
        for (const depPattern of config.indicators.dependencies) {
            const found = allDeps.some(dep =>
                dep.toLowerCase().includes(depPattern.toLowerCase())
            );

            if (found) {
                confidence += 0.7;
                detectionReasons.push(`Dependency: ${depPattern}`);
            }
        }

        // Check files
        for (const fileName of config.indicators.files) {
            if (await fileExists(projectPath, fileName)) {
                confidence += 0.3;
                detectionReasons.push(`File: ${fileName}`);
            }
        }

        // If framework detected with sufficient confidence
        if (confidence >= 0.5) {
            detectedFrameworks.push({
                name: frameworkName,
                type: config.type,
                ecosystem: config.ecosystem,
                confidence: Math.min(confidence, 1.0),
                reasons: detectionReasons
            });
        }
    }

    // Sort by confidence (descending)
    detectedFrameworks.sort((a, b) => b.confidence - a.confidence);

    return detectedFrameworks;
}

/**
 * Detect databases based on dependencies
 * @param {Object} dependencies - Parsed dependencies object
 * @returns {Array} Array of detected databases
 */
function detectDatabases(dependencies = {}) {
    const detectedDatabases = new Set();

    const allDeps = [
        ...(dependencies.runtime || []).map(d => d.name.toLowerCase()),
        ...(dependencies.development || []).map(d => d.name.toLowerCase())
    ];

    for (const [dbName, patterns] of Object.entries(DATABASES)) {
        for (const pattern of patterns) {
            if (allDeps.some(dep => dep.includes(pattern))) {
                detectedDatabases.add(dbName);
                break;
            }
        }
    }

    return Array.from(detectedDatabases);
}

/**
 * Detect build tools
 * @param {string} projectPath - Path to project directory
 * @param {Object} dependencies - Parsed dependencies object
 * @returns {Promise<Array>} Array of detected build tools
 */
async function detectBuildTools(projectPath, dependencies = {}) {
    const detectedTools = new Set();

    const allDeps = [
        ...(dependencies.runtime || []).map(d => d.name),
        ...(dependencies.development || []).map(d => d.name)
    ];

    for (const [toolName, indicators] of Object.entries(BUILD_TOOLS)) {
        for (const indicator of indicators) {
            // Check if it's a file
            if (indicator.includes('.')) {
                if (await fileExists(projectPath, indicator)) {
                    detectedTools.add(toolName);
                    break;
                }
            } else {
                // Check if it's a dependency
                if (allDeps.includes(indicator)) {
                    detectedTools.add(toolName);
                    break;
                }
            }
        }
    }

    return Array.from(detectedTools);
}

/**
 * Detect package manager based on lock files
 * @param {string} projectPath - Path to project directory
 * @returns {Promise<string|null>} Detected package manager
 */
async function detectPackageManager(projectPath) {
    const lockFiles = {
        'pnpm-lock.yaml': 'pnpm',
        'yarn.lock': 'yarn',
        'package-lock.json': 'npm',
        'bun.lockb': 'bun'
    };

    for (const [lockFile, manager] of Object.entries(lockFiles)) {
        if (await fileExists(projectPath, lockFile)) {
            return manager;
        }
    }

    // Default to npm if package.json exists
    if (await fileExists(projectPath, 'package.json')) {
        return 'npm';
    }

    return null;
}

module.exports = {
    detectFrameworks,
    detectDatabases,
    detectBuildTools,
    detectPackageManager,
    FRAMEWORKS,
    DATABASES,
    BUILD_TOOLS
};
