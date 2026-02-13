const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    // Repository Information
    repoUrl: {
        type: String,
        required: [true, 'Repository URL is required'],
        trim: true,
        validate: {
            validator: function (v) {
                return /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\.git$|^https:\/\/github\.com\/[\w-]+\/[\w.-]+$/.test(v);
            },
            message: 'Please provide a valid GitHub repository URL'
        }
    },

    name: {
        type: String,
        required: true,
        trim: true
    },

    owner: {
        type: String,
        required: true,
        trim: true
    },

    defaultBranch: {
        type: String,
        default: 'main'
    },

    // Project Status
    status: {
        type: String,
        enum: ['pending', 'cloning', 'cloned', 'analyzing', 'analyzed', 'generating', 'generated', 'building', 'running', 'stopped', 'failed', 'error'],
        default: 'pending'
    },

    // Analysis Results (New - Day 4)
    analysisStatus: {
        type: String,
        enum: ['pending', 'analyzing', 'completed', 'failed'],
        default: 'pending'
    },

    analysis: {
        languages: [{
            name: String,
            percentage: Number,
            fileCount: Number
        }],
        primaryLanguage: String,
        frameworks: [{
            name: String,
            type: String,  // 'backend', 'frontend', 'fullstack', 'mobile'
            confidence: Number
        }],
        hasDatabase: Boolean,
        databases: [String],
        buildTools: [String],
        packageManager: String
    },

    dependencies: {
        files: [String],
        runtime: [{
            name: String,
            version: String,
            ecosystem: String,
            type: String
        }],
        development: [{
            name: String,
            version: String,
            ecosystem: String,
            type: String
        }],
        totalCount: Number,
        ecosystems: [String]
    },

    analyzedAt: Date,

    // Legacy Tech Stack (Day 1-3, kept for backward compatibility)
    techStack: {
        language: String,
        runtime: String,
        version: String,
        framework: String,
        dependencies: [String],
        hasDatabase: {
            type: Boolean,
            default: false
        },
        databaseType: String
    },

    // Build Configuration
    buildConfig: {
        entryPoint: String,
        buildCommand: String,
        startCommand: String,
        ports: [Number],
        envVars: [String],
        services: [String]
    },

    // Docker Information
    dockerInfo: {
        dockerfilePath: String,
        dockerComposeePath: String,
        imageId: String,
        containerId: String
    },

    // Workspace & Cloning Information
    workspacePath: String,
    cloneStatus: {
        type: String,
        enum: ['pending', 'cloning', 'cloned', 'failed'],
        default: 'pending'
    },
    clonedAt: Date,
    workspaceSize: Number, // Size in bytes
    jobId: String, // Reference to background job

    // Metadata
    lastBuildAt: Date,
    errorMessage: String

}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for faster queries
ProjectSchema.index({ repoUrl: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ createdAt: -1 });
ProjectSchema.index({ cloneStatus: 1 });
ProjectSchema.index({ analysisStatus: 1 });
ProjectSchema.index({ jobId: 1 });

// Virtual for repository identifier
ProjectSchema.virtual('repoIdentifier').get(function () {
    return `${this.owner}/${this.name}`;
});

// Method to update status
ProjectSchema.methods.updateStatus = async function (newStatus, errorMessage = null) {
    this.status = newStatus;
    if (errorMessage) {
        this.errorMessage = errorMessage;
    }
    return await this.save();
};

// Static method to find projects by status
ProjectSchema.statics.findByStatus = function (status) {
    return this.find({ status });
};

module.exports = mongoose.model('Project', ProjectSchema);
