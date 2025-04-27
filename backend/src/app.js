import cookieParser from "cookie-parser"
import cors from "cors"
import express from "express"

import authRoutes from "./routes/auth.routes.js"
import mfaRoutes from "./routes/mfa.routes.js"
import userRoutes from "./routes/user.routes.js"
import messageRouter from "./routes/message.routes.js"
import groupRoutes from "./routes/group.routes.js"
import keysRoutes from "./routes/keys.routes.js"

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
app.use("/api/auth/mfa", mfaRoutes)
app.use("/api/user", userRoutes)
app.use("/api/message", messageRouter)
app.use("/api/group", groupRoutes)
app.use("/api/keys", keysRoutes)

export default app
