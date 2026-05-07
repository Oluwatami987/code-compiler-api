const { Queue } = require('bullmq')
const { bullRedis } = require('../config/redis')

const jobQueue = new Queue('code-execution', {
  connection: bullRedis
})

module.exports = jobQueue