import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the db client for token-service
vi.mock("../../src/db/client.js", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({}),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue([]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({}),
      }),
    }),
  },
}));

import {
  signAccessToken,
  verifyAccessToken,
} from "../../src/services/token-service.js";

describe("Token Service", () => {
  describe("signAccessToken", () => {
    it("creates a JWT with correct payload structure", () => {
      const payload = {
        userId: "user-123",
        email: "test@test.com",
        orgId: "org-456",
        role: "admin",
      };

      const token = signAccessToken(payload);
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3);
    });
  });

  describe("verifyAccessToken", () => {
    it("verifies and returns the payload from a valid token", () => {
      const payload = {
        userId: "user-abc",
        email: "verify@test.com",
        orgId: "org-xyz",
        role: "member",
      };

      const token = signAccessToken(payload);
      const decoded = verifyAccessToken(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.orgId).toBe(payload.orgId);
      expect(decoded.role).toBe(payload.role);
    });

    it("throws on invalid tokens", () => {
      expect(() => verifyAccessToken("not-a-valid-token")).toThrow();
    });

    it("throws on tampered tokens", () => {
      const token = signAccessToken({
        userId: "u1",
        email: "a@b.com",
        orgId: "o1",
        role: "owner",
      });

      // Tamper with the payload
      const parts = token.split(".");
      parts[1] = Buffer.from(
        JSON.stringify({ userId: "hacked" })
      ).toString("base64url");
      const tampered = parts.join(".");

      expect(() => verifyAccessToken(tampered)).toThrow();
    });
  });

  describe("token expiry", () => {
    it("access tokens have a 15-minute expiry claim", () => {
      const token = signAccessToken({
        userId: "u1",
        email: "e@e.com",
        orgId: "o1",
        role: "owner",
      });

      const decoded = verifyAccessToken(token) as any;
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();

      // Should expire ~15 minutes from now
      const diffSeconds = decoded.exp - decoded.iat;
      expect(diffSeconds).toBe(900); // 15 * 60
    });
  });
});
