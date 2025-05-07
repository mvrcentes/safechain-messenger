import { Router } from "express"
import {
  createKeys,
  getKeys,
  updateKeys,
} from "../controllers/keys/keys.controller.js"

const router = Router()

// Obtener la llave pública del usuario logueado
router.get("/", getKeys)

// Crear una nueva llave pública
router.post("/", createKeys)

// Actualizar la llave pública existente
router.put("/", updateKeys)

export default router
