import { Router } from "express"

import { getAllUsers } from "../controllers/user/user.controller.js"

const router = Router()

router.get("/all", getAllUsers)

export default router
