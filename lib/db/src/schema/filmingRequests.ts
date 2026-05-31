import { pgTable, serial, text, real, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const filmingRequestsTable = pgTable("filming_requests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  locationName: text("location_name").notNull(),
  status: text("status").notNull().default("pending"),
  queuePosition: integer("queue_position"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  videoUrl: text("video_url"),
  filmingZone: jsonb("filming_zone"),
  cancellationReason: text("cancellation_reason"),
  ipAddress: text("ip_address").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFilmingRequestSchema = createInsertSchema(filmingRequestsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  queuePosition: true,
  scheduledAt: true,
  videoUrl: true,
  status: true,
});

export type InsertFilmingRequest = z.infer<typeof insertFilmingRequestSchema>;
export type FilmingRequest = typeof filmingRequestsTable.$inferSelect;
