// Dependency Parser
// Parses dependency files from multiple language ecosystems

const fs = require('fs').promises;
const path = require('path');
const { fileExists } = require('../utils/languageDetector');

/**
 * Parse package.json (Node.js/npm)
 * @param {string} projectPath - Path to project directory
 * @returns {Promise<Object|null>} Parsed dependencies
 */
async function parseNodeJS(projectPath) {
    const packageJsonPath = path.join(projectPath, 'package.json');

    try {
        const content = await fs.readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(content);

        const runtime = [];
        const development = [];

        // Runtime dependencies
        if (packageJson.dependencies) {
            Object.entries(packageJson.dependencies).forEach(([name, version]) => {
                runtime.push({
                    name,
                    version: version.replace(/^[\^~]/, ''), // Remove ^ or ~
                    ecosystem: 'npm',
                    type: 'runtime'
                });
            });
        }

        // Dev dependencies
        if (packageJson.devDependencies) {
            Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
                development.push({
                    name,
                    version: version.replace(/^[\^~]/, ''),
                    ecosystem: 'npm',
                    type: 'development'
                });
            });
        }

        return {
            file: 'package.json',
            runtime,
            development,
            totalCount: runtime.length + development.length
        };
    } catch (error) {
        console.error('Error parsing package.json:', error.message);
        return null;
    }
}

/**
 * Parse requirements.txt (Python/pip)
 * @param {string} projectPath - Path to project directory
 * @returns {Promise<Object|null>} Parsed dependencies
 */
async function parsePython(projectPath) {
    const requirementsPath = path.join(projectPath, 'requirements.txt');

    try {
        const content = await fs.readFile(requirementsPath, 'utf-8');
        const lines = content.split('\n').filter(line =>
            line.trim() && !line.trim().startsWith('#')
        );

        const runtime = [];

        for (const line of lines) {
            const trimmed = line.trim();

            // Parse package==version or package>=version
            const match = trimmed.match(/^([a-zA-Z0-9_-]+)(==|>=|<=|~=|>|<)?(.+)?$/);

            if (match) {
                runtime.push({
                    name: match[1],
                    version: match[3] || 'latest',
                    ecosystem: 'pip',
                    type: 'runtime'
                });
            }
        }

        return {
            file: 'requirements.txt',
            runtime,
            development: [],
            totalCount: runtime.length
        };
    } catch (error) {
        // Try pyproject.toml as alternative
        return await parsePyProjectToml(projectPath);
    }
}

/**
 * Parse pyproject.toml (Python)
 * @param {string} projectPath - Path to project directory
 * @returns {Promise<Object|null>} Parsed dependencies
 */
async function parsePyProjectToml(projectPath) {
    const tomlPath = path.join(projectPath, 'pyproject.toml');

    try {
        const content = await fs.readFile(tomlPath, 'utf-8');
        const runtime = [];

        // Basic TOML parsing for dependencies (simplified)
        const depSection = content.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)(\[|$)/);

        if (depSection) {
            const lines = depSection[1].split('\n');

            for (const line of lines) {
                const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*"(.+?)"/);
                if (match) {
                    runtime.push({
                        name: match[1],
                        version: match[2].replace(/^[\^~]/, ''),
                        ecosystem: 'pip',
                        type: 'runtime'
                    });
                }
            }
        }

        return {
            file: 'pyproject.toml',
            runtime,
            development: [],
            totalCount: runtime.length
        };
    } catch (error) {
        return null;
    }
}

/**
 * Parse pom.xml (Java/Maven)
 * @param {string} projectPath - Path to project directory
 * @returns {Promise<Object|null>} Parsed dependencies
 */
async function parseJava(projectPath) {
    const pomPath = path.join(projectPath, 'pom.xml');

    try {
        const content = await fs.readFile(pomPath, 'utf-8');
        const runtime = [];

        // Simple XML parsing for dependencies
        const depMatches = content.matchAll(/<dependency>([\s\S]*?)<\/dependency>/g);

        for (const match of depMatches) {
            const depContent = match[1];
            const groupId = depContent.match(/<groupId>(.*?)<\/groupId>/)?.[1];
            const artifactId = depContent.match(/<artifactId>(.*?)<\/artifactId>/)?.[1];
            const version = depContent.match(/<version>(.*?)<\/version>/)?.[1];
            const scope = depContent.match(/<scope>(.*?)<\/scope>/)?.[1];

            if (groupId && artifactId) {
                runtime.push({
                    name: `${groupId}:${artifactId}`,
                    version: version || 'unknown',
                    ecosystem: 'maven',
                    type: scope === 'test' ? 'development' : 'runtime'
                });
            }
        }

        return {
            file: 'pom.xml',
            runtime: runtime.filter(d => d.type === 'runtime'),
            development: runtime.filter(d => d.type === 'development'),
            totalCount: runtime.length
        };
    } catch (error) {
        return await parseGradle(projectPath);
    }
}

/**
 * Parse build.gradle (Java/Gradle)
 * @param {string} projectPath - Path to project directory
 * @returns {Promise<Object|null>} Parsed dependencies
 */
async function parseGradle(projectPath) {
    const gradlePath = path.join(projectPath, 'build.gradle');

    try {
        const content = await fs.readFile(gradlePath, 'utf-8');
        const runtime = [];

        // Simple pattern matching for dependencies
        const depMatches = content.matchAll(/implementation\s+['"](.+?)['"]/g);

        for (const match of depMatches) {
            const [group, artifact, version] = match[1].split(':');
            runtime.push({
                name: `${group}:${artifact}`,
                version: version || 'latest',
                ecosystem: 'gradle',
                type: 'runtime'
            });
        }

        return {
            file: 'build.gradle',
            runtime,
            development: [],
            totalCount: runtime.length
        };
    } catch (error) {
        return null;
    }
}

/**
 * Parse go.mod (Go)
 * @param {string} projectPath - Path to project directory
 * @returns {Promise<Object|null>} Parsed dependencies
 */
async function parseGo(projectPath) {
    const goModPath = path.join(projectPath, 'go.mod');

    try {
        const content = await fs.readFile(goModPath, 'utf-8');
        const runtime = [];

        // Parse require block
        const requireMatches = content.matchAll(/require\s+([^\s]+)\s+v([^\s]+)/g);

        for (const match of requireMatches) {
            runtime.push({
                name: match[1],
                version: match[2],
                ecosystem: 'go',
                type: 'runtime'
            });
        }

        return {
            file: 'go.mod',
            runtime,
            development: [],
            totalCount: runtime.length
        };
    } catch (error) {
        return null;
    }
}

/**
 * Parse Gemfile (Ruby)
 * @param {string} projectPath - Path to project directory
 * @returns {Promise<Object|null>} Parsed dependencies
 */
async function parseRuby(projectPath) {
    const gemfilePath = path.join(projectPath, 'Gemfile');

    try {
        const content = await fs.readFile(gemfilePath, 'utf-8');
        const runtime = [];
        const development = [];

        const lines = content.split('\n');
        let inDevGroup = false;

        for (const line of lines) {
            const trimmed = line.trim();

            // Check for group blocks
            if (trimmed.startsWith('group :development')) {
                inDevGroup = true;
                continue;
            }
            if (trimmed === 'end') {
                inDevGroup = false;
                continue;
            }

            // Parse gem lines
            const gemMatch = trimmed.match(/gem\s+['"]([^'"]+)['"]\s*,?\s*['"]?([^'"]*)?['"]?/);

            if (gemMatch) {
                const dep = {
                    name: gemMatch[1],
                    version: gemMatch[2] || 'latest',
                    ecosystem: 'gem',
                    type: inDevGroup ? 'development' : 'runtime'
                };

                if (inDevGroup) {
                    development.push(dep);
                } else {
                    runtime.push(dep);
                }
            }
        }

        return {
            file: 'Gemfile',
            runtime,
            development,
            totalCount: runtime.length + development.length
        };
    } catch (error) {
        return null;
    }
}

/**
 * Parse composer.json (PHP)
 * @param {string} projectPath - Path to project directory
 * @returns {Promise<Object|null>} Parsed dependencies
 */
async function parsePHP(projectPath) {
    const composerPath = path.join(projectPath, 'composer.json');

    try {
        const content = await fs.readFile(composerPath, 'utf-8');
        const composer = JSON.parse(content);

        const runtime = [];
        const development = [];

        if (composer.require) {
            Object.entries(composer.require).forEach(([name, version]) => {
                runtime.push({
                    name,
                    version: version.replace(/^[\^~]/, ''),
                    ecosystem: 'composer',
                    type: 'runtime'
                });
            });
        }

        if (composer['require-dev']) {
            Object.entries(composer['require-dev']).forEach(([name, version]) => {
                development.push({
                    name,
                    version: version.replace(/^[\^~]/, ''),
                    ecosystem: 'composer',
                    type: 'development'
                });
            });
        }

        return {
            file: 'composer.json',
            runtime,
            development,
            totalCount: runtime.length + development.length
        };
    } catch (error) {
        return null;
    }
}

/**
 * Parse all dependency files in a project
 * @param {string} projectPath - Path to project directory
 * @returns {Promise<Object>} Combined dependency information
 */
async function parseDependencies(projectPath) {
    const parsers = [
        { name: 'Node.js', parser: parseNodeJS },
        { name: 'Python', parser: parsePython },
        { name: 'Java', parser: parseJava },
        { name: 'Go', parser: parseGo },
        { name: 'Ruby', parser: parseRuby },
        { name: 'PHP', parser: parsePHP }
    ];

    const results = {
        files: [],
        runtime: [],
        development: [],
        totalCount: 0,
        ecosystems: new Set()
    };

    for (const { name, parser } of parsers) {
        try {
            const parsed = await parser(projectPath);

            if (parsed) {
                results.files.push(parsed.file);
                results.runtime.push(...parsed.runtime);
                results.development.push(...parsed.development);

                // Track ecosystems
                parsed.runtime.forEach(dep => results.ecosystems.add(dep.ecosystem));
                parsed.development.forEach(dep => results.ecosystems.add(dep.ecosystem));
            }
        } catch (error) {
            // Silently continue to next parser
        }
    }

    results.totalCount = results.runtime.length + results.development.length;
    results.ecosystems = Array.from(results.ecosystems);

    return results;
}

module.exports = {
    parseNodeJS,
    parsePython,
    parseJava,
    parseGo,
    parseRuby,
    parsePHP,
    parseDependencies
};
