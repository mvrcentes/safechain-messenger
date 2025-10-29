import prisma from "../database.js"

export async function healthCheck(req, res) {
    try {
        // Verifica la conexión a la base de datos
        await prisma.$queryRaw`SELECT 1`
        res.status(200).json({ status: "ok", database: "connected" })
    } catch (error) {
        console.error("Health check failed:", error)
        res.status(500).json({ status: "error", database: "disconnected" })
    }
}