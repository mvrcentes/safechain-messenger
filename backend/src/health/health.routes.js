import { Router } from "express"
import { healthCheck } from "./health.controller.js"

const router = Router()

// Endpoint de health check
router.get("/", healthCheck)

export default router