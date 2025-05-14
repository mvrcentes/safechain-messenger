import axios from "@/lib/axios"

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