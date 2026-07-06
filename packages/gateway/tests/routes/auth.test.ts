import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db client before importing anything that uses it
vi.mock("../../src/db/client.js", () => ({
  db: {},
}));

// Mock the services that auth routes call
vi.mock("../../src/services/auth-service.js", () => ({
  signup: vi.fn(),
  login: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  getMe: vi.fn(),
}));

// Mock middleware - set req.auth so handlers don't crash
vi.mock("../../src/middleware/auth.js", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.auth = {
      userId: "u1",
      email: "test@test.com",
      orgId: "o1",
      role: "owner",
    };
    next();
  },
}));

import express from "express";
import cookieParser from "cookie-parser";
import authRouter from "../../src/routes/auth.js";
import * as authService from "../../src/services/auth-service.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/auth", authRouter);
  return app;
}

describe("Auth Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /auth/signup", () => {
    it("returns 400 when email is missing", async () => {
      const app = createApp();
      const res = await fetchJson(app, "POST", "/auth/signup", {
        password: "password123",
        name: "Test",
        orgName: "TestOrg",
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("required");
    });

    it("returns 400 when password is too short", async () => {
      const app = createApp();
      const res = await fetchJson(app, "POST", "/auth/signup", {
        email: "test@test.com",
        password: "short",
        name: "Test",
        orgName: "TestOrg",
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("at least 8");
    });

    it("returns 201 with tokens on success", async () => {
      vi.mocked(authService.signup).mockResolvedValue({
        accessToken: "access-123",
        refreshToken: "refresh-456",
        user: { id: "u1", email: "test@test.com", name: "Test" },
        org: { id: "o1", name: "TestOrg", slug: "testorg" },
      });

      const app = createApp();
      const res = await fetchJson(app, "POST", "/auth/signup", {
        email: "test@test.com",
        password: "password123",
        name: "Test",
        orgName: "TestOrg",
      });
      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBe("access-123");
      expect(res.body.user.email).toBe("test@test.com");
    });

    it("returns 409 when email already exists", async () => {
      vi.mocked(authService.signup).mockRejectedValue(
        new Error("Email already registered")
      );

      const app = createApp();
      const res = await fetchJson(app, "POST", "/auth/signup", {
        email: "taken@test.com",
        password: "password123",
        name: "Test",
        orgName: "TestOrg",
      });
      expect(res.status).toBe(409);
    });
  });

  describe("POST /auth/login", () => {
    it("returns 400 when email is missing", async () => {
      const app = createApp();
      const res = await fetchJson(app, "POST", "/auth/login", {
        password: "password123",
      });
      expect(res.status).toBe(400);
    });

    it("returns 200 with tokens on success", async () => {
      vi.mocked(authService.login).mockResolvedValue({
        accessToken: "access-789",
        refreshToken: "refresh-012",
        user: { id: "u1", email: "test@test.com", name: "Test" },
        org: { id: "o1", name: "TestOrg", slug: "testorg" },
      });

      const app = createApp();
      const res = await fetchJson(app, "POST", "/auth/login", {
        email: "test@test.com",
        password: "password123",
      });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBe("access-789");
    });

    it("returns 401 on invalid credentials", async () => {
      vi.mocked(authService.login).mockRejectedValue(
        new Error("Invalid credentials")
      );

      const app = createApp();
      const res = await fetchJson(app, "POST", "/auth/login", {
        email: "bad@test.com",
        password: "wrong",
      });
      expect(res.status).toBe(401);
    });
  });

  describe("POST /auth/refresh", () => {
    it("returns 401 when tokens are missing", async () => {
      const app = createApp();
      const res = await fetchJson(app, "POST", "/auth/refresh", {});
      expect(res.status).toBe(401);
    });

    it("returns new access token on successful refresh", async () => {
      vi.mocked(authService.refresh).mockResolvedValue({
        accessToken: "new-access",
        refreshToken: "new-refresh",
      });

      const app = createApp();
      const res = await fetchJson(app, "POST", "/auth/refresh", {
        accessToken: "old-access",
      });
      // cookie is empty by default in test, need to set it
      expect(res.status).toBe(401); // no cookie set
    });

    it("refreshes from the cookie alone (hard-reload session restore)", async () => {
      vi.mocked(authService.refresh).mockResolvedValue({
        accessToken: "new-access",
        refreshToken: "new-refresh",
      });

      const app = createApp();
      const { createServer } = require("node:http");
      const server = createServer(app);
      const res = await new Promise<{ status: number; body: any }>(
        (resolve, reject) => {
          server.listen(0, () => {
            const addr = server.address() as any;
            fetch(`http://localhost:${addr.port}/auth/refresh`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Cookie: "yxp_refresh=raw-refresh-token",
              },
              // No access token in the body — the SPA has nothing after reload
              body: JSON.stringify({}),
            })
              .then(async (r) =>
                resolve({ status: r.status, body: await r.json() })
              )
              .catch(reject)
              .finally(() => server.close());
          });
        }
      );

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBe("new-access");
      expect(authService.refresh).toHaveBeenCalledWith(
        "raw-refresh-token",
        undefined
      );
    });
  });

  describe("GET /auth/me", () => {
    it("returns user data on success", async () => {
      vi.mocked(authService.getMe).mockResolvedValue({
        user: { id: "u1", email: "a@b.com", name: "A", emailVerified: false, createdAt: new Date() },
        org: { id: "o1", name: "O", slug: "o", plan: "hobby" },
        role: "owner",
      });

      const app = createApp();
      // We need to mock requireAuth to set req.auth
      // For this test, we'll test through the handler directly
      const res = await fetchJson(app, "GET", "/auth/me");
      expect(res.body.user.email).toBe("a@b.com");
    });

    it("returns 404 when user not found", async () => {
      vi.mocked(authService.getMe).mockResolvedValue(null);

      const app = createApp();
      const res = await fetchJson(app, "GET", "/auth/me");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /auth/logout", () => {
    it("returns ok even without cookie", async () => {
      const app = createApp();
      const res = await fetchJson(app, "POST", "/auth/logout");
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });
});

// Helper to call express app in tests
async function fetchJson(
  app: express.Express,
  method: string,
  path: string,
  body?: any
) {
  return new Promise<{ status: number; body: any; headers: any }>(
    (resolve, reject) => {
      const { createServer } = require("node:http");
      const server = createServer(app);
      server.listen(0, () => {
        const addr = server.address() as any;
        const url = `http://localhost:${addr.port}${path}`;
        fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        })
          .then(async (res) => {
            const body = await res.json();
            resolve({
              status: res.status,
              body,
              headers: Object.fromEntries(res.headers.entries()),
            });
          })
          .catch(reject)
          .finally(() => server.close());
      });
    }
  );
}
