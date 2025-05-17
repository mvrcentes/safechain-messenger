import { Router } from "express"
import {
  createKeys,
  getKeys,
  updateKeys,
  updateSigningKey,
  getSigningPublicKey,
  createPreKeys,
  getPreKeys,
} from "../controllers/keys/keys.controller.js"

const router = Router()

// Obtener la llave pública del usuario logueado
router.get("/", getKeys)

// Crear una nueva llave pública
router.post("/", createKeys)

// Publicar claves públicas (IK, SPK, OPKs)
router.post("/prekeys", createPreKeys)
router.get("/pre-keys", getPreKeys)

// Actualizar la llave pública existente
router.put("/", updateKeys)

// Actualizar la signing key
router.put("/signing", updateSigningKey)

// Obtener la clave pública de firma de un usuario específico
router.get("/:id/signing-key", getSigningPublicKey)

export default router
