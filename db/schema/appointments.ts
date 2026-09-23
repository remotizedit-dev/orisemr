import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import {
  appointmentSourceEnum,
  appointmentStatusEnum,
  queueStatusEnum,
} from "./enums";
import { tenants } from "./platform";
import { users } from "./auth";
import { chairs } from "./clinic-config";
import { patients } from "./patients";
import { services } from "./catalog";

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    appointmentCode: text("appointment_code").notNull(),
    patientId: uuid("patient_id").references(() => patients.id, {
      onDelete: "restrict",
    }),
    pendingPatientName: text("pending_patient_name"),
    pendingPatientPhone: text("pending_patient_phone"),
    pendingPatientEmail: text("pending_patient_email"),
    doctorId: text("doctor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    chairId: uuid("chair_id").references(() => chairs.id, {
      onDelete: "set null",
    }),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    status: appointmentStatusEnum("status").notNull(),
    source: appointmentSourceEnum("source").notNull(),
    isOverbooked: boolean("is_overbooked").default(false).notNull(),
    notes: text("notes"),
    cancelReason: text("cancel_reason"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    confirmedBy: text("confirmed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    reminder24hSentAt: timestamp("reminder_24h_sent_at", { withTimezone: true }),
    reminder2hSentAt: timestamp("reminder_2h_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("appointments_tenant_code_uq").on(table.tenantId, table.appointmentCode),
    index("appointments_doctor_start_idx").on(table.doctorId, table.startTime),
    index("appointments_tenant_start_idx").on(table.tenantId, table.startTime),
    index("appointments_tenant_status_idx").on(table.tenantId, table.status),
  ]
);

export const appointmentServices = pgTable(
  "appointment_services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    serviceNameSnapshot: text("service_name_snapshot").notNull(),
    durationMinutesSnapshot: integer("duration_minutes_snapshot").notNull(),
    priceBdtSnapshot: integer("price_bdt_snapshot").notNull(),
    toothCodes: text("tooth_codes").array().default([]).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (table) => [
    index("as_appointment_idx").on(table.appointmentId),
    index("as_tenant_idx").on(table.tenantId),
  ]
);

export const queueEntries = pgTable(
  "queue_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id")
      .notNull()
      .unique()
      .references(() => appointments.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "restrict" }),
    doctorId: text("doctor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    chairId: uuid("chair_id").references(() => chairs.id, {
      onDelete: "set null",
    }),
    date: date("date").notNull(),
    status: queueStatusEnum("status").default("booked").notNull(),
    serialNo: integer("serial_no"),
    queuePosition: integer("queue_position").default(0).notNull(),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    inChairAt: timestamp("in_chair_at", { withTimezone: true }),
    billingAt: timestamp("billing_at", { withTimezone: true }),
    doneAt: timestamp("done_at", { withTimezone: true }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("queue_tenant_date_status_idx").on(table.tenantId, table.date, table.status),
  ]
);
