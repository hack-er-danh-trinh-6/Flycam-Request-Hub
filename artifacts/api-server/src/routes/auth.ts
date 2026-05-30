import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/admin/login", async (req, res): Promise<void> => {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    res.status(503).json({ error: "Admin access is not configured." });
    return;
  }

  const { password: submitted } = req.body as { password?: string };
  if (!submitted || submitted !== password) {
    res.status(401).json({ error: "Mật khẩu không đúng." });
    return;
  }

  res.json({ token: password });
});

export default router;
