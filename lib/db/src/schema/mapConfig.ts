import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const mapConfigTable = pgTable("map_config", {
  id: serial("id").primaryKey(),
  allowedZone: text("allowed_zone"),
  noFlyZones: text("no_fly_zones").notNull().default("[]"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type MapConfig = typeof mapConfigTable.$inferSelect;
