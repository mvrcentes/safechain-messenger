import axios from "@/lib/axios"

const API_URL = import.meta.env.VITE_API_URL + "/user"

export const getAllUsers = async () => {
    const res = await axios.get(`${API_URL}/all`)
    return res.data
}
