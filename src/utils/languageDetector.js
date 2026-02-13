// Language Detection Utility
// Identifies programming languages based on file extensions and patterns

const fs = require('fs').promises;
const path = require('path');

// Language to file extension mapping
const LANGUAGE_MAP = {
  JavaScript: ['.js', '.jsx', '.mjs', '.cjs'],
  TypeScript: ['.ts', '.tsx'],
  Python: ['.py', '.pyw'],
  Java: ['.java'],
  Go: ['.go'],
  Ruby: ['.rb'],
  PHP: ['.php'],
  'C#': ['.cs'],
  'C++': ['.cpp', '.cc', '.cxx', '.h', '.hpp'],
  C: ['.c', '.h'],
  Rust: ['.rs'],
  Swift: ['.swift'],
  Kotlin: ['.kt', '.kts'],
  Scala: ['.scala'],
  HTML: ['.html', '.htm'],
  CSS: ['.css', '.scss', '.sass', '.less'],
  SQL: ['.sql'],
  Shell: ['.sh', '.bash', '.zsh'],
  YAML: ['.yml', '.yaml'],
  JSON: ['.json'],
  Markdown: ['.md', '.markdown'],
  XML: ['.xml']
};

// Reverse mapping: extension -> language
const EXTENSION_TO_LANGUAGE = {};
Object.keys(LANGUAGE_MAP).forEach(language => {
  LANGUAGE_MAP[language].forEach(ext => {
    EXTENSION_TO_LANGUAGE[ext] = language;
  });
});

// Directories to ignore during scanning
const IGNORE_DIRS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'target',
  'bin',
  'obj',
  '.gradle',
  'vendor',
  '__pycache__',
  '.pytest_cache',
  '.venv',
  'venv',
  'env',
  '.idea',
  '.vscode',
  'coverage',
  '.nuxt',
  'out'
];

/**
 * Recursively scan directory and count files by language
 * @param {string} dirPath - Directory to scan
 * @param {number} maxDepth - Maximum recursion depth (default: 10)
 * @returns {Promise<Object>} Language statistics
 */
async function scanDirectory(dirPath, maxDepth = 10, currentDepth = 0) {
  const languageStats = {};

  if (currentDepth >= maxDepth) {
    return languageStats;
  }

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Skip ignored directories
        if (IGNORE_DIRS.includes(entry.name)) {
          continue;
        }

        // Recursively scan subdirectory
        const subStats = await scanDirectory(fullPath, maxDepth, currentDepth + 1);
        
        // Merge stats
        Object.keys(subStats).forEach(lang => {
          if (!languageStats[lang]) {
            languageStats[lang] = { count: 0, files: [] };
          }
          languageStats[lang].count += subStats[lang].count;
          languageStats[lang].files.push(...subStats[lang].files);
        });
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const language = EXTENSION_TO_LANGUAGE[ext];

        if (language) {
          if (!languageStats[language]) {
            languageStats[language] = { count: 0, files: [] };
          }
          languageStats[language].count++;
          languageStats[language].files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error.message);
  }

  return languageStats;
}

/**
 * Detect languages in a project directory
 * @param {string} projectPath - Path to project directory
 * @returns {Promise<Array>} Array of detected languages with percentages
 */
async function detectLanguages(projectPath) {
  const languageStats = await scanDirectory(projectPath);

  // Calculate total file count
  const totalFiles = Object.values(languageStats).reduce(
    (sum, stats) => sum + stats.count,
    0
  );

  if (totalFiles === 0) {
    return [];
  }

  // Convert to array and calculate percentages
  const languages = Object.keys(languageStats).map(name => ({
    name,
    fileCount: languageStats[name].count,
    percentage: Math.round((languageStats[name].count / totalFiles) * 100 * 10) / 10
  }));

  // Sort by file count (descending)
  languages.sort((a, b) => b.fileCount - a.fileCount);

  return languages;
}

/**
 * Get primary programming language (highest percentage, excluding markup/config)
 * @param {Array} languages - Array of detected languages
 * @returns {string|null} Primary language name
 */
function getPrimaryLanguage(languages) {
  // Exclude markup and config languages from primary selection
  const excludeFromPrimary = ['HTML', 'CSS', 'JSON', 'YAML', 'XML', 'Markdown'];
  
  const programmingLanguages = languages.filter(
    lang => !excludeFromPrimary.includes(lang.name)
  );

  return programmingLanguages.length > 0 ? programmingLanguages[0].name : null;
}

/**
 * Check if a specific file exists in the project
 * @param {string} projectPath - Path to project directory
 * @param {string} fileName - File name to check
 * @returns {Promise<boolean>} True if file exists
 */
async function fileExists(projectPath, fileName) {
  try {
    await fs.access(path.join(projectPath, fileName));
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if multiple files exist in the project
 * @param {string} projectPath - Path to project directory
 * @param {Array<string>} fileNames - Array of file names to check
 * @returns {Promise<Object>} Object with file existence status
 */
async function checkFiles(projectPath, fileNames) {
  const results = {};
  
  for (const fileName of fileNames) {
    results[fileName] = await fileExists(projectPath, fileName);
  }
  
  return results;
}

module.exports = {
  detectLanguages,
  getPrimaryLanguage,
  fileExists,
  checkFiles,
  LANGUAGE_MAP,
  IGNORE_DIRS
};
