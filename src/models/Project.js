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

    // Analysis Results
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

    // Metadata
    workspacePath: String,
    lastBuildAt: Date,
    errorMessage: String

}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for faster queries
ProjectSchema.index({ repoUrl: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ createdAt: -1 });

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
