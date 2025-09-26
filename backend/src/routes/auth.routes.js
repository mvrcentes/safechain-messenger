import { Router } from "express"
import {
  login,
  loginWithMFA,
  logout,
  refreshToken,
  register,
} from "../controllers/auth/auth.controller.js"
import { loginIpRateLimiter } from "../middleware/ipRateLimiter.js"
import { accountLockMiddleware } from "../middleware/loginAttempts.js"

const router = Router()

// TEMP: debug to verify routing
router.use((req, _res, next) => {
  console.log(`[auth.routes] hit: ${req.method} ${req.path}`)
  next()
})

router.post("/register", register)
router.post("/auth/login", loginIpRateLimiter, accountLockMiddleware, login)
router.post("/login", loginIpRateLimiter, accountLockMiddleware, login)
router.post("/login/mfa", loginWithMFA)

router.get("/refresh", refreshToken)
router.post("/logout", logout)

export default router
