// src/lib/prisma.js
import pkg from "@prisma/client"
const { PrismaClient } = pkg

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
