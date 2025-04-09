import cookieParser from "cookie-parser"
import cors from "cors"
import express from "express"

import authRoutes from "./routes/auth.routes.js"

const app = express()

const corsOptions = {
  origin: "http://localhost:5173",
  credentials: true,
}

app.set("port", process.env.PORT || 5000)

app.use(cors(corsOptions))
app.use(cookieParser())
app.use(express.json())
app.use("/api/auth", authRoutes)

export default app
