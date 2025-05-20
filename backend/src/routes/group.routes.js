import express from "express"
import {
  createGroup,
  getUserGroups,
  sendGroupMessage,
  getEncryptedGroupKey,
} from "../controllers/user/group.controller.js"

const router = express.Router()

router.post("/groups", createGroup)
router.get("/groups", getUserGroups)
router.post("/messages/group/:groupId", sendGroupMessage)
router.get("/groups/:groupId/k_group", getEncryptedGroupKey)

export default router
