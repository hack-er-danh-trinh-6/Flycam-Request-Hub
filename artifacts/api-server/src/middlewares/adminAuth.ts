import { type Request, type Response, type NextFunction } from "express";

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    res.status(503).json({ error: "Admin access is not configured." });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  const token = authHeader.slice(7);
  if (token !== password) {
    res.status(401).json({ error: "Invalid credentials." });
    return;
  }

  next();
}
