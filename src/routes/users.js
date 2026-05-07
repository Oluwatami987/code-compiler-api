const router = require('express').Router()
const authenticate = require('../middlewares/authenticate')
const { getMe, getMyStats } = require('../controllers/userController')

router.use(authenticate)

router.get('/me', getMe)
router.get('/me/stats', getMyStats)

module.exports = router