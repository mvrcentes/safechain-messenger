import axios from "@/lib/axios"

const API_URL = import.meta.env.VITE_API_URL + "/message"

export const getMessagesWithUser = async (userId) => {
  const res = await axios.get(`${API_URL}/${userId}`)
  return res.data
}
