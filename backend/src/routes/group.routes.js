import express from "express"
import {
  createGroup,
  getUserGroups,
  sendGroupMessage,
} from "../controllers/user/group.controller.js"

const router = express.Router()

router.post("/groups", createGroup)
router.get("/groups", getUserGroups)
router.post("/messages/group/:groupId", sendGroupMessage)

export default router
