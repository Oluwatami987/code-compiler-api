require('dotenv').config()
const app = require('./app')
const connectDB = require('./config/db')
const { redis } = require('./config/redis') // initialize Redis connection (no need to export since it's a singleton)

const PORT = process.env.PORT || 3000

async function start() {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

start()