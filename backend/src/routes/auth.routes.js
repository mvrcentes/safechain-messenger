import { Router } from "express"
import {
  login,
  loginWithMFA,
  logout,
  refreshToken,
  register,
} from "../controllers/auth/auth.controller.js"

const router = Router()

router.post("/register", register)
router.post("/login", login)
router.post("/login/mfa", loginWithMFA)

router.get("/refresh", refreshToken)
router.post("/logout", logout)

export default router
