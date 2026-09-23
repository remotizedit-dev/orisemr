import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { emailStatusEnum } from "./enums";
import { tenants, platformBroadcasts } from "./platform";
import { users } from "./auth";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
    }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    link: text("link"),
    broadcastId: uuid("broadcast_id").references(() => platformBroadcasts.id, {
      onDelete: "set null",
    }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notifications_user_read_idx").on(table.userId, table.readAt),
  ]
);

export const emailQueue = pgTable(
  "email_queue",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
    }),
    toEmail: text("to_email").notNull(),
    subject: text("subject").notNull(),
    templateKey: text("template_key").notNull(),
    payload: jsonb("payload").notNull(),
    status: emailStatusEnum("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    lastError: text("last_error"),
    dedupeKey: text("dedupe_key").unique(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("eq_status_next_idx").on(table.status, table.nextAttemptAt),
  ]
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
    }),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_tenant_created_idx").on(table.tenantId, table.createdAt),
    index("audit_entity_idx").on(table.entityType, table.entityId),
  ]
);
