import { Router, type Request, type Response } from "express";
import { signup, login, refresh, logout, getMe } from "../services/auth-service.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const REFRESH_COOKIE = "yxp_refresh";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/auth",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

router.post("/signup", async (req: Request, res: Response) => {
  try {
    const { email, password, name, orgName } = req.body;

    if (!email || !password || !name || !orgName) {
      res.status(400).json({ error: "email, password, name, and orgName are required" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const result = await signup({ email, password, name, orgName });

    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    res.status(201).json({
      accessToken: result.accessToken,
      user: result.user,
      org: result.org,
    });
  } catch (err) {
    if ((err as Error).message === "Email already registered") {
      res.status(409).json({ error: (err as Error).message });
      return;
    }
    throw err;
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const result = await login({ email, password });

    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    res.json({
      accessToken: result.accessToken,
      user: result.user,
      org: result.org,
    });
  } catch (err) {
    if ((err as Error).message === "Invalid credentials") {
      res.status(401).json({ error: (err as Error).message });
      return;
    }
    throw err;
  }
});

router.post("/refresh", async (req: Request, res: Response) => {
  const oldRefresh = req.cookies?.[REFRESH_COOKIE];
  const oldAccess = req.headers.authorization?.slice(7) ?? req.body.accessToken;

  if (!oldRefresh || !oldAccess) {
    res.status(401).json({ error: "Missing refresh or access token" });
    return;
  }

  const result = await refresh(oldRefresh, oldAccess);
  if (!result) {
    res.clearCookie(REFRESH_COOKIE, { path: "/auth" });
    res.status(401).json({ error: "Invalid or expired refresh token" });
    return;
  }

  res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
  res.json({ accessToken: result.accessToken });
});

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const data = await getMe(req.auth!.userId);
  if (!data) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(data);
});

router.post("/logout", async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    await logout(token);
  }
  res.clearCookie(REFRESH_COOKIE, { path: "/auth" });
  res.json({ ok: true });
});

export default router;
