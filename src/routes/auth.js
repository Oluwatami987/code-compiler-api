const router = require('express').Router()
const { body } = require('express-validator')
const validate = require('../middlewares/validate')
const { register, login, refresh } = require('../controllers/authController')

const authRules = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
]

router.post('/register', authRules, validate, register)
router.post('/login', authRules, validate, login)
router.post('/refresh', body('refreshToken').notEmpty().withMessage('Refresh token is required'), validate, refresh)

module.exports = router