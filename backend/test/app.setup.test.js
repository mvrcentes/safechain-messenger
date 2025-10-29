import { test, expect, vi, beforeEach } from "vitest"
import request from "supertest"

// Los mocks deben registrarse ANTES de importar app.js porque éste importa
// las rutas en tiempo de carga. Usamos funciones middleware sencillas para
// evitar depender de la implementación real de las rutas.
function mockAllRoutes() {
  // Registrar mocks explícitos (evita bucles/alcance que algunos runners
  // transforman de forma inesperada). Cada mock exporta un router
  // middleware trivial que delega a next().
  vi.mock("../src/routes/auth.routes.js", () => ({ default: (req, res, next) => next() }))
  vi.mock("../src/routes/group.routes.js", () => ({ default: (req, res, next) => next() }))
  vi.mock("../src/routes/keys.routes.js", () => ({ default: (req, res, next) => next() }))
  vi.mock("../src/routes/message.routes.js", () => ({ default: (req, res, next) => next() }))
  vi.mock("../src/routes/mfa.routes.js", () => ({ default: (req, res, next) => next() }))
  vi.mock("../src/routes/user.routes.js", () => ({ default: (req, res, next) => next() }))
  vi.mock("../src/health/health.routes.js", () => ({ default: (req, res, next) => next() }))
}

beforeEach(() => {
  // Reinicia el cache de módulos para poder cambiar process.env entre tests
  vi.resetModules()
  // Limpia mocks registrados por otras pruebas
  vi.clearAllMocks()
})

test("app usa el puerto de process.env cuando está definido", async () => {
  process.env.PORT = "12345"
  // Registrar mocks antes de importar
  mockAllRoutes()

  const { default: app } = await import("../src/app.js")
  // Express storea lo seteado con app.set('port', ...)
  expect(app.get("port")).toBe("12345")
})

test("middleware de cache-control añade headers y CORS permite origen en whitelist", async () => {
  // Definimos el puerto frontend permitido para que la whitelist lo incluya
  process.env.FRONTEND_LOCAL_PORT = "3000"
  mockAllRoutes()

  const { default: app } = await import("../src/app.js")

  const origin = "http://localhost:3000"
  const res = await request(app).get("/no-existe").set("Origin", origin)

  // Cache-control definido en el middleware global
  expect(res.headers["cache-control"]).toBe("no-store")
  expect(res.headers["pragma"]).toBe("no-cache")
  expect(res.headers["expires"]).toBe("0")

  // CORS debe reflejar el origen permitido
  expect(res.headers["access-control-allow-origin"]).toBe(origin)
})

test("app carga sin errores cuando no hay FRONTEND_URL y permite herramientas sin Origin", async () => {
  // El comportamiento debe permitir requests sin Origin (curl/postman)
  delete process.env.FRONTEND_URL
  delete process.env.FRONTEND_LOCAL_PORT
  mockAllRoutes()

  const { default: app } = await import("../src/app.js")
  const res = await request(app).get("/otra-ruta")

  // Sin Origin, CORS permite y no lanza error; comprobamos status (404 por ruta)
  // y que nuestros headers globales estén presentes.
  expect(res.status).toBeGreaterThanOrEqual(400)
  expect(res.headers["cache-control"]).toBe("no-store")
})
