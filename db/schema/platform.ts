import {
  bigint,
  boolean,
  date,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import {
  billingCycleEnum,
  broadcastAudienceEnum,
  broadcastTargetEnum,
  patientIdModeEnum,
  paymentMethodEnum,
  subscriptionStatusEnum,
  tenantStatusEnum,
  paperSizeEnum,
} from "./enums";
import { users } from "./auth";

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  shortCode: text("short_code").notNull().unique(),
  status: tenantStatusEnum("status").default("active").notNull(),
  suspendedReason: text("suspended_reason"),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  logoKey: text("logo_key"),
  brandColor: text("brand_color"),
  patientIdMode: patientIdModeEnum("patient_id_mode").default("PRE_PRINTED").notNull(),
  patientIdMinLen: integer("patient_id_min_len").default(10).notNull(),
  patientIdMaxLen: integer("patient_id_max_len").default(16).notNull(),
  slotGranularityMinutes: integer("slot_granularity_minutes").default(10).notNull(),
  bookingBufferMinutes: integer("booking_buffer_minutes").default(0).notNull(),
  publicBookingDaysAhead: integer("public_booking_days_ahead").default(30).notNull(),
  publicBookingMinLeadMinutes: integer("public_booking_min_lead_minutes").default(60).notNull(),
  autoConfirmExistingPatientBookings: boolean("auto_confirm_existing_patient_bookings").default(true).notNull(),
  reminder24hEnabled: boolean("reminder_24h_enabled").default(true).notNull(),
  reminder2hEnabled: boolean("reminder_2h_enabled").default(true).notNull(),
  rxPaperSize: paperSizeEnum("rx_paper_size").default("A4").notNull(),
  rxPrintLetterhead: boolean("rx_print_letterhead").default(true).notNull(),
  rxTopMarginMm: integer("rx_top_margin_mm").default(0).notNull(),
  invoicePaperSize: paperSizeEnum("invoice_paper_size").default("A4").notNull(),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tenantFeatures = pgTable(
  "tenant_features",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    featureKey: text("feature_key").notNull(),
    platformEnabled: boolean("platform_enabled").default(true).notNull(),
    tenantEnabled: boolean("tenant_enabled").default(true).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.tenantId, table.featureKey] }),
    index("tf_tenant_idx").on(table.tenantId),
  ]
);

export const tenantCounters = pgTable(
  "tenant_counters",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    nextValue: bigint("next_value", { mode: "number" }).default(1).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.tenantId, table.key] }),
    index("tc_tenant_idx").on(table.tenantId),
  ]
);

export const platformSubscriptions = pgTable("platform_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .unique()
    .references(() => tenants.id, { onDelete: "restrict" }),
  planName: text("plan_name").notNull(),
  priceBdt: integer("price_bdt").notNull(),
  billingCycle: billingCycleEnum("billing_cycle").notNull(),
  status: subscriptionStatusEnum("status").notNull(),
  trialEndsAt: date("trial_ends_at"),
  currentPeriodStart: date("current_period_start").notNull(),
  currentPeriodEnd: date("current_period_end").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const platformPayments = pgTable(
  "platform_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => platformSubscriptions.id, { onDelete: "restrict" }),
    amountBdt: integer("amount_bdt").notNull(),
    method: paymentMethodEnum("method").notNull(),
    transactionRef: text("transaction_ref"),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    recordedBy: text("recorded_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("pp_tenant_idx").on(table.tenantId),
  ]
);

export const platformBroadcasts = pgTable("platform_broadcasts", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  target: broadcastTargetEnum("target").notNull(),
  targetTenantIds: uuid("target_tenant_ids").array().default([]).notNull(),
  targetUserIds: text("target_user_ids").array().default([]).notNull(),
  audience: broadcastAudienceEnum("audience"),
  sendEmail: boolean("send_email").notNull(),
  sendInApp: boolean("send_in_app").notNull(),
  recipientCount: integer("recipient_count").default(0).notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});
