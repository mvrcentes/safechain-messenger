import axios from "@/lib/axios"

const API_URL = import.meta.env.VITE_API_URL + "/user"

export const getAllUsers = async () => {
    const res = await axios.get(`${API_URL}/all`)
    return res.data
}

export const getPublicEncryptKeyByUserId = async (userId) => {
  const res = await axios.get(`${API_URL}/${userId}/public-key`)
  return res.data.publicKey
}
