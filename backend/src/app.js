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

const allowedOrigins = [
  `http://localhost:${process.env.FRONTEND_LOCAL_PORT || 5173}`,
  process.env.FRONTEND_URL,            // ej: https://app.tu-dominio.com
].filter(Boolean)

const corsOptions = {
  origin(origin, cb) {
    // Permite tools sin "Origin" (curl/Postman) y orígenes en whitelist
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    return cb(new Error(`CORS blocked for origin: ${origin}`))
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Set-Cookie"],
  maxAge: 600,
}

app.use(cors(corsOptions))

// Remover header por defecto
app.disable("x-powered-by")
app.set("port", process.env.PORT || 5000)

// Helmet con configuraciones específicas
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      // Si usas Vite HMR en dev: añade ws:
      connectSrc: ["'self'", "ws:", "wss:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // si inyectas CSS in-line
      imgSrc: ["'self'", "data:", "blob:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"], // anti-clickjacking (equivale a X-Frame-Options: DENY)
      upgradeInsecureRequests: [],
    },
  },
  frameguard: { action: "deny" },  // X-Frame-Options
  noSniff: true,                    // X-Content-Type-Options: nosniff
  referrerPolicy: { policy: "no-referrer" },
  permissionsPolicy: {              // antes Feature-Policy
    features: {
      geolocation: ["'none'"],
      microphone: ["'none'"],
      camera: ["'none'"],
      autoplay: ["'self'"],
    }
  },
  hsts: process.env.NODE_ENV === "production"
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false, // HSTS solo por HTTPS real
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginEmbedderPolicy: { policy: "require-corp" },
  crossOriginResourcePolicy: { policy: "same-site" },
}))

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

