import { Router, type IRouter } from "express";

const router: IRouter = Router();

let maintenanceMode = false;

router.get("/admin/maintenance", (_req, res): void => {
  res.json({ maintenance: maintenanceMode });
});

router.post("/admin/maintenance", (req, res): void => {
  const { enabled } = req.body as { enabled?: boolean };
  if (typeof enabled !== "boolean") {
    res.status(400).json({ error: "enabled phải là boolean" });
    return;
  }
  maintenanceMode = enabled;
  res.json({ maintenance: maintenanceMode });
});

export default router;
