# Oris EMR — Database Schema (Drizzle ORM · Postgres · Neon)

**Version:** 2.0 (final for build) · **Date:** 2026-09-23

This is the contract for every table. **Names here are final — don't rename them.** Behavior is defined in `PROJECT.md`; this file wins on names and types.

---

## 0. Conventions

- Organize as separate files under `/db/schema/`, re-exported from `/db/schema/index.ts`: `enums.ts`, `auth.ts`, `platform.ts`, `clinic-config.ts`, `catalog.ts`, `patients.ts`, `appointments.ts`, `prescriptions.ts`, `billing.ts`, `files.ts`, `system.ts`.
- Names below are **database column names** (snake_case). Configure Drizzle with `casing: "snake_case"` so TypeScript properties are camelCase.
- **Columns are NOT NULL unless marked `nullable`.**
- Every table has `created_at timestamptz default now()`; every mutable table also has `updated_at timestamptz default now()` (updated by the app). They're only listed where it matters.
- Primary keys are `id uuid default gen_random_uuid()` unless stated otherwise.
- Money columns are `integer` whole taka, suffixed `_bdt` (`PROJECT.md` §3.7).
- `time` columns are Asia/Dhaka wall-clock times; `date` columns are Asia/Dhaka calendar dates; `timestamptz` columns are stored in UTC.
- Foreign keys use `ON DELETE RESTRICT` unless stated otherwise (records are soft-deleted, not removed). Child rows that only exist inside a parent use `ON DELETE CASCADE` (marked "cascade").

---

## 1. Table index

**Tenant-scoped** — `tenant_id uuid not null` with an index; all access goes through `lib/tenant-scope.ts`:

`tenant_features`, `tenant_counters`, `tenant_working_hours`, `doctor_schedules`, `closures`, `chairs`, `service_categories`, `services`, `medicines`, `dosage_patterns`, `meal_timings`, `duration_options`, `advice_templates`, `quick_texts`, `patients`, `appointments`, `appointment_services`, `queue_entries`, `prescriptions`, `prescription_items`, `prescription_advice`, `doctor_prescription_templates`, `doctor_prescription_template_items`, `doctor_prescription_template_advice`, `doctor_medicine_preferences`, `invoices`, `invoice_items`, `payments`, `attachments`

**Platform-managed, one clinic each** — `tenant_id not null`, written only by Super Admin code; a Tenant Admin may read their own rows through the scoping helper:

`platform_subscriptions`, `platform_payments`

**Global / system** — no tenant scoping (or a nullable `tenant_id` for reference only):

`tenants`, `users`, `sessions`, `accounts`, `verifications` (+ Better Auth's rate-limit table), `platform_broadcasts`, `notifications` (scoped per user), `master_service_categories`, `master_services`, `master_medicines`, `master_dosage_patterns`, `master_meal_timings`, `master_duration_options`, `master_advice_templates`, `master_quick_texts`, `email_queue`, `rate_limits`, `audit_logs`

---

## 2. Enums (`pgEnum`)

```
user_role:            SUPER_ADMIN | TENANT_ADMIN | DOCTOR | RECEPTIONIST
tenant_status:        active | suspended
user_status:          active | disabled
patient_id_mode:      PRE_PRINTED | AUTO_GENERATE
gender:               male | female | other
appointment_status:   pending | confirmed | completed | cancelled | no_show
appointment_source:   staff | public_booking | walk_in
queue_status:         booked | waiting | in_chair | billing | done | no_show | cancelled
invoice_status:       draft | due | partial | paid | void
payment_method:       cash | card | bkash | nagad | rocket | bank_transfer | other
subscription_status:  trialing | active | past_due | suspended | cancelled
billing_cycle:        monthly | yearly
broadcast_target:     all_tenants | selected_tenants | selected_users
broadcast_audience:   tenant_admins | all_staff
email_status:         pending | sending | sent | failed
medicine_form:        tablet | capsule | syrup | suspension | drops | gel | paste | ointment | mouthwash | toothpaste | injection | other
form_group:           oral_solid | oral_liquid | mouthwash | topical | toothpaste | any
attachment_kind:      patient_photo | xray | intraoral_photo | report | document | other
quick_text_kind:      chief_complaint | examination | diagnosis | investigation
catalog_source:       master | custom
paper_size:           A4 | A5 | THERMAL_80MM
```

`feature_key` and `drug_class` are plain `text` (values listed in `PROJECT.md` §4.3 and `SEED_DATA.md` §2) so new values don't need a migration.

---

## 3. Identity (Better Auth)

Generate the auth tables with Better Auth's schema generator for the Drizzle adapter, then add the extra user fields below (Better Auth `user.additionalFields`). Use table names `users`, `sessions`, `accounts`, `verifications`. Configure UUID IDs. Do not hand-write password columns — Better Auth keeps the password hash in `accounts`. With database rate-limit storage enabled, Better Auth also generates its own rate-limit table; keep it as generated.

### `users`
Better Auth core fields: `id`, `name`, `email` (unique, lowercase), `email_verified`, `image` (nullable), `created_at`, `updated_at`. Additional fields:

| Column | Type | Notes |
|---|---|---|
| tenant_id | uuid → tenants, nullable | null **only** for `SUPER_ADMIN` |
| role | user_role | if the Better Auth admin plugin is used, its `role` column is this one — no second role column |
| is_doctor | boolean default false | clinical ability (`PROJECT.md` §4.1) |
| status | user_status default `active` | |
| phone | text, nullable | normalized `01XXXXXXXXX` |
| doctor_title | text, nullable | e.g. "Dr." |
| doctor_degrees | text, nullable | e.g. "BDS, FCPS (Conservative Dentistry)" |
| doctor_specialty | text, nullable | shown on public booking and prescriptions |
| doctor_reg_no | text, nullable | BMDC registration number, printed on prescriptions |
| signature_key | text, nullable | S3 key of signature image |
| calendar_color | text, nullable | hex color |
| sort_order | integer default 0 | dentist ordering (tie-break in "any dentist") |
| preferences | jsonb default `'{}'` | dashboard widget layout, UI prefs |
| last_login_at | timestamptz, nullable | |

Checks (§12): `(role = 'SUPER_ADMIN') = (tenant_id IS NULL)`; `role <> 'DOCTOR' OR is_doctor`.

### `sessions`, `accounts`, `verifications`
Exactly as generated by Better Auth. Session expiry and revocation behavior: `PROJECT.md` §3.2–3.3.

---

## 4. Platform tables

### `tenants`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | clinic name |
| slug | text unique | lowercase `a–z 0–9 -`; public URL `/book/{slug}` |
| short_code | text unique | 2–6 chars `A–Z 0–9`; used in record codes (`INV-{short_code}-000123`) |
| status | tenant_status default `active` | |
| suspended_reason | text, nullable | |
| suspended_at | timestamptz, nullable | |
| phone | text, nullable | free text |
| email | text, nullable | Reply-To for patient emails |
| address | text, nullable | |
| logo_key | text, nullable | S3 key under `public/` |
| brand_color | text, nullable | hex; public booking page |
| patient_id_mode | patient_id_mode default `PRE_PRINTED` | |
| patient_id_min_len | integer default 10 | check: 10 ≤ min ≤ max ≤ 16 |
| patient_id_max_len | integer default 16 | |
| slot_granularity_minutes | integer default 10 | allowed: 5, 10, 15, 30 |
| booking_buffer_minutes | integer default 0 | padding around existing appointments |
| public_booking_days_ahead | integer default 30 | |
| public_booking_min_lead_minutes | integer default 60 | |
| auto_confirm_existing_patient_bookings | boolean default true | |
| reminder_24h_enabled | boolean default true | |
| reminder_2h_enabled | boolean default true | |
| rx_paper_size | paper_size default `A4` | A4 or A5 only (app-validated) |
| rx_print_letterhead | boolean default true | false = pre-printed pads |
| rx_top_margin_mm | integer default 0 | used when letterhead is off |
| invoice_paper_size | paper_size default `A4` | |
| onboarding_completed_at | timestamptz, nullable | set when the setup checklist is complete |
| created_at, updated_at | timestamptz | |

### `tenant_features` — PK (`tenant_id`, `feature_key`)
| Column | Type | Notes |
|---|---|---|
| tenant_id | uuid → tenants | |
| feature_key | text | `public_booking`, `email_notifications`, `billing`, `reports`, `camera_scan` |
| platform_enabled | boolean default true | set by Super Admin |
| tenant_enabled | boolean default true | set by Tenant Admin |
| updated_at | timestamptz | |

### `tenant_counters` — PK (`tenant_id`, `key`)
| Column | Type | Notes |
|---|---|---|
| tenant_id | uuid → tenants | |
| key | text | `APT`, `RX`, `INV`, `RPT`, `CARD`, `SERIAL:{yyyy-mm-dd}` |
| next_value | bigint default 1 | increment with `UPDATE … RETURNING` inside the using transaction; `SERIAL:*` rows are created on first use each day |

### `platform_subscriptions`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid → tenants, unique | one subscription record per clinic |
| plan_name | text | |
| price_bdt | integer | |
| billing_cycle | billing_cycle | |
| status | subscription_status | |
| trial_ends_at | date, nullable | |
| current_period_start | date | |
| current_period_end | date | |
| notes | text, nullable | |
| created_at, updated_at | timestamptz | |

### `platform_payments`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid → tenants | |
| subscription_id | uuid → platform_subscriptions | |
| amount_bdt | integer | check > 0 |
| method | payment_method | |
| transaction_ref | text, nullable | |
| paid_at | timestamptz | |
| period_start | date | period this payment covers |
| period_end | date | |
| recorded_by | uuid → users | the Super Admin |
| note | text, nullable | |
| created_at | timestamptz | |

### `platform_broadcasts`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| title | text | |
| body | text | plain text |
| target | broadcast_target | |
| target_tenant_ids | uuid[] default `'{}'` | used when `selected_tenants` |
| target_user_ids | uuid[] default `'{}'` | used when `selected_users` |
| audience | broadcast_audience | ignored for `selected_users` |
| send_email | boolean | |
| send_in_app | boolean | |
| recipient_count | integer default 0 | |
| created_by | uuid → users | |
| created_at | timestamptz | |
| sent_at | timestamptz, nullable | |

---

## 5. Clinic configuration

### `tenant_working_hours`
Several rows per weekday are allowed (split shifts). A weekday with no rows is closed.
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid → tenants | |
| weekday | smallint | 0 = Sunday … 6 = Saturday |
| start_time | time | |
| end_time | time | check `start_time < end_time` |

### `doctor_schedules`
A dentist's personal weekly hours. If a dentist has **no** rows, the slot engine uses clinic hours.
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid → tenants | |
| doctor_id | uuid → users | must be `is_doctor` in the same clinic (app-validated) |
| weekday | smallint | 0–6 |
| start_time | time | |
| end_time | time | check `start_time < end_time` |

### `closures`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid → tenants | |
| doctor_id | uuid → users, nullable | null = whole clinic closed |
| date | date | |
| reason | text, nullable | |
| created_by | uuid → users | |

### `chairs`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid → tenants | |
| name | text | e.g. "Chair 1" |
| is_active | boolean default true | |
| sort_order | integer default 0 | |

---

## 6. Catalogs (master templates + per-clinic copies)

Every catalog exists twice with the same shape:
- **`master_*`** — global templates curated by the Super Admin. Extra column: `key text unique` (stable slug used by the seed script and "push new items"). No `tenant_id`.
- **Clinic copy** — extra columns: `tenant_id`, `source catalog_source default 'custom'`, `master_id uuid nullable → master_* ON DELETE SET NULL`. Partial unique index `(tenant_id, master_id) WHERE master_id IS NOT NULL` (§12).

Both versions also have `is_active boolean default true`, `sort_order integer default 0`, `created_at`, `updated_at`.

| Master table | Clinic table | Specific columns |
|---|---|---|
| `master_service_categories` | `service_categories` | `name text` (English) |
| `master_services` | `services` | `category_id uuid` → the matching categories table · `name text` (English) · `duration_minutes integer` (check > 0) · `price_bdt integer default 0` · `bookable_online boolean default true` |
| `master_medicines` | `medicines` | `brand_name text nullable` (English; null = generic-only row) · `generic_name text` · `strength text nullable` (e.g. "500 mg", "0.2%") · `form medicine_form` · `drug_class text nullable` |
| `master_dosage_patterns` | `dosage_patterns` | `label_bn text` (Bangla, e.g. "১+০+১") · `code text` (ASCII, e.g. "1-0-1") · `form_group form_group default 'oral_solid'` |
| `master_meal_timings` | `meal_timings` | `label_bn text` · `code text` (e.g. `after_meal`) |
| `master_duration_options` | `duration_options` | `label_bn text` · `days_count integer nullable` (null = open-ended, e.g. "চলবে") |
| `master_advice_templates` | `advice_templates` | `group_name text` (English, e.g. "Post-extraction") · `text_bn text` |
| `master_quick_texts` | `quick_texts` | `kind quick_text_kind` · `text text` (English) |

Clinic-only extra columns on `medicines` (not on the master — each clinic sets its own):
| Column | Type |
|---|---|
| default_dosage_pattern_id | uuid → dosage_patterns, nullable |
| default_meal_timing_id | uuid → meal_timings, nullable |
| default_duration_option_id | uuid → duration_options, nullable |

---

## 7. Patients

### `patients`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid → tenants | |
| card_number | text | digits only, 10–16 (check); **unique (tenant_id, card_number)**; never reused |
| name | text | |
| phone | text | normalized `01XXXXXXXXX`; not unique (families share phones) |
| email | text, nullable | needed for email notifications |
| date_of_birth | date, nullable | |
| approx_age | integer, nullable | used when the date of birth is unknown |
| gender | gender | |
| blood_group | text, nullable | A+, A−, B+, B−, AB+, AB−, O+, O− |
| address | text, nullable | |
| emergency_contact_name | text, nullable | |
| emergency_contact_phone | text, nullable | |
| medical_conditions | text[] default `'{}'` | values from `SEED_DATA.md` §8 |
| allergy_flags | text[] default `'{}'` | values from `SEED_DATA.md` §8 |
| allergy_notes | text, nullable | |
| medical_notes | text, nullable | |
| photo_key | text, nullable | S3 key |
| created_by | uuid → users | |
| created_at, updated_at | timestamptz | |
| deleted_at | timestamptz, nullable | soft delete |
| deleted_by | uuid → users, nullable | |

---

## 8. Appointments and queue

### `appointments`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid → tenants | |
| appointment_code | text | `APT-{SHORT}-{seq6}`; unique (tenant_id, appointment_code) |
| patient_id | uuid → patients, nullable | null only while a new patient's online booking is `pending` (or it was declined) |
| pending_patient_name | text, nullable | online booking by a new patient |
| pending_patient_phone | text, nullable | |
| pending_patient_email | text, nullable | |
| doctor_id | uuid → users | always set ("any dentist" is resolved at booking) |
| chair_id | uuid → chairs, nullable | |
| start_time | timestamptz | |
| end_time | timestamptz | start + sum of service durations |
| status | appointment_status | |
| source | appointment_source | |
| is_overbooked | boolean default false | staff override or overlapping walk-in; excluded from the overlap constraint |
| notes | text, nullable | |
| cancel_reason | text, nullable | |
| created_by | uuid → users, nullable | null for public bookings |
| confirmed_by | uuid → users, nullable | |
| confirmed_at | timestamptz, nullable | |
| reminder_24h_sent_at | timestamptz, nullable | |
| reminder_2h_sent_at | timestamptz, nullable | |
| created_at, updated_at | timestamptz | |

Checks and the overlap exclusion constraint: §12.

### `appointment_services`
The services for a visit: booked services, adjusted by the dentist at "Finish treatment". The draft invoice is built from these rows.
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid → tenants | |
| appointment_id | uuid → appointments (cascade) | |
| service_id | uuid → services | |
| service_name_snapshot | text | |
| duration_minutes_snapshot | integer | |
| price_bdt_snapshot | integer | |
| tooth_codes | text[] default `'{}'` | FDI codes, e.g. `{36,37}` |
| sort_order | integer default 0 | |

### `queue_entries`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid → tenants | |
| appointment_id | uuid → appointments, **unique** | every queue entry belongs to exactly one appointment |
| patient_id | uuid → patients | |
| doctor_id | uuid → users | |
| chair_id | uuid → chairs, nullable | |
| date | date | Dhaka date of the visit |
| status | queue_status default `booked` | walk-ins start at `waiting` |
| serial_no | integer, nullable | assigned at check-in; unique per (tenant_id, date) |
| queue_position | integer default 0 | drag order within `waiting` |
| checked_in_at | timestamptz, nullable | |
| in_chair_at | timestamptz, nullable | |
| billing_at | timestamptz, nullable | |
| done_at | timestamptz, nullable | |
| updated_by | uuid → users, nullable | |
| created_at, updated_at | timestamptz | `updated_at` also used for "changed by someone else" checks |

---

## 9. Prescriptions

### `prescriptions`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid → tenants | |
| rx_code | text | `RX-{SHORT}-{seq6}`; unique (tenant_id, rx_code) |
| patient_id | uuid → patients | |
| doctor_id | uuid → users | |
| appointment_id | uuid → appointments, nullable | |
| chief_complaint | text, nullable | |
| examination | text, nullable | on-examination findings |
| diagnosis | text, nullable | |
| investigations | text, nullable | |
| tooth_codes | text[] default `'{}'` | FDI |
| next_visit_date | date, nullable | |
| notes | text, nullable | |
| allergy_override | boolean default false | dentist confirmed a `block` allergy warning |
| created_at, updated_at | timestamptz | editable by the author for 24 h after `created_at` |

### `prescription_items`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid → tenants | |
| prescription_id | uuid → prescriptions (cascade) | |
| medicine_id | uuid → medicines | |
| medicine_line_snapshot | text | the printed line, e.g. "Tab. Napa 500 mg (Paracetamol)" |
| dosage_pattern_id | uuid → dosage_patterns, nullable | |
| dosage_text_bn | text, nullable | snapshot of the label |
| meal_timing_id | uuid → meal_timings, nullable | |
| meal_timing_text_bn | text, nullable | snapshot |
| duration_option_id | uuid → duration_options, nullable | |
| duration_text_bn | text, nullable | snapshot |
| custom_instruction | text, nullable | any language |
| sort_order | integer default 0 | |

### `prescription_advice`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid → tenants | |
| prescription_id | uuid → prescriptions (cascade) | |
| advice_template_id | uuid → advice_templates, nullable | null = custom advice |
| text_bn | text | snapshot of the template text, or the custom text |
| sort_order | integer default 0 | |

### `doctor_prescription_templates`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid → tenants | |
| doctor_id | uuid → users | |
| name | text | e.g. "Post-extraction standard" |
| created_at, updated_at | timestamptz | |

### `doctor_prescription_template_items`
| id · tenant_id · template_id → doctor_prescription_templates (cascade) · medicine_id → medicines · dosage_pattern_id (nullable) · meal_timing_id (nullable) · duration_option_id (nullable) · custom_instruction (text, nullable) · sort_order |

### `doctor_prescription_template_advice`
| id · tenant_id · template_id → doctor_prescription_templates (cascade) · advice_template_id (nullable) · custom_text (text, nullable) · sort_order |

### `doctor_medicine_preferences` — PK (`doctor_id`, `medicine_id`)
Remembers each dentist's last instruction per medicine (prefill) and ranks search results.
| Column | Type | Notes |
|---|---|---|
| tenant_id | uuid → tenants | |
| doctor_id | uuid → users | |
| medicine_id | uuid → medicines | |
| dosage_pattern_id | uuid, nullable | |
| meal_timing_id | uuid, nullable | |
| duration_option_id | uuid, nullable | |
| custom_instruction | text, nullable | |
| use_count | integer default 0 | |
| last_used_at | timestamptz | |

---

## 10. Billing (clinic ↔ patient — separate from platform billing)

### `invoices`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid → tenants | |
| invoice_code | text, nullable | `INV-{SHORT}-{seq6}`, assigned at finalize; partial unique (§12) |
| patient_id | uuid → patients | |
| appointment_id | uuid → appointments, nullable | |
| subtotal_bdt | integer | |
| discount_bdt | integer default 0 | |
| discount_percent | numeric(5,2), nullable | set when the discount was entered as a percentage |
| total_bdt | integer | `subtotal − discount` |
| paid_bdt | integer default 0 | sum of non-deleted payments, updated in the same transaction |
| status | invoice_status default `draft` | |
| void_reason | text, nullable | |
| voided_by | uuid → users, nullable | |
| voided_at | timestamptz, nullable | |
| finalized_at | timestamptz, nullable | |
| last_reminder_sent_at | timestamptz, nullable | limits "Send reminder" to once a day |
| created_by | uuid → users | |
| created_at, updated_at | timestamptz | |

### `invoice_items`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid → tenants | |
| invoice_id | uuid → invoices (cascade) | |
| service_id | uuid → services, nullable | null = custom line |
| description | text | |
| tooth_codes | text[] default `'{}'` | |
| quantity | integer default 1 | check > 0 |
| unit_price_bdt | integer | |
| total_bdt | integer | quantity × unit price |
| sort_order | integer default 0 | |

### `payments`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid → tenants | |
| invoice_id | uuid → invoices | |
| amount_bdt | integer | check > 0; ≤ balance (app-validated in the transaction) |
| method | payment_method | |
| transaction_ref | text, nullable | |
| received_by | uuid → users | |
| paid_at | timestamptz | |
| note | text, nullable | |
| deleted_at | timestamptz, nullable | same-day deletion by Tenant Admin |
| deleted_by | uuid → users, nullable | |
| delete_reason | text, nullable | |
| created_at | timestamptz | |

---

## 11. Files, notifications, email, rate limits, audit

### `attachments`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid → tenants | |
| patient_id | uuid → patients | |
| kind | attachment_kind | |
| title | text, nullable | |
| report_code | text, nullable | `RPT-{SHORT}-{seq6}` for kind `report`; partial unique (§12) |
| prescription_id | uuid → prescriptions, nullable | when uploaded from the prescription screen |
| s3_key | text | never store full URLs |
| content_type | text | |
| size_bytes | integer | |
| uploaded_by | uuid → users | |
| uploaded_at | timestamptz | |
| deleted_at | timestamptz, nullable | |
| deleted_by | uuid → users, nullable | |

### `notifications` (in-app; one row per recipient user)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid → users | |
| tenant_id | uuid → tenants, nullable | null for Super Admin notifications |
| type | text | `broadcast`, `online_booking`, `subscription_due`, `subscription_overdue`, `email_failed` |
| title | text | |
| body | text | |
| link | text, nullable | in-app path |
| broadcast_id | uuid → platform_broadcasts, nullable | |
| read_at | timestamptz, nullable | also means "banner dismissed" |
| created_at | timestamptz | |

### `email_queue`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid → tenants, nullable | null for platform emails |
| to_email | text | |
| subject | text | |
| template_key | text | `PROJECT.md` §8.2 |
| payload | jsonb | template data |
| status | email_status default `pending` | |
| attempts | integer default 0 | max 5 |
| last_error | text, nullable | |
| dedupe_key | text, nullable, **unique** | e.g. `reminder24:{appointmentId}` |
| next_attempt_at | timestamptz default now() | backoff 1 / 5 / 15 / 60 min |
| sent_at | timestamptz, nullable | |
| created_at | timestamptz | |

### `rate_limits` (public booking; login uses Better Auth's own limiter)
| Column | Type | Notes |
|---|---|---|
| key | text PK | e.g. `slots:ip:203.0.113.5`, `book:ip:…` |
| window_start | timestamptz | fixed window |
| count | integer | |

### `audit_logs`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid → tenants, nullable | null for platform-level actions |
| actor_id | uuid → users, nullable | null = system job or public visitor |
| action | text | dotted verb, e.g. `tenant.suspend`, `payment.delete`, `prescription.allergy_override` |
| entity_type | text | |
| entity_id | uuid, nullable | |
| before | jsonb, nullable | |
| after | jsonb, nullable | |
| ip | text, nullable | |
| created_at | timestamptz | |

---

## 12. Custom SQL migration

Create with `drizzle-kit generate --custom`. Checks and partial indexes may instead be declared in Drizzle (`check()`, `uniqueIndex().where()`) — preferred where supported. The extensions and the exclusion constraint must be raw SQL.

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- No two active appointments for the same dentist may overlap (final guard against race conditions)
ALTER TABLE appointments ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    doctor_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  ) WHERE (status IN ('pending', 'confirmed') AND NOT is_overbooked);

-- Checks
ALTER TABLE users ADD CONSTRAINT users_tenant_role_chk
  CHECK ((role = 'SUPER_ADMIN') = (tenant_id IS NULL));
ALTER TABLE users ADD CONSTRAINT users_doctor_flag_chk
  CHECK (role <> 'DOCTOR' OR is_doctor);
ALTER TABLE tenants ADD CONSTRAINT tenants_card_len_chk
  CHECK (patient_id_min_len >= 10 AND patient_id_max_len <= 16 AND patient_id_min_len <= patient_id_max_len);
ALTER TABLE tenants ADD CONSTRAINT tenants_short_code_chk
  CHECK (short_code ~ '^[A-Z0-9]{2,6}$');
ALTER TABLE tenants ADD CONSTRAINT tenants_slug_chk
  CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE patients ADD CONSTRAINT patients_card_digits_chk
  CHECK (card_number ~ '^[0-9]{10,16}$');
ALTER TABLE appointments ADD CONSTRAINT appointments_time_chk
  CHECK (end_time > start_time);
ALTER TABLE appointments ADD CONSTRAINT appointments_patient_chk
  CHECK (patient_id IS NOT NULL OR (pending_patient_name IS NOT NULL AND pending_patient_phone IS NOT NULL));
ALTER TABLE appointments ADD CONSTRAINT appointments_confirmed_patient_chk
  CHECK (status NOT IN ('confirmed', 'completed', 'no_show') OR patient_id IS NOT NULL);
ALTER TABLE invoices ADD CONSTRAINT invoices_amounts_chk
  CHECK (total_bdt = subtotal_bdt - discount_bdt AND total_bdt >= 0 AND paid_bdt >= 0 AND paid_bdt <= total_bdt);
ALTER TABLE tenant_working_hours ADD CONSTRAINT twh_chk
  CHECK (weekday BETWEEN 0 AND 6 AND start_time < end_time);
ALTER TABLE doctor_schedules ADD CONSTRAINT ds_chk
  CHECK (weekday BETWEEN 0 AND 6 AND start_time < end_time);

-- Partial unique indexes
CREATE UNIQUE INDEX invoices_code_uq    ON invoices (tenant_id, invoice_code) WHERE invoice_code IS NOT NULL;
CREATE UNIQUE INDEX attachments_rpt_uq  ON attachments (tenant_id, report_code) WHERE report_code IS NOT NULL;
CREATE UNIQUE INDEX queue_serial_uq     ON queue_entries (tenant_id, date, serial_no) WHERE serial_no IS NOT NULL;
-- One per clinic catalog table (service_categories, services, medicines, dosage_patterns,
-- meal_timings, duration_options, advice_templates, quick_texts):
CREATE UNIQUE INDEX services_master_uq  ON services (tenant_id, master_id) WHERE master_id IS NOT NULL;

-- Fuzzy search
CREATE INDEX medicines_search_trgm ON medicines
  USING gin ((coalesce(brand_name, '') || ' ' || generic_name) gin_trgm_ops);
CREATE INDEX patients_name_trgm ON patients USING gin (name gin_trgm_ops);
```

---

## 13. Index checklist

- `tenant_id` on every tenant-scoped table, as the leading column of composite indexes.
- `users`: `email` unique; `(tenant_id, role)`.
- `patients`: `(tenant_id, card_number)` unique; `(tenant_id, phone)`; trigram on `name`.
- `appointments`: **`(doctor_id, start_time)`** — the slot engine's hot path; `(tenant_id, start_time)`; `(tenant_id, status)`; `(tenant_id, appointment_code)` unique.
- `queue_entries`: `(tenant_id, date, status)`; `appointment_id` unique.
- `prescriptions`: `(tenant_id, patient_id, created_at DESC)`; `(tenant_id, rx_code)` unique.
- `invoices`: `(tenant_id, status)`; `(tenant_id, patient_id)`.
- `payments`: `(tenant_id, paid_at)`; `(invoice_id)`.
- `attachments`: `(tenant_id, patient_id)`.
- `doctor_medicine_preferences`: `(doctor_id, use_count DESC)`.
- `notifications`: `(user_id, read_at)`.
- `email_queue`: `(status, next_attempt_at)`; `dedupe_key` unique.
- `audit_logs`: `(tenant_id, created_at DESC)`; `(entity_type, entity_id)`.
