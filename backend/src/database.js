// src/lib/prisma.js
import pkg from "@prisma/client"
const { PrismaClient } = pkg

let prisma
try {
  prisma = new PrismaClient()
  prisma
    .$connect()
    .then(() => {
      console.log("✅ Connected to the database (Prisma)")
    })
    .catch((err) => {
      console.error("❌ Error connecting to the database (Prisma)", err)
    })
} catch (err) {
  // If Prisma client initialization fails (e.g., during tests without
  // generated client), provide a lightweight fallback that keeps the app
  // from crashing. Tests should mock `../src/database.js` when they need
  // to control DB behavior; this fallback prevents import-time crashes.
  console.error("⚠️ Prisma client initialization failed, using fallback stub:", err)
  prisma = {
    $connect: () => Promise.resolve(),
    // Minimal stubs for commonly used models to avoid TypeErrors when
    // modules import the client but don't mock it in tests.
    group: { create: async () => { throw new Error('Prisma client unavailable') }, findMany: async () => [] },
    groupKeyDelivery: { createMany: async () => {}, findUnique: async () => null },
    message: { create: async () => { throw new Error('Prisma client unavailable') } },
  }
}

export default prisma
