require('dotenv').config()
const { Worker } = require('bullmq')
const mongoose = require('mongoose')
const { redis, bullRedis } = require('../config/redis')
const Job = require('../models/Job')
const runInSandbox = require('../services/dockerService')

async function start() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Worker: MongoDB connected')

  const worker = new Worker('code-execution', async (bullJob) => {
    const { jobId, language, code, stdin } = bullJob.data
    console.log(`Processing job ${jobId} [${language}]`)

    // mark as running
    await Job.findByIdAndUpdate(jobId, { status: 'running' }, { returnDocument: 'after' })

    const result = await runInSandbox({ language, code, stdin })

    const status = result.timedOut ? 'timed_out' : result.exitCode === 0 ? 'completed' : 'failed'

const updated = await Job.findByIdAndUpdate(
  jobId,
  {
    status,
    output: {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      executionTimeMs: result.executionTimeMs
    },
    completedAt: new Date()
  },
  { returnDocument: 'after' }
)

    // cache the result in redis for 1 hour
    const response = {
      jobId: updated._id,
      status: updated.status,
      language: updated.language,
      output: updated.output,
      createdAt: updated.createdAt,
      completedAt: updated.completedAt
    }

    await redis.set(`job_result:${jobId}`, JSON.stringify(response), 'EX', 3600)

    console.log(`Job ${jobId} → ${status} in ${result.executionTimeMs}ms`)
  }, {
    connection: bullRedis
  })

  worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err.message)
  })

  console.log('Worker running, waiting for jobs...')
}

start()


