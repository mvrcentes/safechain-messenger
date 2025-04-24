import { Router } from "express"

import { getMessagesWithUser } from "../controllers/message/message.controller.js"

const router = Router()

router.get("/:userId", getMessagesWithUser)

export default router