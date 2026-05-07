const Job = require('../models/Job')
const jobQueue = require('../queues/jobQueue')
const { redis } = require('../config/redis')


const SUPPORTED_LANGUAGES = ['javascript', 'python', 'go', 'c', 'cpp']

exports.submitJob = async (req, res, next) => {
  try {
    const { language, code, stdin = '' } = req.body

    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_LANGUAGE',
          message: `Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`
        }
      })
    }

    const job = await Job.create({
      userId: req.user.id,
      language,
      code,
      stdin
    })

    await jobQueue.add('execute', {
      jobId: job._id.toString(),
      language,
      code,
      stdin
    })

    res.status(202).json({
      jobId: job._id,
      status: 'pending',
      pollUrl: `/jobs/${job._id}`
    })
  } catch (err) {
    next(err)
  }
}

exports.getJob = async (req, res, next) => {
  try {
    const { jobId } = req.params

    // check redis cache first
    const cached = await redis.get(`job_result:${jobId}`)
    if (cached) {
      return res.json(JSON.parse(cached))
    }

    const job = await Job.findOne({ _id: jobId, userId: req.user.id })
    if (!job) {
      return res.status(404).json({
        error: { code: 'JOB_NOT_FOUND', message: 'Job not found' }
      })
    }

    const response = {
      jobId: job._id,
      status: job.status,
      language: job.language,
      output: job.output,
      createdAt: job.createdAt,
      completedAt: job.completedAt
    }

    // cache completed/failed/timed_out jobs — they won't change
    if (['completed', 'failed', 'timed_out'].includes(job.status)) {
      await redis.set(`job_result:${jobId}`, JSON.stringify(response), 'EX', 3600)
    }

    res.json(response)
  } catch (err) {
    next(err)
  }
}

exports.getMyJobs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    const filter = { userId: req.user.id }
    if (req.query.language) filter.language = req.query.language
    if (req.query.status) filter.status = req.query.status

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-code'), // don't return full code in list view
      Job.countDocuments(filter)
    ])

    res.json({
      jobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    })
  } catch (err) {
    next(err)
  }
}