import { Request, Response, NextFunction } from "express";

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = header.slice(7);

  if (token !== process.env.SCREENSHOT_SECRET) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  next();
}
