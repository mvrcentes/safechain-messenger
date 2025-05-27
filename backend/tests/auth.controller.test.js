import { jest } from "@jest/globals";

// Mock de prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  session: {
    create: jest.fn(),
    deleteMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

jest.unstable_mockModule("../src/database.js", () => ({
  default: mockPrisma,
}));

jest.unstable_mockModule("argon2", () => ({
  default: {
    verify: jest.fn(),
    hash: jest.fn(() => {
      throw new Error("Hash error");
    }),
  },
  verify: jest.fn(),
  hash: jest.fn(() => {
    throw new Error("Hash error");
  }),
}));

jest.unstable_mockModule("uuid", () => ({
  v4: () => "mock-refresh-token",
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  sign: jest.fn(() => "mock-access-token"),
}));

// Importar después de definir todos los mocks
const argon2 = await import("argon2");
const verify = argon2.verify;
const jwt = await import("jsonwebtoken");
const sign = jwt.sign;
const authController = await import("../src/controllers/auth/auth.controller.js");


describe("register fallback", () => {
  it("returns 500 if hashing fails", async () => {
    const req = {
      body: { name: "Test", email: "test@example.com", password: "123" },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Error registering user" });
  });
});

describe("logout", () => {
  it("clears session and refresh token cookie", async () => {
    mockPrisma.session.deleteMany.mockResolvedValue({});

    const req = {
      cookies: { refreshToken: "mock-refresh-token" },
    };
    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await authController.logout(req, res);

    expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
      where: { token: "mock-refresh-token" },
    });
    expect(res.setHeader).toHaveBeenCalledWith(
      "Set-Cookie",
      expect.stringContaining("refreshToken=;")
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Logged out" });
  });

  it("handles missing refresh token gracefully", async () => {
    const req = { cookies: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };

    await authController.logout(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "No session to clear" });
  });
});

describe("login", () => {
  it("returns 404 if user is not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = {
      body: { email: "notfound@example.com", password: "secret" },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
  });
});
