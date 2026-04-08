import './src/config/env.js';
import './src/utils/deleteExpierOTP/cron.js';
import path from 'node:path'
import http from 'node:http'
import bootstrap from './src/app.controller.js'
import express from 'express'
import { initializeSocket } from './src/socket/index.js'
import { logger } from './src/utils/logger.js';
const app = express()
const port = process.env.PORT || 5000




bootstrap(app, express)
const server = http.createServer(app)
initializeSocket(server)

server.listen(port, () => logger.info(`Server listening on port ${port}`))
