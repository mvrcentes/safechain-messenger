import { test, expect, vi, beforeEach } from "vitest"

// Asegura entorno de test
process.env.NODE_ENV = "test"

// ==== MOCKS ====
// Mockea exactamente el módulo que importa el controlador
vi.mock("../src/database.js", () => ({
	default: {
		user: {
			create: vi.fn(),
		},
	},
}))

// argon2 se importa como default en el controlador y se usa `.hash(...)`
vi.mock("argon2", () => ({
	default: {
		hash: vi.fn().mockResolvedValue("hashedPassword123"),
	},
}))

// Evita logs ruidosos (controller importa `chalk` como default)
vi.mock("chalk", () => ({
	default: {
		blue: (t) => t,
		green: (t) => t,
		red: (t) => t,
		yellow: (t) => t,
		magenta: (t) => t,
		gray: (t) => t,
	},
}))

// ==== IMPORTS DESPUÉS DE LOS MOCKS ====
import prisma from "../src/database.js"
import argon2 from "argon2"
import { register } from "../src/controllers/auth/auth.controller.js"

// Helper de respuesta Express mínima
function createRes() {
	return {
		statusCode: 200,
		body: undefined,
		headers: {},
		status(code) {
			this.statusCode = code
			return this
		},
		json(payload) {
			this.body = payload
			return this
		},
		setHeader(k, v) {
			this.headers[k] = v
		},
	}
}

beforeEach(() => {
	vi.clearAllMocks()
})

test("register exitoso → 201 y usuario creado", async () => {
	prisma.user.create.mockResolvedValue({
		id: 1,
		name: "Marco",
		email: "marco@example.com",
		createdAt: new Date(),
	})

	const req = {
		body: { name: "Marco", email: "marco@example.com", password: "password123" },
	}
	const res = createRes()

	await register(req, res)

	expect(res.statusCode).toBe(201)
	expect(res.body.user.email).toBe("marco@example.com")
	// depending on how the mock is imported, the hash function may be on the default export
	// or directly on the imported object. Assert both possibilities.
	if (argon2?.default?.hash) {
		expect(argon2.default.hash).toHaveBeenCalledWith("password123")
	} else {
		expect(argon2.hash).toHaveBeenCalledWith("password123")
	}
})

test("register con error en DB → 500 y mensaje de error", async () => {
	prisma.user.create.mockRejectedValue(new Error("DB Error"))

	const req = {
		body: { name: "Marco", email: "marco@example.com", password: "password123" },
	}
	const res = createRes()

	await register(req, res)

	expect(res.statusCode).toBe(500)
	expect(res.body?.error).toBe("Error registering user")
})