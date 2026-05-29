import { Router, type IRouter } from "express";
import { eq, asc, and } from "drizzle-orm";
import { db, filmingRequestsTable } from "@workspace/db";
import {
  CreateRequestBody,
  GetMyRequestResponse,
  GetQueueResponseItem,
  GetQueueResponse,
  GetQueueStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function getClientIp(req: import("express").Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return ip.trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}

function formatRequest(r: typeof filmingRequestsTable.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    latitude: r.latitude,
    longitude: r.longitude,
    locationName: r.locationName,
    status: r.status,
    queuePosition: r.queuePosition ?? null,
    scheduledAt: r.scheduledAt ? r.scheduledAt.toISOString() : null,
    videoUrl: r.videoUrl ?? null,
    ipAddress: r.ipAddress,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

router.post("/requests", async (req, res): Promise<void> => {
  const parsed = CreateRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const ip = getClientIp(req);

  const existing = await db
    .select()
    .from(filmingRequestsTable)
    .where(
      and(
        eq(filmingRequestsTable.ipAddress, ip),
      )
    );

  const activeStatuses = ["pending", "approved", "filming"];
  const hasActive = existing.some((r) => activeStatuses.includes(r.status));
  if (hasActive) {
    res.status(409).json({ error: "You already have an active filming request." });
    return;
  }

  const [created] = await db
    .insert(filmingRequestsTable)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      locationName: parsed.data.locationName,
      ipAddress: ip,
      status: "pending",
    })
    .returning();

  res.status(201).json(formatRequest(created));
});

router.get("/requests/mine", async (req, res): Promise<void> => {
  const ip = getClientIp(req);

  const rows = await db
    .select()
    .from(filmingRequestsTable)
    .where(eq(filmingRequestsTable.ipAddress, ip))
    .orderBy(asc(filmingRequestsTable.createdAt));

  const activeStatuses = ["pending", "approved", "filming"];
  let found = rows.find((r) => activeStatuses.includes(r.status));
  if (!found) {
    found = rows.at(-1);
  }

  if (!found) {
    res.status(404).json({ error: "No request found for your IP address." });
    return;
  }

  res.json(GetMyRequestResponse.parse(formatRequest(found)));
});

router.get("/queue", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(filmingRequestsTable)
    .where(
      eq(filmingRequestsTable.status, "approved")
    )
    .orderBy(asc(filmingRequestsTable.queuePosition), asc(filmingRequestsTable.createdAt));

  const filmingRows = await db
    .select()
    .from(filmingRequestsTable)
    .where(eq(filmingRequestsTable.status, "filming"))
    .orderBy(asc(filmingRequestsTable.queuePosition), asc(filmingRequestsTable.createdAt));

  const completedRows = await db
    .select()
    .from(filmingRequestsTable)
    .where(eq(filmingRequestsTable.status, "completed"))
    .orderBy(asc(filmingRequestsTable.queuePosition), asc(filmingRequestsTable.createdAt));

  const allRows = [...filmingRows, ...rows, ...completedRows];

  const result = allRows.map((r) => ({
    id: r.id,
    name: r.name,
    locationName: r.locationName,
    latitude: r.latitude,
    longitude: r.longitude,
    status: r.status as "approved" | "filming" | "completed",
    queuePosition: r.queuePosition ?? null,
    scheduledAt: r.scheduledAt ? r.scheduledAt.toISOString() : null,
    videoUrl: r.videoUrl ?? null,
    createdAt: r.createdAt.toISOString(),
  }));

  res.json(GetQueueResponse.parse(result));
});

router.get("/queue/stats", async (_req, res): Promise<void> => {
  const rows = await db.select().from(filmingRequestsTable);

  const stats = {
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    filming: rows.filter((r) => r.status === "filming").length,
    completed: rows.filter((r) => r.status === "completed").length,
    total: rows.length,
  };

  res.json(GetQueueStatsResponse.parse(stats));
});

export default router;
