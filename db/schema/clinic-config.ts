import {
  boolean,
  date,
  integer,
  pgTable,
  smallint,
  text,
  time,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./platform";
import { users } from "./auth";

export const tenantWorkingHours = pgTable(
  "tenant_working_hours",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
  },
  (table) => [
    index("twh_tenant_idx").on(table.tenantId),
    index("twh_weekday_idx").on(table.tenantId, table.weekday),
  ]
);

export const doctorSchedules = pgTable(
  "doctor_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    doctorId: text("doctor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
  },
  (table) => [
    index("ds_doctor_idx").on(table.doctorId, table.weekday),
    index("ds_tenant_idx").on(table.tenantId),
  ]
);

export const closures = pgTable(
  "closures",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    doctorId: text("doctor_id").references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    reason: text("reason"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
  },
  (table) => [
    index("closures_tenant_date_idx").on(table.tenantId, table.date),
  ]
);

export const chairs = pgTable(
  "chairs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (table) => [
    index("chairs_tenant_idx").on(table.tenantId),
    index("chairs_tenant_active_idx").on(table.tenantId, table.isActive, table.sortOrder),
  ]
);
