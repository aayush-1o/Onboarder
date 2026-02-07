const axios = require('axios');

class GitHubService {
    constructor() {
        this.baseURL = 'https://api.github.com';
        this.token = process.env.GITHUB_TOKEN;

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            },
            timeout: 10000
        });
    }

    /**
     * Parse GitHub URL to extract owner and repo name
     * @param {string} repoUrl - GitHub repository URL
     * @returns {object} - { owner, repo }
     */
    parseRepoUrl(repoUrl) {
        // Remove .git if present
        const cleanUrl = repoUrl.replace(/\.git$/, '');

        // Match patterns: https://github.com/owner/repo or git@github.com:owner/repo
        const httpsPattern = /https:\/\/github\.com\/([\w-]+)\/([\w.-]+)/;
        const sshPattern = /git@github\.com:([\w-]+)\/([\w.-]+)/;

        let match = cleanUrl.match(httpsPattern) || cleanUrl.match(sshPattern);

        if (!match) {
            throw new Error('Invalid GitHub repository URL');
        }

        return {
            owner: match[1],
            repo: match[2]
        };
    }

    /**
     * Validate if repository exists and is accessible
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @returns {object} - Repository metadata
     */
    async validateRepository(owner, repo) {
        try {
            const response = await this.client.get(`/repos/${owner}/${repo}`);

            return {
                isValid: true,
                data: {
                    name: response.data.name,
                    fullName: response.data.full_name,
                    owner: response.data.owner.login,
                    defaultBranch: response.data.default_branch,
                    description: response.data.description,
                    isPrivate: response.data.private,
                    language: response.data.language,
                    stars: response.data.stargazers_count,
                    forks: response.data.forks_count,
                    htmlUrl: response.data.html_url,
                    cloneUrl: response.data.clone_url,
                    createdAt: response.data.created_at,
                    updatedAt: response.data.updated_at
                }
            };
        } catch (error) {
            if (error.response) {
                if (error.response.status === 404) {
                    return {
                        isValid: false,
                        error: 'Repository not found'
                    };
                }
                if (error.response.status === 403) {
                    return {
                        isValid: false,
                        error: 'Access forbidden - repository may be private'
                    };
                }
                if (error.response.status === 401) {
                    return {
                        isValid: false,
                        error: 'Authentication failed - check your GitHub token'
                    };
                }
            }

            return {
                isValid: false,
                error: error.message || 'Failed to validate repository'
            };
        }
    }

    /**
     * Get repository metadata from URL
     * @param {string} repoUrl - GitHub repository URL
     * @returns {object} - Repository metadata
     */
    async getRepoMetadata(repoUrl) {
        const { owner, repo } = this.parseRepoUrl(repoUrl);
        const validation = await this.validateRepository(owner, repo);

        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        return validation.data;
    }

    /**
     * Check API rate limit status
     * @returns {object} - Rate limit info
     */
    async getRateLimit() {
        try {
            const response = await this.client.get('/rate_limit');
            return {
                limit: response.data.rate.limit,
                remaining: response.data.rate.remaining,
                reset: new Date(response.data.rate.reset * 1000)
            };
        } catch (error) {
            throw new Error('Failed to get rate limit information');
        }
    }
}

module.exports = new GitHubService();
