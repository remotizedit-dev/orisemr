CREATE TYPE "public"."appointment_source" AS ENUM('staff', 'public_booking', 'walk_in');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('pending', 'confirmed', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."attachment_kind" AS ENUM('patient_photo', 'xray', 'intraoral_photo', 'report', 'document', 'other');--> statement-breakpoint
CREATE TYPE "public"."billing_cycle" AS ENUM('monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."broadcast_audience" AS ENUM('tenant_admins', 'all_staff');--> statement-breakpoint
CREATE TYPE "public"."broadcast_target" AS ENUM('all_tenants', 'selected_tenants', 'selected_users');--> statement-breakpoint
CREATE TYPE "public"."catalog_source" AS ENUM('master', 'custom');--> statement-breakpoint
CREATE TYPE "public"."email_status" AS ENUM('pending', 'sending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."form_group" AS ENUM('oral_solid', 'oral_liquid', 'mouthwash', 'topical', 'toothpaste', 'any');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'due', 'partial', 'paid', 'void');--> statement-breakpoint
CREATE TYPE "public"."medicine_form" AS ENUM('tablet', 'capsule', 'syrup', 'suspension', 'drops', 'gel', 'paste', 'ointment', 'mouthwash', 'toothpaste', 'injection', 'other');--> statement-breakpoint
CREATE TYPE "public"."paper_size" AS ENUM('A4', 'A5', 'THERMAL_80MM');--> statement-breakpoint
CREATE TYPE "public"."patient_id_mode" AS ENUM('PRE_PRINTED', 'AUTO_GENERATE');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card', 'bkash', 'nagad', 'rocket', 'bank_transfer', 'other');--> statement-breakpoint
CREATE TYPE "public"."queue_status" AS ENUM('booked', 'waiting', 'in_chair', 'billing', 'done', 'no_show', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."quick_text_kind" AS ENUM('chief_complaint', 'examination', 'diagnosis', 'investigation');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'suspended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('SUPER_ADMIN', 'TENANT_ADMIN', 'DOCTOR', 'RECEPTIONIST');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"tenant_id" uuid,
	"role" "user_role" NOT NULL,
	"is_doctor" boolean DEFAULT false NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"phone" text,
	"doctor_title" text,
	"doctor_degrees" text,
	"doctor_specialty" text,
	"doctor_reg_no" text,
	"signature_key" text,
	"calendar_color" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_broadcasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"target" "broadcast_target" NOT NULL,
	"target_tenant_ids" uuid[] DEFAULT '{}' NOT NULL,
	"target_user_ids" text[] DEFAULT '{}' NOT NULL,
	"audience" "broadcast_audience",
	"send_email" boolean NOT NULL,
	"send_in_app" boolean NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "platform_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"amount_bdt" integer NOT NULL,
	"method" "payment_method" NOT NULL,
	"transaction_ref" text,
	"paid_at" timestamp with time zone NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"recorded_by" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plan_name" text NOT NULL,
	"price_bdt" integer NOT NULL,
	"billing_cycle" "billing_cycle" NOT NULL,
	"status" "subscription_status" NOT NULL,
	"trial_ends_at" date,
	"current_period_start" date NOT NULL,
	"current_period_end" date NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_subscriptions_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "tenant_counters" (
	"tenant_id" uuid NOT NULL,
	"key" text NOT NULL,
	"next_value" bigint DEFAULT 1 NOT NULL,
	CONSTRAINT "tenant_counters_tenant_id_key_pk" PRIMARY KEY("tenant_id","key")
);
--> statement-breakpoint
CREATE TABLE "tenant_features" (
	"tenant_id" uuid NOT NULL,
	"feature_key" text NOT NULL,
	"platform_enabled" boolean DEFAULT true NOT NULL,
	"tenant_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_features_tenant_id_feature_key_pk" PRIMARY KEY("tenant_id","feature_key")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"short_code" text NOT NULL,
	"status" "tenant_status" DEFAULT 'active' NOT NULL,
	"suspended_reason" text,
	"suspended_at" timestamp with time zone,
	"phone" text,
	"email" text,
	"address" text,
	"logo_key" text,
	"brand_color" text,
	"patient_id_mode" "patient_id_mode" DEFAULT 'PRE_PRINTED' NOT NULL,
	"patient_id_min_len" integer DEFAULT 10 NOT NULL,
	"patient_id_max_len" integer DEFAULT 16 NOT NULL,
	"slot_granularity_minutes" integer DEFAULT 10 NOT NULL,
	"booking_buffer_minutes" integer DEFAULT 0 NOT NULL,
	"public_booking_days_ahead" integer DEFAULT 30 NOT NULL,
	"public_booking_min_lead_minutes" integer DEFAULT 60 NOT NULL,
	"auto_confirm_existing_patient_bookings" boolean DEFAULT true NOT NULL,
	"reminder_24h_enabled" boolean DEFAULT true NOT NULL,
	"reminder_2h_enabled" boolean DEFAULT true NOT NULL,
	"rx_paper_size" "paper_size" DEFAULT 'A4' NOT NULL,
	"rx_print_letterhead" boolean DEFAULT true NOT NULL,
	"rx_top_margin_mm" integer DEFAULT 0 NOT NULL,
	"invoice_paper_size" "paper_size" DEFAULT 'A4' NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug"),
	CONSTRAINT "tenants_short_code_unique" UNIQUE("short_code")
);
--> statement-breakpoint
CREATE TABLE "chairs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "closures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"doctor_id" text,
	"date" date NOT NULL,
	"reason" text,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"doctor_id" text NOT NULL,
	"weekday" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_working_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advice_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"master_id" uuid,
	"source" "catalog_source" DEFAULT 'custom' NOT NULL,
	"group_name" text NOT NULL,
	"text_bn" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dosage_patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"master_id" uuid,
	"source" "catalog_source" DEFAULT 'custom' NOT NULL,
	"label_bn" text NOT NULL,
	"code" text NOT NULL,
	"form_group" "form_group" DEFAULT 'oral_solid' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "duration_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"master_id" uuid,
	"source" "catalog_source" DEFAULT 'custom' NOT NULL,
	"label_bn" text NOT NULL,
	"days_count" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "master_advice_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"group_name" text NOT NULL,
	"text_bn" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "master_advice_templates_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "master_dosage_patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label_bn" text NOT NULL,
	"code" text NOT NULL,
	"form_group" "form_group" DEFAULT 'oral_solid' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "master_dosage_patterns_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "master_duration_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label_bn" text NOT NULL,
	"days_count" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "master_duration_options_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "master_meal_timings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label_bn" text NOT NULL,
	"code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "master_meal_timings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "master_medicines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"brand_name" text,
	"generic_name" text NOT NULL,
	"strength" text,
	"form" "medicine_form" NOT NULL,
	"drug_class" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "master_medicines_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "master_quick_texts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"kind" "quick_text_kind" NOT NULL,
	"text" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "master_quick_texts_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "master_service_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "master_service_categories_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "master_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"price_bdt" integer DEFAULT 0 NOT NULL,
	"bookable_online" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "master_services_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "meal_timings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"master_id" uuid,
	"source" "catalog_source" DEFAULT 'custom' NOT NULL,
	"label_bn" text NOT NULL,
	"code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medicines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"master_id" uuid,
	"source" "catalog_source" DEFAULT 'custom' NOT NULL,
	"brand_name" text,
	"generic_name" text NOT NULL,
	"strength" text,
	"form" "medicine_form" NOT NULL,
	"drug_class" text,
	"default_dosage_pattern_id" uuid,
	"default_meal_timing_id" uuid,
	"default_duration_option_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quick_texts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"master_id" uuid,
	"source" "catalog_source" DEFAULT 'custom' NOT NULL,
	"kind" "quick_text_kind" NOT NULL,
	"text" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"master_id" uuid,
	"source" "catalog_source" DEFAULT 'custom' NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"master_id" uuid,
	"source" "catalog_source" DEFAULT 'custom' NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"price_bdt" integer DEFAULT 0 NOT NULL,
	"bookable_online" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"card_number" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"date_of_birth" date,
	"approx_age" integer,
	"gender" "gender" NOT NULL,
	"blood_group" text,
	"address" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"medical_conditions" text[] DEFAULT '{}' NOT NULL,
	"allergy_flags" text[] DEFAULT '{}' NOT NULL,
	"allergy_notes" text,
	"medical_notes" text,
	"photo_key" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "appointment_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"service_name_snapshot" text NOT NULL,
	"duration_minutes_snapshot" integer NOT NULL,
	"price_bdt_snapshot" integer NOT NULL,
	"tooth_codes" text[] DEFAULT '{}' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"appointment_code" text NOT NULL,
	"patient_id" uuid,
	"pending_patient_name" text,
	"pending_patient_phone" text,
	"pending_patient_email" text,
	"doctor_id" text NOT NULL,
	"chair_id" uuid,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"status" "appointment_status" NOT NULL,
	"source" "appointment_source" NOT NULL,
	"is_overbooked" boolean DEFAULT false NOT NULL,
	"notes" text,
	"cancel_reason" text,
	"created_by" text,
	"confirmed_by" text,
	"confirmed_at" timestamp with time zone,
	"reminder_24h_sent_at" timestamp with time zone,
	"reminder_2h_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queue_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" text NOT NULL,
	"chair_id" uuid,
	"date" date NOT NULL,
	"status" "queue_status" DEFAULT 'booked' NOT NULL,
	"serial_no" integer,
	"queue_position" integer DEFAULT 0 NOT NULL,
	"checked_in_at" timestamp with time zone,
	"in_chair_at" timestamp with time zone,
	"billing_at" timestamp with time zone,
	"done_at" timestamp with time zone,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "queue_entries_appointment_id_unique" UNIQUE("appointment_id")
);
--> statement-breakpoint
CREATE TABLE "doctor_medicine_preferences" (
	"tenant_id" uuid NOT NULL,
	"doctor_id" text NOT NULL,
	"medicine_id" uuid NOT NULL,
	"dosage_pattern_id" uuid,
	"meal_timing_id" uuid,
	"duration_option_id" uuid,
	"custom_instruction" text,
	"use_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "doctor_medicine_preferences_doctor_id_medicine_id_pk" PRIMARY KEY("doctor_id","medicine_id")
);
--> statement-breakpoint
CREATE TABLE "doctor_prescription_template_advice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"advice_template_id" uuid,
	"custom_text" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_prescription_template_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"medicine_id" uuid NOT NULL,
	"dosage_pattern_id" uuid,
	"meal_timing_id" uuid,
	"duration_option_id" uuid,
	"custom_instruction" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_prescription_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"doctor_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prescription_advice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prescription_id" uuid NOT NULL,
	"advice_template_id" uuid,
	"text_bn" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prescription_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prescription_id" uuid NOT NULL,
	"medicine_id" uuid NOT NULL,
	"medicine_line_snapshot" text NOT NULL,
	"dosage_pattern_id" uuid,
	"dosage_text_bn" text,
	"meal_timing_id" uuid,
	"meal_timing_text_bn" text,
	"duration_option_id" uuid,
	"duration_text_bn" text,
	"custom_instruction" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"rx_code" text NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" text NOT NULL,
	"appointment_id" uuid,
	"chief_complaint" text,
	"examination" text,
	"diagnosis" text,
	"investigations" text,
	"tooth_codes" text[] DEFAULT '{}' NOT NULL,
	"next_visit_date" date,
	"notes" text,
	"allergy_override" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"service_id" uuid,
	"description" text NOT NULL,
	"tooth_codes" text[] DEFAULT '{}' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_bdt" integer NOT NULL,
	"total_bdt" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_code" text,
	"patient_id" uuid NOT NULL,
	"appointment_id" uuid,
	"subtotal_bdt" integer NOT NULL,
	"discount_bdt" integer DEFAULT 0 NOT NULL,
	"discount_percent" numeric(5, 2),
	"total_bdt" integer NOT NULL,
	"paid_bdt" integer DEFAULT 0 NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"void_reason" text,
	"voided_by" text,
	"voided_at" timestamp with time zone,
	"finalized_at" timestamp with time zone,
	"last_reminder_sent_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount_bdt" integer NOT NULL,
	"method" "payment_method" NOT NULL,
	"transaction_ref" text,
	"received_by" text NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"note" text,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	"delete_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"kind" "attachment_kind" NOT NULL,
	"title" text,
	"report_code" text,
	"prescription_id" uuid,
	"s3_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"actor_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"template_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "email_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"dedupe_key" text,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_queue_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"tenant_id" uuid,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text,
	"broadcast_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_broadcasts" ADD CONSTRAINT "platform_broadcasts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_payments" ADD CONSTRAINT "platform_payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_payments" ADD CONSTRAINT "platform_payments_subscription_id_platform_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."platform_subscriptions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_payments" ADD CONSTRAINT "platform_payments_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_subscriptions" ADD CONSTRAINT "platform_subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_counters" ADD CONSTRAINT "tenant_counters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_features" ADD CONSTRAINT "tenant_features_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chairs" ADD CONSTRAINT "chairs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closures" ADD CONSTRAINT "closures_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closures" ADD CONSTRAINT "closures_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closures" ADD CONSTRAINT "closures_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_schedules" ADD CONSTRAINT "doctor_schedules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_schedules" ADD CONSTRAINT "doctor_schedules_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_working_hours" ADD CONSTRAINT "tenant_working_hours_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advice_templates" ADD CONSTRAINT "advice_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advice_templates" ADD CONSTRAINT "advice_templates_master_id_master_advice_templates_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."master_advice_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dosage_patterns" ADD CONSTRAINT "dosage_patterns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dosage_patterns" ADD CONSTRAINT "dosage_patterns_master_id_master_dosage_patterns_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."master_dosage_patterns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duration_options" ADD CONSTRAINT "duration_options_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duration_options" ADD CONSTRAINT "duration_options_master_id_master_duration_options_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."master_duration_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_services" ADD CONSTRAINT "master_services_category_id_master_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."master_service_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_timings" ADD CONSTRAINT "meal_timings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_timings" ADD CONSTRAINT "meal_timings_master_id_master_meal_timings_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."master_meal_timings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_master_id_master_medicines_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."master_medicines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_default_dosage_pattern_id_dosage_patterns_id_fk" FOREIGN KEY ("default_dosage_pattern_id") REFERENCES "public"."dosage_patterns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_default_meal_timing_id_meal_timings_id_fk" FOREIGN KEY ("default_meal_timing_id") REFERENCES "public"."meal_timings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_default_duration_option_id_duration_options_id_fk" FOREIGN KEY ("default_duration_option_id") REFERENCES "public"."duration_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quick_texts" ADD CONSTRAINT "quick_texts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quick_texts" ADD CONSTRAINT "quick_texts_master_id_master_quick_texts_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."master_quick_texts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_master_id_master_service_categories_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."master_service_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_master_id_master_services_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."master_services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_chair_id_chairs_id_fk" FOREIGN KEY ("chair_id") REFERENCES "public"."chairs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_chair_id_chairs_id_fk" FOREIGN KEY ("chair_id") REFERENCES "public"."chairs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_medicine_preferences" ADD CONSTRAINT "doctor_medicine_preferences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_medicine_preferences" ADD CONSTRAINT "doctor_medicine_preferences_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_medicine_preferences" ADD CONSTRAINT "doctor_medicine_preferences_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_medicine_preferences" ADD CONSTRAINT "doctor_medicine_preferences_dosage_pattern_id_dosage_patterns_id_fk" FOREIGN KEY ("dosage_pattern_id") REFERENCES "public"."dosage_patterns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_medicine_preferences" ADD CONSTRAINT "doctor_medicine_preferences_meal_timing_id_meal_timings_id_fk" FOREIGN KEY ("meal_timing_id") REFERENCES "public"."meal_timings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_medicine_preferences" ADD CONSTRAINT "doctor_medicine_preferences_duration_option_id_duration_options_id_fk" FOREIGN KEY ("duration_option_id") REFERENCES "public"."duration_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_prescription_template_advice" ADD CONSTRAINT "doctor_prescription_template_advice_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_prescription_template_advice" ADD CONSTRAINT "doctor_prescription_template_advice_template_id_doctor_prescription_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."doctor_prescription_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_prescription_template_advice" ADD CONSTRAINT "doctor_prescription_template_advice_advice_template_id_advice_templates_id_fk" FOREIGN KEY ("advice_template_id") REFERENCES "public"."advice_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_prescription_template_items" ADD CONSTRAINT "doctor_prescription_template_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_prescription_template_items" ADD CONSTRAINT "doctor_prescription_template_items_template_id_doctor_prescription_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."doctor_prescription_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_prescription_template_items" ADD CONSTRAINT "doctor_prescription_template_items_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_prescription_template_items" ADD CONSTRAINT "doctor_prescription_template_items_dosage_pattern_id_dosage_patterns_id_fk" FOREIGN KEY ("dosage_pattern_id") REFERENCES "public"."dosage_patterns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_prescription_template_items" ADD CONSTRAINT "doctor_prescription_template_items_meal_timing_id_meal_timings_id_fk" FOREIGN KEY ("meal_timing_id") REFERENCES "public"."meal_timings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_prescription_template_items" ADD CONSTRAINT "doctor_prescription_template_items_duration_option_id_duration_options_id_fk" FOREIGN KEY ("duration_option_id") REFERENCES "public"."duration_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_prescription_templates" ADD CONSTRAINT "doctor_prescription_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_prescription_templates" ADD CONSTRAINT "doctor_prescription_templates_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_advice" ADD CONSTRAINT "prescription_advice_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_advice" ADD CONSTRAINT "prescription_advice_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_advice" ADD CONSTRAINT "prescription_advice_advice_template_id_advice_templates_id_fk" FOREIGN KEY ("advice_template_id") REFERENCES "public"."advice_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_dosage_pattern_id_dosage_patterns_id_fk" FOREIGN KEY ("dosage_pattern_id") REFERENCES "public"."dosage_patterns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_meal_timing_id_meal_timings_id_fk" FOREIGN KEY ("meal_timing_id") REFERENCES "public"."meal_timings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_duration_option_id_duration_options_id_fk" FOREIGN KEY ("duration_option_id") REFERENCES "public"."duration_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_broadcast_id_platform_broadcasts_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "public"."platform_broadcasts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_tenant_role_idx" ON "users" USING btree ("tenant_id","role");--> statement-breakpoint
CREATE INDEX "pp_tenant_idx" ON "platform_payments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tc_tenant_idx" ON "tenant_counters" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tf_tenant_idx" ON "tenant_features" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "chairs_tenant_idx" ON "chairs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "closures_tenant_date_idx" ON "closures" USING btree ("tenant_id","date");--> statement-breakpoint
CREATE INDEX "ds_doctor_idx" ON "doctor_schedules" USING btree ("doctor_id","weekday");--> statement-breakpoint
CREATE INDEX "ds_tenant_idx" ON "doctor_schedules" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "twh_tenant_idx" ON "tenant_working_hours" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "twh_weekday_idx" ON "tenant_working_hours" USING btree ("tenant_id","weekday");--> statement-breakpoint
CREATE INDEX "at_tenant_idx" ON "advice_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "dp_tenant_idx" ON "dosage_patterns" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "do_tenant_idx" ON "duration_options" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "mt_tenant_idx" ON "meal_timings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "medicines_tenant_idx" ON "medicines" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "qt_tenant_idx" ON "quick_texts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sc_tenant_idx" ON "service_categories" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "services_tenant_idx" ON "services" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "patients_tenant_card_number_uq" ON "patients" USING btree ("tenant_id","card_number");--> statement-breakpoint
CREATE INDEX "patients_tenant_phone_idx" ON "patients" USING btree ("tenant_id","phone");--> statement-breakpoint
CREATE INDEX "patients_tenant_name_idx" ON "patients" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "as_appointment_idx" ON "appointment_services" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "as_tenant_idx" ON "appointment_services" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_tenant_code_uq" ON "appointments" USING btree ("tenant_id","appointment_code");--> statement-breakpoint
CREATE INDEX "appointments_doctor_start_idx" ON "appointments" USING btree ("doctor_id","start_time");--> statement-breakpoint
CREATE INDEX "appointments_tenant_start_idx" ON "appointments" USING btree ("tenant_id","start_time");--> statement-breakpoint
CREATE INDEX "appointments_tenant_status_idx" ON "appointments" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "queue_tenant_date_status_idx" ON "queue_entries" USING btree ("tenant_id","date","status");--> statement-breakpoint
CREATE INDEX "dmp_doctor_usage_idx" ON "doctor_medicine_preferences" USING btree ("doctor_id","use_count");--> statement-breakpoint
CREATE INDEX "dpta_template_idx" ON "doctor_prescription_template_advice" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "dpti_template_idx" ON "doctor_prescription_template_items" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "dpt_doctor_idx" ON "doctor_prescription_templates" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "dpt_tenant_idx" ON "doctor_prescription_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "pa_prescription_idx" ON "prescription_advice" USING btree ("prescription_id");--> statement-breakpoint
CREATE INDEX "pa_tenant_idx" ON "prescription_advice" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "pi_prescription_idx" ON "prescription_items" USING btree ("prescription_id");--> statement-breakpoint
CREATE INDEX "pi_tenant_idx" ON "prescription_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prescriptions_tenant_rx_code_uq" ON "prescriptions" USING btree ("tenant_id","rx_code");--> statement-breakpoint
CREATE INDEX "prescriptions_patient_created_idx" ON "prescriptions" USING btree ("tenant_id","patient_id","created_at");--> statement-breakpoint
CREATE INDEX "ii_invoice_idx" ON "invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "ii_tenant_idx" ON "invoice_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "invoices_tenant_status_idx" ON "invoices" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "invoices_tenant_patient_idx" ON "invoices" USING btree ("tenant_id","patient_id");--> statement-breakpoint
CREATE INDEX "payments_tenant_paid_at_idx" ON "payments" USING btree ("tenant_id","paid_at");--> statement-breakpoint
CREATE INDEX "payments_invoice_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "attachments_tenant_patient_idx" ON "attachments" USING btree ("tenant_id","patient_id");--> statement-breakpoint
CREATE INDEX "audit_tenant_created_idx" ON "audit_logs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "eq_status_next_idx" ON "email_queue" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","read_at");