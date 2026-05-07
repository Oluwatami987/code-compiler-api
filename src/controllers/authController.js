const jwt = require('jsonwebtoken')
const User = require('../models/User')

function generateAccessToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  })
}

function generateRefreshToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN
  })
}

exports.register = async (req, res, next) => {
  try {
    const { email, password } = req.body

    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(409).json({
        error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists' }
      })
    }

    const user = await User.create({ email, passwordHash: password })

    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user._id, email: user.email, plan: user.plan }
    })
  } catch (err) {
    next(err)
  }
}

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' }
      })
    }

    const valid = await user.comparePassword(password)
    if (!valid) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' }
      })
    }

    user.lastLoginAt = new Date()
    await user.save()

    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)

    res.json({
      accessToken,
      refreshToken,
      user: { id: user._id, email: user.email, plan: user.plan }
    })
  } catch (err) {
    next(err)
  }
}

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(400).json({
        error: { code: 'MISSING_TOKEN', message: 'Refresh token is required' }
      })
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    const accessToken = generateAccessToken(decoded.id)

    res.json({ accessToken })
  } catch (err) {
    return res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Refresh token is invalid or expired' }
    })
  }
}