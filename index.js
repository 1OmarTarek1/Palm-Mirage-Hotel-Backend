import path from 'node:path'
import http from 'node:http'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve("./src/config/.env.dev") })
import bootstrap from './src/app.controller.js'
import express from 'express'
import { initializeSocket } from './src/socket/index.js'
import "./src/utils/deleteExpierOTP/cron.js"; 
const app = express()
const port = process.env.PORT || 5000



bootstrap(app, express)
const server = http.createServer(app)
initializeSocket(server)

server.listen(port, () => console.log(`Example app listening on port ${port}!`))
