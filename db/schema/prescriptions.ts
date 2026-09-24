import {
  boolean,
  date,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./platform";
import { users } from "./auth";
import { patients } from "./patients";
import { appointments } from "./appointments";
import {
  adviceTemplates,
  dosagePatterns,
  durationOptions,
  mealTimings,
  medicines,
} from "./catalog";

export const prescriptions = pgTable(
  "prescriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    rxCode: text("rx_code").notNull(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "restrict" }),
    doctorId: text("doctor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),
    chiefComplaint: text("chief_complaint"),
    examination: text("examination"),
    diagnosis: text("diagnosis"),
    investigations: text("investigations"),
    toothCodes: text("tooth_codes").array().default([]).notNull(),
    nextVisitDate: date("next_visit_date"),
    notes: text("notes"),
    allergyOverride: boolean("allergy_override").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("prescriptions_tenant_rx_code_uq").on(table.tenantId, table.rxCode),
    index("prescriptions_patient_created_idx").on(
      table.tenantId,
      table.patientId,
      table.createdAt
    ),
    index("prescriptions_tenant_created_idx").on(table.tenantId, table.createdAt),
    index("prescriptions_tenant_appt_idx").on(table.tenantId, table.appointmentId),
  ]
);

export const prescriptionItems = pgTable(
  "prescription_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    prescriptionId: uuid("prescription_id")
      .notNull()
      .references(() => prescriptions.id, { onDelete: "cascade" }),
    medicineId: uuid("medicine_id")
      .notNull()
      .references(() => medicines.id, { onDelete: "restrict" }),
    medicineLineSnapshot: text("medicine_line_snapshot").notNull(),
    dosagePatternId: uuid("dosage_pattern_id").references(() => dosagePatterns.id, {
      onDelete: "set null",
    }),
    dosageTextBn: text("dosage_text_bn"),
    mealTimingId: uuid("meal_timing_id").references(() => mealTimings.id, {
      onDelete: "set null",
    }),
    mealTimingTextBn: text("meal_timing_text_bn"),
    durationOptionId: uuid("duration_option_id").references(() => durationOptions.id, {
      onDelete: "set null",
    }),
    durationTextBn: text("duration_text_bn"),
    customInstruction: text("custom_instruction"),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (table) => [
    index("pi_prescription_idx").on(table.prescriptionId),
    index("pi_tenant_idx").on(table.tenantId),
  ]
);

export const prescriptionAdvice = pgTable(
  "prescription_advice",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    prescriptionId: uuid("prescription_id")
      .notNull()
      .references(() => prescriptions.id, { onDelete: "cascade" }),
    adviceTemplateId: uuid("advice_template_id").references(
      () => adviceTemplates.id,
      { onDelete: "set null" }
    ),
    textBn: text("text_bn").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (table) => [
    index("pa_prescription_idx").on(table.prescriptionId),
    index("pa_tenant_idx").on(table.tenantId),
  ]
);

export const doctorPrescriptionTemplates = pgTable(
  "doctor_prescription_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    doctorId: text("doctor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("dpt_doctor_idx").on(table.doctorId),
    index("dpt_tenant_idx").on(table.tenantId),
  ]
);

export const doctorPrescriptionTemplateItems = pgTable(
  "doctor_prescription_template_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => doctorPrescriptionTemplates.id, { onDelete: "cascade" }),
    medicineId: uuid("medicine_id")
      .notNull()
      .references(() => medicines.id, { onDelete: "restrict" }),
    dosagePatternId: uuid("dosage_pattern_id").references(() => dosagePatterns.id, {
      onDelete: "set null",
    }),
    mealTimingId: uuid("meal_timing_id").references(() => mealTimings.id, {
      onDelete: "set null",
    }),
    durationOptionId: uuid("duration_option_id").references(() => durationOptions.id, {
      onDelete: "set null",
    }),
    customInstruction: text("custom_instruction"),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (table) => [
    index("dpti_template_idx").on(table.templateId),
  ]
);

export const doctorPrescriptionTemplateAdvice = pgTable(
  "doctor_prescription_template_advice",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => doctorPrescriptionTemplates.id, { onDelete: "cascade" }),
    adviceTemplateId: uuid("advice_template_id").references(
      () => adviceTemplates.id,
      { onDelete: "set null" }
    ),
    customText: text("custom_text"),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (table) => [
    index("dpta_template_idx").on(table.templateId),
  ]
);

export const doctorMedicinePreferences = pgTable(
  "doctor_medicine_preferences",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    doctorId: text("doctor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    medicineId: uuid("medicine_id")
      .notNull()
      .references(() => medicines.id, { onDelete: "cascade" }),
    dosagePatternId: uuid("dosage_pattern_id").references(() => dosagePatterns.id, {
      onDelete: "set null",
    }),
    mealTimingId: uuid("meal_timing_id").references(() => mealTimings.id, {
      onDelete: "set null",
    }),
    durationOptionId: uuid("duration_option_id").references(() => durationOptions.id, {
      onDelete: "set null",
    }),
    customInstruction: text("custom_instruction"),
    useCount: integer("use_count").default(0).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.doctorId, table.medicineId] }),
    index("dmp_doctor_usage_idx").on(table.doctorId, table.useCount),
  ]
);
