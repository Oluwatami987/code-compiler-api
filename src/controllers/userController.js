const User = require('../models/User')
const Job = require('../models/Job')

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash')
    if (!user) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      })
    }

    res.json({
      id: user._id,
      email: user.email,
      plan: user.plan,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    })
  } catch (err) {
    next(err)
  }
}

exports.getMyStats = async (req, res, next) => {
  try {
    const userId = req.user.id

    const [total, byStatus, byLanguage, avgTime] = await Promise.all([
      // total jobs
      Job.countDocuments({ userId }),

      // breakdown by status
      Job.aggregate([
        { $match: { userId: new (require('mongoose').Types.ObjectId)(userId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // breakdown by language
      Job.aggregate([
        { $match: { userId: new (require('mongoose').Types.ObjectId)(userId) } },
        { $group: { _id: '$language', count: { $sum: 1 } } }
      ]),

      // average execution time on completed jobs
      Job.aggregate([
        {
          $match: {
            userId: new (require('mongoose').Types.ObjectId)(userId),
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            avgExecutionTimeMs: { $avg: '$output.executionTimeMs' }
          }
        }
      ])
    ])

    res.json({
      totalJobs: total,
      byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      byLanguage: byLanguage.reduce((acc, l) => ({ ...acc, [l._id]: l.count }), {}),
      avgExecutionTimeMs: avgTime[0]?.avgExecutionTimeMs
        ? Math.round(avgTime[0].avgExecutionTimeMs)
        : null
    })
  } catch (err) {
    next(err)
  }
}