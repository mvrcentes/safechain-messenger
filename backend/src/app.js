import cors from "cors"
import express from "express"

const app = express()

const corsOptions = {
  origin: true,
  credentials: true,
}

app.set("port", process.env.PORT || 5000)

app.use(cors(corsOptions))
app.use(express.json())

export default app
