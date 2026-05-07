const router = require('express').Router()
const { body, query } = require('express-validator')
const authenticate = require('../middlewares/authenticate')
const rateLimiter = require('../middlewares/rateLimiter')
const validate = require('../middlewares/validate')
const { submitJob, getJob, getMyJobs } = require('../controllers/jobController')

const submitRules = [
  body('language').notEmpty().withMessage('Language is required'),
  body('code').notEmpty().withMessage('Code is required')
]

// all job routes require auth
router.use(authenticate)

router.post('/', rateLimiter, submitRules, validate, submitJob)
router.get('/', getMyJobs)
router.get('/:jobId', getJob)

module.exports = router