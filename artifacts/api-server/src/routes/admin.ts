import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, filmingRequestsTable } from "@workspace/db";
import {
  AdminListRequestsQueryParams,
  AdminApproveRequestParams,
  AdminRejectRequestParams,
  AdminScheduleRequestParams,
  AdminScheduleRequestBody,
  AdminCompleteRequestParams,
  AdminCompleteRequestBody,
  AdminListRequestsResponse,
  AdminApproveRequestResponse,
  AdminRejectRequestResponse,
  AdminScheduleRequestResponse,
  AdminCompleteRequestResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

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

async function assignQueuePositions() {
  const approvedRows = await db
    .select()
    .from(filmingRequestsTable)
    .where(eq(filmingRequestsTable.status, "approved"))
    .orderBy(asc(filmingRequestsTable.createdAt));

  for (let i = 0; i < approvedRows.length; i++) {
    await db
      .update(filmingRequestsTable)
      .set({ queuePosition: i + 1 })
      .where(eq(filmingRequestsTable.id, approvedRows[i].id));
  }
}

router.get("/admin/requests", async (req, res): Promise<void> => {
  const queryParsed = AdminListRequestsQueryParams.safeParse(req.query);
  if (!queryParsed.success) {
    res.status(400).json({ error: queryParsed.error.message });
    return;
  }

  let rows;
  if (queryParsed.data.status) {
    rows = await db
      .select()
      .from(filmingRequestsTable)
      .where(eq(filmingRequestsTable.status, queryParsed.data.status))
      .orderBy(asc(filmingRequestsTable.createdAt));
  } else {
    rows = await db
      .select()
      .from(filmingRequestsTable)
      .orderBy(asc(filmingRequestsTable.createdAt));
  }

  res.json(AdminListRequestsResponse.parse(rows.map(formatRequest)));
});

router.patch("/admin/requests/:id/approve", async (req, res): Promise<void> => {
  const params = AdminApproveRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [updated] = await db
    .update(filmingRequestsTable)
    .set({ status: "approved" })
    .where(eq(filmingRequestsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Request not found." });
    return;
  }

  await assignQueuePositions();

  const [final] = await db
    .select()
    .from(filmingRequestsTable)
    .where(eq(filmingRequestsTable.id, params.data.id));

  res.json(AdminApproveRequestResponse.parse(formatRequest(final)));
});

router.patch("/admin/requests/:id/reject", async (req, res): Promise<void> => {
  const params = AdminRejectRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [updated] = await db
    .update(filmingRequestsTable)
    .set({ status: "rejected", queuePosition: null })
    .where(eq(filmingRequestsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Request not found." });
    return;
  }

  await assignQueuePositions();

  res.json(AdminRejectRequestResponse.parse(formatRequest(updated)));
});

router.patch("/admin/requests/:id/schedule", async (req, res): Promise<void> => {
  const params = AdminScheduleRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = AdminScheduleRequestBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [updated] = await db
    .update(filmingRequestsTable)
    .set({
      scheduledAt: new Date(body.data.scheduledAt),
      status: "approved",
    })
    .where(eq(filmingRequestsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Request not found." });
    return;
  }

  res.json(AdminScheduleRequestResponse.parse(formatRequest(updated)));
});

router.patch("/admin/requests/:id/complete", async (req, res): Promise<void> => {
  const params = AdminCompleteRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = AdminCompleteRequestBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [updated] = await db
    .update(filmingRequestsTable)
    .set({
      status: "completed",
      videoUrl: body.data.videoUrl,
    })
    .where(eq(filmingRequestsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Request not found." });
    return;
  }

  await assignQueuePositions();

  res.json(AdminCompleteRequestResponse.parse(formatRequest(updated)));
});

export default router;
