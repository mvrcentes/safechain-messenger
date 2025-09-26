const attempts = new Map()

// Configurables
const MAX_FAILED = 5               // después de 5 fallos bloquea
const LOCK_TIME_MS = 15 * 60 * 1000 // 15 minutos

export function isAccountLocked(email) {
    const entry = attempts.get(email)
    if (!entry) return false
    if (entry.lockedUntil && Date.now() < entry.lockedUntil) return true

    // Si el lock expiró, limpiar
    if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
        attempts.delete(email)
        return false
    }
    return false
}

// Llamar cuando haya un fallo (usuario no encontrado o password incorrecta)
export function recordFailedLoginAttempt(email) {
    if (!email) return
    const now = Date.now()
    const entry = attempts.get(email) || { count: 0, firstAttemptAt: now }

    entry.count = (entry.count || 0) + 1
    console.log(`[loginAttempts] failed for ${email} -> count=${entry.count}`)
    // Si supera MAX_FAILED, fija lockedUntil
    if (entry.count >= MAX_FAILED) {
        entry.lockedUntil = Date.now() + LOCK_TIME_MS
        console.log(`[loginAttempts] LOCKED ${email} until ${new Date(entry.lockedUntil).toISOString()}`)
    }

    attempts.set(email, entry)
    return entry
}

// Llamar cuando el login sea exitoso
export function resetFailedLoginAttempts(email) {
    if (!email) return
    console.log(`[loginAttempts] reset counter for ${email}`)
    attempts.delete(email)
}

// Middleware para colocar en la ruta antes del controlador
export function accountLockMiddleware(req, res, next) {
    const { email } = req.body || {}
    if (!email) return next()

    if (isAccountLocked(email)) {
        console.log(`[loginAttempts] blocked request for locked account ${email}`)
        return res.status(429).json({ error: "Account temporarily locked due to multiple failed login attempts. Try later." })
    }
    return next()
}