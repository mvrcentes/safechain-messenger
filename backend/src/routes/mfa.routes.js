import { Router } from "express"

import { setupMFA, verifyAndEnableMFA, getMFAStatus, disableMFA } from "../controllers/auth/mfa.controller.js"

const router = Router()

router.post("/setup", setupMFA)
router.post("/verify", verifyAndEnableMFA)
router.get("/status", getMFAStatus)
router.delete("/disable", disableMFA)

export default router