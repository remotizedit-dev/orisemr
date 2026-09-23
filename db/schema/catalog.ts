import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import {
  catalogSourceEnum,
  formGroupEnum,
  medicineFormEnum,
  quickTextKindEnum,
} from "./enums";
import { tenants } from "./platform";

// -----------------------------------------------------------------------------
// 1. Service Categories
// -----------------------------------------------------------------------------
export const masterServiceCategories = pgTable("master_service_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const serviceCategories = pgTable(
  "service_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    masterId: uuid("master_id").references(() => masterServiceCategories.id, {
      onDelete: "set null",
    }),
    source: catalogSourceEnum("source").default("custom").notNull(),
    name: text("name").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("sc_tenant_idx").on(table.tenantId),
  ]
);

// -----------------------------------------------------------------------------
// 2. Services
// -----------------------------------------------------------------------------
export const masterServices = pgTable("master_services", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => masterServiceCategories.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  priceBdt: integer("price_bdt").default(0).notNull(),
  bookableOnline: boolean("bookable_online").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const services = pgTable(
  "services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    masterId: uuid("master_id").references(() => masterServices.id, {
      onDelete: "set null",
    }),
    source: catalogSourceEnum("source").default("custom").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => serviceCategories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    priceBdt: integer("price_bdt").default(0).notNull(),
    bookableOnline: boolean("bookable_online").default(true).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("services_tenant_idx").on(table.tenantId),
  ]
);

// -----------------------------------------------------------------------------
// 3. Dosage Patterns
// -----------------------------------------------------------------------------
export const masterDosagePatterns = pgTable("master_dosage_patterns", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  labelBn: text("label_bn").notNull(),
  code: text("code").notNull(),
  formGroup: formGroupEnum("form_group").default("oral_solid").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const dosagePatterns = pgTable(
  "dosage_patterns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    masterId: uuid("master_id").references(() => masterDosagePatterns.id, {
      onDelete: "set null",
    }),
    source: catalogSourceEnum("source").default("custom").notNull(),
    labelBn: text("label_bn").notNull(),
    code: text("code").notNull(),
    formGroup: formGroupEnum("form_group").default("oral_solid").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("dp_tenant_idx").on(table.tenantId),
  ]
);

// -----------------------------------------------------------------------------
// 4. Meal Timings
// -----------------------------------------------------------------------------
export const masterMealTimings = pgTable("master_meal_timings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  labelBn: text("label_bn").notNull(),
  code: text("code").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const mealTimings = pgTable(
  "meal_timings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    masterId: uuid("master_id").references(() => masterMealTimings.id, {
      onDelete: "set null",
    }),
    source: catalogSourceEnum("source").default("custom").notNull(),
    labelBn: text("label_bn").notNull(),
    code: text("code").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("mt_tenant_idx").on(table.tenantId),
  ]
);

// -----------------------------------------------------------------------------
// 5. Duration Options
// -----------------------------------------------------------------------------
export const masterDurationOptions = pgTable("master_duration_options", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  labelBn: text("label_bn").notNull(),
  daysCount: integer("days_count"),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const durationOptions = pgTable(
  "duration_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    masterId: uuid("master_id").references(() => masterDurationOptions.id, {
      onDelete: "set null",
    }),
    source: catalogSourceEnum("source").default("custom").notNull(),
    labelBn: text("label_bn").notNull(),
    daysCount: integer("days_count"),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("do_tenant_idx").on(table.tenantId),
  ]
);

// -----------------------------------------------------------------------------
// 6. Medicines
// -----------------------------------------------------------------------------
export const masterMedicines = pgTable("master_medicines", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  brandName: text("brand_name"),
  genericName: text("generic_name").notNull(),
  strength: text("strength"),
  form: medicineFormEnum("form").notNull(),
  drugClass: text("drug_class"),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const medicines = pgTable(
  "medicines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    masterId: uuid("master_id").references(() => masterMedicines.id, {
      onDelete: "set null",
    }),
    source: catalogSourceEnum("source").default("custom").notNull(),
    brandName: text("brand_name"),
    genericName: text("generic_name").notNull(),
    strength: text("strength"),
    form: medicineFormEnum("form").notNull(),
    drugClass: text("drug_class"),
    defaultDosagePatternId: uuid("default_dosage_pattern_id").references(
      () => dosagePatterns.id,
      { onDelete: "set null" }
    ),
    defaultMealTimingId: uuid("default_meal_timing_id").references(
      () => mealTimings.id,
      { onDelete: "set null" }
    ),
    defaultDurationOptionId: uuid("default_duration_option_id").references(
      () => durationOptions.id,
      { onDelete: "set null" }
    ),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("medicines_tenant_idx").on(table.tenantId),
  ]
);

// -----------------------------------------------------------------------------
// 7. Advice Templates
// -----------------------------------------------------------------------------
export const masterAdviceTemplates = pgTable("master_advice_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  groupName: text("group_name").notNull(),
  textBn: text("text_bn").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const adviceTemplates = pgTable(
  "advice_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    masterId: uuid("master_id").references(() => masterAdviceTemplates.id, {
      onDelete: "set null",
    }),
    source: catalogSourceEnum("source").default("custom").notNull(),
    groupName: text("group_name").notNull(),
    textBn: text("text_bn").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("at_tenant_idx").on(table.tenantId),
  ]
);

// -----------------------------------------------------------------------------
// 8. Quick Texts
// -----------------------------------------------------------------------------
export const masterQuickTexts = pgTable("master_quick_texts", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  kind: quickTextKindEnum("kind").notNull(),
  text: text("text").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const quickTexts = pgTable(
  "quick_texts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    masterId: uuid("master_id").references(() => masterQuickTexts.id, {
      onDelete: "set null",
    }),
    source: catalogSourceEnum("source").default("custom").notNull(),
    kind: quickTextKindEnum("kind").notNull(),
    text: text("text").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("qt_tenant_idx").on(table.tenantId),
  ]
);
