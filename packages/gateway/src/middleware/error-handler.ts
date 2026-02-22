import type { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("[gateway]", err.message);

  if (err.message === "Email already registered") {
    res.status(409).json({ error: err.message });
    return;
  }

  if (err.message === "Invalid credentials") {
    res.status(401).json({ error: err.message });
    return;
  }

  if (err.message === "No organization found") {
    res.status(404).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: "Internal server error" });
}
