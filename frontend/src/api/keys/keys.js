import axios from "@/lib/axios"
import { generatePreKeys } from "@/lib/crypto"

const API_URL = import.meta.env.VITE_API_URL + "/keys"

export const getPublicKey = async () => {
  const res = await axios.get(`${API_URL}`)
  return res.data
}

export const createPublicKey = async (publicKey) => {
  const res = await axios.post(`${API_URL}`, { publicKey })
  return res.data
}

export const updatePublicKey = async (publicKey) => {
  const res = await axios.put(`${API_URL}`, { publicKey })
  return res.data
}

export const updateSigningKey = async (signingPublicKey) => {
  const res = await axios.put(`${API_URL}/signing`, { signingPublicKey })
  return res.data
}

export async function generateAndSendPreKeys() {
  const { publicKeys, privateKeys } = await generatePreKeys()

  const blob = new Blob([JSON.stringify(privateKeys, null, 2)], {
    type: "application/json",
  })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = "private_keys.json"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  const response = await axios.post("/keys/prekeys", publicKeys)
  return response.data
}

export async function checkAndCreatePreKeys() {
  try {
    const res = await axios.get("/keys/pre-keys")

    if (res.data?.preKeys?.length > 0) {
      console.log("🟢 Ya hay pre-keys registradas")
      return
    }

    console.log("🟡 No hay pre-keys, generando...")
    await generateAndSendPreKeys()
  } catch (err) {
    console.error("❌ Error al verificar pre-keys:", err)
  }
}
