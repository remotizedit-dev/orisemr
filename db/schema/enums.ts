import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "SUPER_ADMIN",
  "TENANT_ADMIN",
  "DOCTOR",
  "RECEPTIONIST",
]);

export const tenantStatusEnum = pgEnum("tenant_status", ["active", "suspended"]);

export const userStatusEnum = pgEnum("user_status", ["active", "disabled"]);

export const patientIdModeEnum = pgEnum("patient_id_mode", [
  "PRE_PRINTED",
  "AUTO_GENERATE",
]);

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);

export const appointmentSourceEnum = pgEnum("appointment_source", [
  "staff",
  "public_booking",
  "walk_in",
]);

export const queueStatusEnum = pgEnum("queue_status", [
  "booked",
  "waiting",
  "in_chair",
  "billing",
  "done",
  "no_show",
  "cancelled",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "due",
  "partial",
  "paid",
  "void",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "card",
  "bkash",
  "nagad",
  "rocket",
  "bank_transfer",
  "other",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "suspended",
  "cancelled",
]);

export const billingCycleEnum = pgEnum("billing_cycle", ["monthly", "yearly"]);

export const broadcastTargetEnum = pgEnum("broadcast_target", [
  "all_tenants",
  "selected_tenants",
  "selected_users",
]);

export const broadcastAudienceEnum = pgEnum("broadcast_audience", [
  "tenant_admins",
  "all_staff",
]);

export const emailStatusEnum = pgEnum("email_status", [
  "pending",
  "sending",
  "sent",
  "failed",
]);

export const medicineFormEnum = pgEnum("medicine_form", [
  "tablet",
  "capsule",
  "syrup",
  "suspension",
  "drops",
  "gel",
  "paste",
  "ointment",
  "mouthwash",
  "toothpaste",
  "injection",
  "other",
]);

export const formGroupEnum = pgEnum("form_group", [
  "oral_solid",
  "oral_liquid",
  "mouthwash",
  "topical",
  "toothpaste",
  "any",
]);

export const attachmentKindEnum = pgEnum("attachment_kind", [
  "patient_photo",
  "xray",
  "intraoral_photo",
  "report",
  "document",
  "other",
]);

export const quickTextKindEnum = pgEnum("quick_text_kind", [
  "chief_complaint",
  "examination",
  "diagnosis",
  "investigation",
]);

export const catalogSourceEnum = pgEnum("catalog_source", ["master", "custom"]);

export const paperSizeEnum = pgEnum("paper_size", [
  "A4",
  "A5",
  "THERMAL_80MM",
]);
