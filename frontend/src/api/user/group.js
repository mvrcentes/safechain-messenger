import axios from "@/lib/axios"

const API_URL = import.meta.env.VITE_API_URL + "/group"

export const createGroup = async ({ name, memberIds }) => {
  const res = await axios.post(`${API_URL}/groups`, {
    name,
    memberIds,
  })
  return res.data
}

export const getUserGroups = async () => {
  const res = await axios.get(`${API_URL}/groups`)
  return res.data
}

export const sendGroupMessage = async (groupId, content) => {
  const res = await axios.post(`${API_URL}/messages/group/${groupId}`, {
    content,
  })
  return res.data
}
