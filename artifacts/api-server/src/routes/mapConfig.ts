import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, mapConfigTable } from "@workspace/db";
import { GetMapConfigResponse, AdminSaveMapConfigBody, AdminSaveMapConfigResponse } from "@workspace/api-zod";
import { adminAuth } from "../middlewares/adminAuth";

const router: IRouter = Router();

function formatConfig(config: typeof mapConfigTable.$inferSelect) {
  return {
    id: config.id,
    allowedZone: config.allowedZone ? JSON.parse(config.allowedZone) : null,
    noFlyZones: JSON.parse(config.noFlyZones) as object[],
    updatedAt: config.updatedAt.toISOString(),
  };
}

async function getOrCreateConfig() {
  const rows = await db.select().from(mapConfigTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [created] = await db.insert(mapConfigTable).values({ noFlyZones: "[]" }).returning();
  return created;
}

router.get("/map-config", async (_req, res): Promise<void> => {
  const config = await getOrCreateConfig();
  res.json(GetMapConfigResponse.parse(formatConfig(config)));
});

router.put("/admin/map-config", adminAuth, async (req, res): Promise<void> => {
  const parsed = AdminSaveMapConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await getOrCreateConfig();

  const [updated] = await db
    .update(mapConfigTable)
    .set({
      allowedZone: parsed.data.allowedZone != null ? JSON.stringify(parsed.data.allowedZone) : null,
      noFlyZones: JSON.stringify(parsed.data.noFlyZones ?? []),
    })
    .where(eq(mapConfigTable.id, existing.id))
    .returning();

  res.json(AdminSaveMapConfigResponse.parse(formatConfig(updated)));
});

export default router;
