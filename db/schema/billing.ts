import {
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { invoiceStatusEnum, paymentMethodEnum } from "./enums";
import { tenants } from "./platform";
import { users } from "./auth";
import { patients } from "./patients";
import { appointments } from "./appointments";
import { services } from "./catalog";

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    invoiceCode: text("invoice_code"),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "restrict" }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),
    subtotalBdt: integer("subtotal_bdt").notNull(),
    discountBdt: integer("discount_bdt").default(0).notNull(),
    discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }),
    totalBdt: integer("total_bdt").notNull(),
    paidBdt: integer("paid_bdt").default(0).notNull(),
    status: invoiceStatusEnum("status").default("draft").notNull(),
    voidReason: text("void_reason"),
    voidedBy: text("voided_by").references(() => users.id, { onDelete: "set null" }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    lastReminderSentAt: timestamp("last_reminder_sent_at", { withTimezone: true }),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("invoices_tenant_status_idx").on(table.tenantId, table.status),
    index("invoices_tenant_patient_idx").on(table.tenantId, table.patientId),
  ]
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id").references(() => services.id, {
      onDelete: "set null",
    }),
    description: text("description").notNull(),
    toothCodes: text("tooth_codes").array().default([]).notNull(),
    quantity: integer("quantity").default(1).notNull(),
    unitPriceBdt: integer("unit_price_bdt").notNull(),
    totalBdt: integer("total_bdt").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (table) => [
    index("ii_invoice_idx").on(table.invoiceId),
    index("ii_tenant_idx").on(table.tenantId),
  ]
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "restrict" }),
    amountBdt: integer("amount_bdt").notNull(),
    method: paymentMethodEnum("method").notNull(),
    transactionRef: text("transaction_ref"),
    receivedBy: text("received_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
    note: text("note"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references(() => users.id, { onDelete: "set null" }),
    deleteReason: text("delete_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("payments_tenant_paid_at_idx").on(table.tenantId, table.paidAt),
    index("payments_invoice_idx").on(table.invoiceId),
  ]
);
