/**
 * Template Parser Utility
 * Parses Dockerfile templates with variable substitution and conditional logic
 */

/**
 * Parse template with variables
 * Supports: {{VAR}}, {{#if VAR}}...{{/if}}, {{#each ARRAY}}...{{/each}}
 */
function parseTemplate(template, variables) {
    let result = template;

    // 1. Handle conditional blocks: {{#if VAR}}...{{/if}}
    result = parseConditionals(result, variables);

    // 2. Handle else blocks: {{#if VAR}}...{{else}}...{{/if}}
    result = parseIfElse(result, variables);

    // 3. Handle loops: {{#each ARRAY}}...{{/each}}
    result = parseLoops(result, variables);

    // 4. Handle simple variable substitution: {{VAR}}
    result = parseVariables(result, variables);

    return result;
}

/**
 * Parse conditional blocks
 */
function parseConditionals(template, variables) {
    const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

    return template.replace(conditionalRegex, (match, varName, content) => {
        const value = variables[varName];

        // Check if variable is truthy
        if (value && value !== 'false' && value !== '0') {
            return content;
        }

        return '';
    });
}

/**
 * Parse if-else blocks
 */
function parseIfElse(template, variables) {
    const ifElseRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{else\s+if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

    return template.replace(ifElseRegex, (match, var1, content1, var2, content2) => {
        if (variables[var1] && variables[var1] !== 'false' && variables[var1] !== '0') {
            return content1;
        } else if (variables[var2] && variables[var2] !== 'false' && variables[var2] !== '0') {
            return content2;
        }
        return '';
    });
}

/**
 * Parse loops
 */
function parseLoops(template, variables) {
    const loopRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

    return template.replace(loopRegex, (match, arrayName, content) => {
        const array = variables[arrayName];

        if (!Array.isArray(array)) {
            return '';
        }

        return array.map(item => {
            let itemContent = content;

            // Replace {{key}} with item.key for each property
            if (typeof item === 'object') {
                Object.keys(item).forEach(key => {
                    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                    itemContent = itemContent.replace(regex, item[key]);
                });
            } else {
                // Simple array, replace {{this}}
                itemContent = itemContent.replace(/\{\{this\}\}/g, item);
            }

            return itemContent;
        }).join('\n');
    });
}

/**
 * Parse simple variables
 */
function parseVariables(template, variables) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        const value = variables[varName];

        if (value === undefined || value === null) {
            return match; // Keep placeholder if variable not found
        }

        return value;
    });
}

/**
 * Remove empty lines and clean up formatting
 */
function cleanupTemplate(template) {
    return template
        .split('\n')
        .map(line => line.trimRight())
        .filter((line, index, arr) => {
            // Remove multiple consecutive empty lines
            if (line === '' && arr[index - 1] === '') {
                return false;
            }
            return true;
        })
        .join('\n')
        .trim();
}

/**
 * Main parsing function with cleanup
 */
function parse(template, variables) {
    const parsed = parseTemplate(template, variables);
    return cleanupTemplate(parsed);
}

module.exports = {
    parse,
    parseTemplate,
    parseConditionals,
    parseIfElse,
    parseLoops,
    parseVariables,
    cleanupTemplate
};
