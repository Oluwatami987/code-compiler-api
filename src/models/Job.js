const mongoose = require('mongoose')

const jobSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  language: {
    type: String,
    enum: ['javascript', 'python', 'go', 'c', 'cpp'],
    required: true
  },
  code: {
    type: String,
    required: true
  },
  stdin: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'timed_out'],
    default: 'pending',
    index: true
  },
  output: {
    stdout: { type: String, default: '' },
    stderr: { type: String, default: '' },
    exitCode: { type: Number },
    executionTimeMs: { type: Number }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: {
    type: Date
  }
})

// compound index for paginated job history per user
jobSchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.model('Job', jobSchema)