import cookieParser from "cookie-parser"
import cors from "cors"
import express from "express"
import helmet from "helmet"

import authRoutes from "./routes/auth.routes.js"
import groupRoutes from "./routes/group.routes.js"
import keysRoutes from "./routes/keys.routes.js"
import messageRouter from "./routes/message.routes.js"
import mfaRoutes from "./routes/mfa.routes.js"
import userRoutes from "./routes/user.routes.js"

const app = express()

const corsOptions = {
  origin: `http://localhost:${process.env.FRONTEND_LOCAL_PORT || 5173}`,
  credentials: true,
}
app.use(cors(corsOptions))

// Remover header por defecto
app.disable("x-powered-by")
app.set("port", process.env.PORT || 5000)

// Helmet con configuraciones específicas
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    frameguard: { action: "deny" }, // Anti-clickjacking
    xssFilter: true,                // Protege contra XSS reflejado
    noSniff: true,                  // X-Content-Type-Options: nosniff
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }, // HSTS
  })
)

// Middleware para cache-control en info sensible
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store")
  res.setHeader("Pragma", "no-cache")
  res.setHeader("Expires", "0")
  res.removeHeader("Server") // elimina header "Server"
  next()
})
// ------------------------------------------ //

app.set("port", process.env.PORT || 5000)

app.use(cookieParser())
app.use(express.json())
app.use("/api/auth", authRoutes)
app.use("/api/auth/mfa", mfaRoutes)
app.use("/api/user", userRoutes)
app.use("/api/message", messageRouter)
app.use("/api/group", groupRoutes)
app.use("/api/keys", keysRoutes)

export default app
