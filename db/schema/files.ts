import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { attachmentKindEnum } from "./enums";
import { tenants } from "./platform";
import { patients } from "./patients";
import { prescriptions } from "./prescriptions";
import { users } from "./auth";

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "restrict" }),
    kind: attachmentKindEnum("kind").notNull(),
    title: text("title"),
    reportCode: text("report_code"),
    prescriptionId: uuid("prescription_id").references(() => prescriptions.id, {
      onDelete: "set null",
    }),
    s3Key: text("s3_key").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("attachments_tenant_patient_idx").on(table.tenantId, table.patientId),
  ]
);
