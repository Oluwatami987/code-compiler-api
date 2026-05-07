const express = require('express')
const app = express()

app.use(express.json())

// routes (we'll plug these in as we build them)
app.use('/auth', require('./routes/auth'))
app.use('/jobs', require('./routes/jobs'))
app.use('/users', require('./routes/users'))

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } })
})

// global error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Something went wrong'
    }
  })
})

module.exports = app