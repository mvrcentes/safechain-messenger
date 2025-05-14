import { Router } from "express"
import {
  createKeys,
  getKeys,
  updateKeys,
  updateSigningKey,
} from "../controllers/keys/keys.controller.js"

const router = Router()

// Obtener la llave pública del usuario logueado
router.get("/", getKeys)

// Crear una nueva llave pública
router.post("/", createKeys)

// Actualizar la llave pública existente
router.put("/", updateKeys)

// Actualizar la signing key
router.put("/signing", updateSigningKey)

export default router
