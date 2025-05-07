import { Router } from "express"

import { getAllUsers, getPublicEncryptKey } from "../controllers/user/user.controller.js"

const router = Router()

router.get("/all", getAllUsers)

router.get("/:id/public-key", getPublicEncryptKey)

export default router
