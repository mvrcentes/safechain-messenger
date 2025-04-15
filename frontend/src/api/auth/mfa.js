import axios from "@/lib/axios"

const API_URL = import.meta.env.VITE_API_URL + "/auth/mfa"

export const setupMFA = async () => {
  const res = await axios.post(`${API_URL}/setup`)
  return {
    qrCode: res.data.qrCode,
    secret: res.data.secret,
  }
}

export const verifyMFA = async ({ token, secret }) => {
  const res = await axios.post(`${API_URL}/verify`, {
    token,
    secret,
  })
  return res.data
}

export const getMFAStatus = async () => {
  const res = await axios.get(`${API_URL}/status`)
  return res.data.mfaEnabled
}
export const disableMFA = async () => {
  const res = await axios.delete(`${API_URL}/disable`)
  return res.data
}

