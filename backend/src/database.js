// src/lib/prisma.js
import pkg from "@prisma/client"
const { PrismaClient } = pkg

// Use an IIFE to produce a `const` export while still attempting to
// initialize the Prisma client at module load time. This avoids
// exporting a mutable `let` binding which static analyzers (e.g.
// SonarQube) warn about.
const prisma = (() => {
  try {
    const client = new PrismaClient()
    client
      .$connect()
      .then(() => {
        console.log(" Connected to the database (Prisma)")
      })
      .catch((err) => {
        console.error(" Error connecting to the database (Prisma)", err)
      })
    return client
  } catch (err) {
    // If Prisma client initialization fails (e.g., during tests without
    // generated client), provide a lightweight fallback that keeps the app
    // from crashing. Tests should mock `../src/database.js` when they need
    // to control DB behavior; this fallback prevents import-time crashes.
    console.error(" Prisma client initialization failed, using fallback stub:", err)
    return {
      $connect: () => Promise.resolve(),
      // Minimal stubs for commonly used models to avoid TypeErrors when
      // modules import the client but don't mock it in tests.
      group: { create: async () => { throw new Error('Prisma client unavailable') }, findMany: async () => [] },
      groupKeyDelivery: { createMany: async () => {}, findUnique: async () => null },
      message: { create: async () => { throw new Error('Prisma client unavailable') } },
    }
  }
})()

export default prisma
