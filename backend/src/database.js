// src/lib/prisma.js
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

prisma
  .$connect()
  .then(() => {
    console.log("✅ Connected to the database (Prisma)")
  })
  .catch((err) => {
    console.error("❌ Error connecting to the database (Prisma)", err)
  })

export default prisma
