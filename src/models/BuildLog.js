const mongoose = require('mongoose');

const BuildLogSchema = new mongoose.Schema({
    // Reference to Project
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },

    // Log Information
    logType: {
        type: String,
        enum: ['clone', 'analysis', 'docker-generate', 'docker-build', 'container-start', 'container-stop', 'error', 'info', 'workspace', 'git', 'filesystem', 'queue'],
        required: true
    },

    message: {
        type: String,
        required: true
    },

    // Additional Details
    details: {
        type: mongoose.Schema.Types.Mixed, // Flexible object for any additional data
        default: {}
    },

    // Log Level
    level: {
        type: String,
        enum: ['debug', 'info', 'warn', 'error', 'success'],
        default: 'info'
    },

    // Build Phase
    phase: {
        type: String,
        enum: ['initialization', 'cloning', 'analysis', 'generation', 'build', 'execution', 'cleanup'],
        default: 'initialization'
    },

    // Exit Code (for commands)
    exitCode: Number,

    // Duration (in milliseconds)
    duration: Number

}, {
    timestamps: true
});

// Indexes for efficient querying
BuildLogSchema.index({ projectId: 1, createdAt: -1 });
BuildLogSchema.index({ logType: 1 });
BuildLogSchema.index({ level: 1 });

// Static method to get logs for a project
BuildLogSchema.statics.getProjectLogs = function (projectId, options = {}) {
    const { limit = 100, logType, level } = options;

    const query = { projectId };
    if (logType) query.logType = logType;
    if (level) query.level = level;

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit);
};

// Static method to create a log entry
BuildLogSchema.statics.createLog = async function (projectId, logType, message, options = {}) {
    const { level = 'info', details = {}, phase = 'initialization', exitCode, duration } = options;

    return await this.create({
        projectId,
        logType,
        message,
        level,
        details,
        phase,
        exitCode,
        duration
    });
};

// Static method to clear old logs
BuildLogSchema.statics.clearOldLogs = async function (daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    return await this.deleteMany({
        createdAt: { $lt: cutoffDate }
    });
};

module.exports = mongoose.model('BuildLog', BuildLogSchema);
