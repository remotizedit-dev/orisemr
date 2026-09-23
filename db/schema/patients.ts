import {
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { genderEnum } from "./enums";
import { tenants } from "./platform";
import { users } from "./auth";

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    cardNumber: text("card_number").notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    dateOfBirth: date("date_of_birth"),
    approxAge: integer("approx_age"),
    gender: genderEnum("gender").notNull(),
    bloodGroup: text("blood_group"),
    address: text("address"),
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),
    medicalConditions: text("medical_conditions").array().default([]).notNull(),
    allergyFlags: text("allergy_flags").array().default([]).notNull(),
    allergyNotes: text("allergy_notes"),
    medicalNotes: text("medical_notes"),
    photoKey: text("photo_key"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [
    uniqueIndex("patients_tenant_card_number_uq").on(table.tenantId, table.cardNumber),
    index("patients_tenant_phone_idx").on(table.tenantId, table.phone),
    index("patients_tenant_name_idx").on(table.tenantId, table.name),
  ]
);
