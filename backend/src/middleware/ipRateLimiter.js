import rateLimit, { ipKeyGenerator } from "express-rate-limit"

// 5 requests por IP cada 15 minutos
export const loginIpRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 5, // intentos
    standardHeaders: true, // RateLimit-* headers
    legacyHeaders: false,
    // Use the library's ipKeyGenerator helper so IPv6 addresses are handled correctly
    keyGenerator: (req) => ipKeyGenerator(req),
    handler: (req, res /*, next*/) => {
        // Si confías en proxy (app.set('trust proxy', 1)), resetTime viene poblado
        const resetDate = req.rateLimit?.resetTime instanceof Date
            ? req.rateLimit.resetTime
            : null

        if (resetDate) {
            const seconds = Math.max(0, Math.ceil((resetDate.getTime() - Date.now()) / 1000))
            res.setHeader('Retry-After', seconds)
        }

        console.warn(`[ipRateLimiter] 429 for IP ${req.ip} on ${req.originalUrl}`)
        return res
            .status(429)
            .json({ error: "Too many login attempts from this IP. Try again later." })
    },
})