# Master Implementation Plan: Oris EMR Multi-Tenant SaaS

**Oris EMR** is a multi-tenant SaaS EMR for dental chambers in Bangladesh. It features multi-tenant data isolation (`tenant_id`), role-based access control (Super Admin, Tenant Admin, Doctor, Receptionist), keyboard-driven patient card scanning, a high-performance slot engine with overbooking prevention, real-time Kanban patient queue with 5-second polling and Motion animations, ultra-fast prescription builder with Bangla instruction presets and allergy blocking, patient billing with whole-Taka calculations and thermal printing, S3/CloudFront medical file attachments, and asynchronous transactional email delivery.

This plan details the end-to-end execution of `PROJECT.md`, `DATABASE_SCHEMA.md`, and `SEED_DATA.md` following the strict phased build sequence in Section 16 of `PROJECT.md`.

---

## User Review Required & Required Keys

> [!IMPORTANT]
> ### Keys & Environment Variables Needed from You
> To deploy or run with full live cloud integrations, please provide the following keys in your `.env.local` (or we can scaffold placeholders / development defaults for any keys you don't have yet):
>
> 1. **Neon Serverless PostgreSQL Database** (Required for DB access):
>    - `DATABASE_URL`: Pooled connection string for the Next.js runtime (e.g. `postgresql://user:pass@ep-xyz-pooler.ap-southeast-1.aws.neon.tech/oris_emr?sslmode=require`)
>    - `DATABASE_URL_UNPOOLED`: Direct connection string for migrations (e.g. `postgresql://user:pass@ep-xyz.ap-southeast-1.aws.neon.tech/oris_emr?sslmode=require`)
>
> 2. **Authentication & App URLs** (Can use local defaults if testing locally):
>    - `BETTER_AUTH_SECRET`: 32+ character random secret (we can auto-generate this if you prefer)
>    - `BETTER_AUTH_URL`: e.g. `http://localhost:3000` (or production domain)
>    - `NEXT_PUBLIC_APP_URL`: e.g. `http://localhost:3000` (or production domain)
>
> 3. **AWS S3 & CloudFront (Medical Records, Photos, Signatures)**:
>    - `AWS_ACCESS_KEY_ID`: IAM user key with S3 access
>    - `AWS_SECRET_ACCESS_KEY`: IAM user secret
>    - `AWS_REGION`: Bucket region (e.g. `ap-southeast-1`)
>    - `S3_BUCKET_NAME`: Bucket name
>    - `NEXT_PUBLIC_CLOUDFRONT_DOMAIN`: e.g. `dxxxxxxxxxxxx.cloudfront.net`
>    - `CLOUDFRONT_KEY_PAIR_ID`: Public key ID in CloudFront trusted key group
>    - `CLOUDFRONT_PRIVATE_KEY`: CloudFront private key PEM string (newlines formatted as `\n`)
>    *(Note: We will build a defensive local fallback for file uploads so local development and testing never crash if AWS keys are not yet provided).*
>
> 4. **Mailcow SMTP Email Server**:
>    - `SMTP_HOST`: Mailcow host (e.g. `mail.yourdomain.com`)
>    - `SMTP_PORT`: e.g. `587` (STARTTLS) or `465` (TLS)
>    - `SMTP_SECURE`: `false` (for 587) or `true` (for 465)
>    - `SMTP_USER`: SMTP username
>    - `SMTP_PASSWORD`: SMTP password
>    - `SMTP_FROM_EMAIL`: Sender email (e.g. `noreply@orisemr.com`)
>    - `SMTP_FROM_NAME`: Sender display name (default: `Oris EMR`)
>    *(Note: The email queue table records all outgoing emails; if SMTP is absent during dev, emails remain queued and logged for review without throwing).*
>
> 5. **Vercel Scheduled Cron Jobs**:
>    - `CRON_SECRET`: Random bearer token for `/api/cron/*` endpoints (can be auto-generated for dev).
>
> 6. **Initial Super Admin Bootstrap Account**:
>    - `SEED_SUPER_ADMIN_NAME`: e.g. `Super Admin`
>    - `SEED_SUPER_ADMIN_EMAIL`: e.g. `admin@orisemr.com`
>    - `SEED_SUPER_ADMIN_PASSWORD`: initial password for first login.

---

## Open Questions

> [!NOTE]
> 1. Do you currently have a Neon Postgres instance ready with connection strings, or would you like us to configure the codebase with standard Postgres/Neon connection strings so you can plug your credentials into `.env.local`?
> 2. Should we proceed with Phase 1 MVP (foundation through dashboards) and Phase 2 features (public booking page, embed widget, cron endpoints) in this initial comprehensive build? (Recommended: Yes, build the full unified application).

---

## Architecture & Design Guidelines

1. **Multi-Tenancy Isolation (`lib/tenant-scope.ts`)**:
   - Every tenant query/mutation must be wrapped through `tenantScope()`.
   - Never accept `tenant_id` from client payloads.
   - Any query attempting to access a foreign tenant's record will throw a strict **404 Not Found**, never 403.
2. **Design Tokens & High-End Aesthetic (`PROJECT.md` §11 & Global Rules)**:
   - Base style: Minimal, fast, data-first.
   - Floating layers: Liquid Glass (sticky top bar, command palette, dialogs, toasts, dragged queue cards, public booking header).
   - Flat surfaces for high-density clinical tools (prescriptions, tooth chart, billing, tables).
   - Colors: `ink` (`#1C1C1E`), `paper` (`#FFFFFF`), `mist` (`#F4F4F5`), `ash` (`#6B7280`), `line` (`#E4E4E7`), `signal` (`#2A5CAA`), `signal-tint` (`#E8EEF7`), `success` (`#30D158`), `warning` (`#FF9F0A`), `danger` (`#FF453A`).
   - Typography: Inter for Latin, Noto Sans Bengali for Bangla, JetBrains Mono for record codes.
3. **Defensive Engineering**:
   - Hydration safety on date/time rendering (Asia/Dhaka time zone formatting using `date-fns-tz`).
   - Safe parsing of money in integer whole Taka (`_bdt`).
   - Barcode burst keystroke protection (35ms threshold, 100ms reset) preserving focused input values.
   - Database transactions for all composite operations (clinic creation + master data copy, appointment slot booking + overlap check + queue creation, counter increment + code generation, payment + invoice status update).

---

## Proposed Changes & Phased Build Sequence

### Phase 1: Foundation & Infrastructure Setup

Scaffold Next.js 16 App Router, TypeScript strict, pnpm, Tailwind CSS v4, shadcn/ui primitives, Motion (`motion/react`), lucide-react, TanStack Query, TanStack Table, cmdk, sonner, and date-fns v4.

#### [NEW] `package.json`
- Next.js 16, React 19, TypeScript
- Better Auth with Drizzle adapter
- Drizzle ORM, `drizzle-orm/neon-serverless`, `drizzle-kit`
- `motion`, `lucide-react`, `clsx`, `tailwind-merge`
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- `react-hook-form`, `@hookform/resolvers`, `zod`
- `@tanstack/react-query`, `@tanstack/react-table`
- `cmdk`, `sonner`, `recharts`
- `date-fns`, `@date-fns/tz`
- `nodemailer`, `@aws-sdk/client-s3`, `@aws-sdk/s3-presigned-post`, `@aws-sdk/cloudfront-signer`
- `jsbarcode`, `react-webcam`, `browser-image-compression`
- Vitest, Playwright

#### [NEW] `lib/env.ts`
- Strict Zod schema validating server and public env vars, with helpful error messages.

#### [NEW] `app/globals.css` & `app/layout.tsx`
- Setup design system CSS variables (`--ink`, `--paper`, `--mist`, `--ash`, `--line`, `--signal`, etc.), Liquid Glass utility classes, print CSS `@media print` rules, and typography font configurations (`Inter`, `Noto Sans Bengali`).

---

### Phase 2: Database Schema, Migrations & Master Seed

Implement all 27+ tables, enums, checks, indexes, and master seeding.

#### [NEW] `db/schema/*.ts` and `db/schema/index.ts`
- `enums.ts`: All 21 Postgres enums (`user_role`, `tenant_status`, `user_status`, `patient_id_mode`, `gender`, `appointment_status`, `appointment_source`, `queue_status`, `invoice_status`, `payment_method`, etc.).
- `auth.ts`: Better Auth tables (`users`, `sessions`, `accounts`, `verifications`) with custom user fields (`tenant_id`, `role`, `is_doctor`, `doctor_title`, `doctor_reg_no`, `signature_key`, etc.).
- `platform.ts`: `tenants`, `tenant_features`, `tenant_counters`, `platform_subscriptions`, `platform_payments`, `platform_broadcasts`.
- `clinic-config.ts`: `tenant_working_hours`, `doctor_schedules`, `closures`, `chairs`.
- `catalog.ts`: Master catalogs (`master_service_categories`, `master_services`, `master_medicines`, `master_dosage_patterns`, `master_meal_timings`, `master_duration_options`, `master_advice_templates`, `master_quick_texts`) and Clinic copies (`service_categories`, `services`, `medicines`, `dosage_patterns`, `meal_timings`, `duration_options`, `advice_templates`, `quick_texts`).
- `patients.ts`: `patients` table with medical conditions, allergy flags, and card number unique index.
- `appointments.ts`: `appointments`, `appointment_services`, `queue_entries`.
- `prescriptions.ts`: `prescriptions`, `prescription_items`, `prescription_advice`, `doctor_prescription_templates`, `doctor_prescription_template_items`, `doctor_prescription_template_advice`, `doctor_medicine_preferences`.
- `billing.ts`: `invoices`, `invoice_items`, `payments`.
- `files.ts`: `attachments`.
- `system.ts`: `notifications`, `email_queue`, `rate_limits`, `audit_logs`.

#### [NEW] `drizzle.config.ts`
- Configured with `casing: "snake_case"`, unpooled URL, and migrations output folder.

#### [NEW] `db/migrations/custom.sql`
- Custom SQL migration matching `DATABASE_SCHEMA.md` §12: `btree_gist`, `pg_trgm`, `appointments_no_overlap` GIST exclusion constraint, check constraints, partial unique indexes, and trigram indexes.

#### [NEW] `db/seed/master-data.ts`, `db/seed/seed.ts`, `db/seed/demo.ts`
- Fully typed master data from `SEED_DATA.md` (services, medicines with brand/generic rows, Bangla dosage patterns, Bangla meal timings, Bangla durations, grouped Bangla advice, English quick texts).
- Seed script with Super Admin bootstrap.
- Demo clinic seeder ("Demo Dental Care" with appointments, queue, patients, prescriptions, and billing).

#### [NEW] `lib/tenant-scope.ts`
- Centralized multi-tenant query filter and inserter enforcing session tenant isolation and returning 404 on cross-tenant probes.

---

### Phase 3: Better Auth, Sessions & Instant Access Control

#### [NEW] `lib/auth.ts` & `lib/auth-client.ts`
- Better Auth setup with Drizzle adapter and database sessions.
- Admin user creation and password reset handlers.

#### [NEW] `lib/session.ts`
- `requireSession()` validating session, user active status, tenant active status, roles, `is_doctor`, and enabled tenant features.

#### [NEW] `proxy.ts` (Next.js middleware)
- Routing enforcement: unauthenticated users redirected to `/login`, Super Admin redirected to `/platform`, Clinic staff redirected to `/app`.

#### [NEW] `app/(auth)/login/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`
- Sleek login interface with Liquid Glass card, rate limiting, and instant role-based redirects.

---

### Phase 4: Super Admin Panel (`/platform`)

#### [NEW] `app/(platform)/platform/page.tsx`
- Dashboard with active/suspended clinics, subscription due in 7 days, past-due count, MRR calculator, and failed-email indicators.

#### [NEW] `app/(platform)/platform/tenants/` & `tenants/new/`
- Clinic list with search, status filters, and subscription filters.
- **Create Clinic Wizard** (atomic transaction): clinic metadata, admin user (`is_doctor`), subscription plan, feature flags, and copy of all master catalog templates with `master_id` linkage.

#### [NEW] `app/(platform)/platform/tenants/[id]/`
- Clinic detail tabs: Overview (suspend/reactivate with audited reason), Staff management, Subscription & "Record payment", Feature flags, Audit logs.

#### [NEW] `app/(platform)/platform/subscriptions/`, `broadcasts/`, `catalog/`, `audit/`
- Platform subscription tracking and payment records.
- Broadcast creator (in-app banner + email queue to selected or all clinics).
- Master catalog editors (services, medicines, presets).

---

### Phase 5: Clinic Workspace Shell, Settings & Setup Checklist

#### [NEW] `app/(tenant)/app/layout.tsx`
- App shell with collapsible sidebar (Dashboard, Queue, Appointments, Patients, Billing, Reports, Settings), top glass bar with scanner listener, command palette trigger (`Ctrl+K`), notification bell, and user menu.

#### [NEW] `app/(tenant)/app/settings/`
- Setup checklist banner (profile, hours, doctor, prices, medicines, card mode, print settings, public booking).
- Settings sub-pages: Clinic Profile, Hours & Closures (split shifts per weekday), Staff (schedules, BMDC, signatures), Services, Medicines, Rx Presets (Bangla chips), Chairs, Patient Cards, Printing options, Public Booking, Features, Subscription.

---

### Phase 6: Patient Management, Card Barcodes & Hardware Scanner Listener

#### [NEW] `components/scan/ScanListener.tsx`
- Global keystroke burst listener (<35ms inter-character time, 100ms reset).
- Prevents code dumping into active text inputs; honors `data-scan-target` attributes.

#### [NEW] `lib/barcode/resolve-code.ts` & Command Palette (`components/palette/CommandPalette.tsx`)
- Server action parsing `APT-`, `RX-`, `INV-`, `RPT-`, and card numbers.
- Automatic check-in prompt when scanning a patient who has an appointment today.

#### [NEW] `app/(tenant)/app/patients/`
- Patient registration form with Pre-printed vs Auto-generated card modes, duplicate phone warning, and webcam/camera/file upload compression.
- Patient Profile (`/app/patients/[id]`): Allergy red chips, condition amber chips, Timeline feed (visits, prescriptions, invoices, attachments), Appointments tab, Rx tab, Billing tab, Files tab.
- Soft-delete handling.

---

### Phase 7: Appointments & Slot Engine

#### [NEW] `lib/scheduling/slot-engine.ts`
- Pure function calculating available slots based on doctor schedules or clinic hours, closures, existing busy intervals widened by `booking_buffer_minutes`, and step granularity.
- Handles single doctor selection or "Any available" load balancing.

#### [NEW] `tests/unit/slot-engine.test.ts`
- Vitest test suite executing the exact worked example from the specification (17:00–23:00, 30 min root canal, 10 min granularity).

#### [NEW] `app/(tenant)/app/appointments/`
- Staff booking modal/screen (`/app/appointments/new`), Day list view per dentist, overbooking override dialog (`is_overbooked = true`), rescheduling, cancellation with reason.

---

### Phase 8: Real-Time Kanban Queue (`/app/queue`)

#### [NEW] `app/(tenant)/app/queue/page.tsx` & `components/queue/QueueBoard.tsx`
- Columns: Booked, Waiting (with serial numbers), In Chair, Billing, Done, plus collapsed No-Show / Cancelled.
- Built with `dnd-kit` and Motion layout animations for card glides.
- Serial number counter (`SERIAL:{yyyy-mm-dd}`) on check-in.
- Dentist view filter ("My queue" + "Call next").
- TanStack Query 5-second polling + optimistic updates + conditional updates (`WHERE id = ? AND updated_at = ?`).

---

### Phase 9: Prescription Builder & Dental Workspace

#### [NEW] `app/(tenant)/app/prescriptions/new/page.tsx` & `components/prescription/`
- Ultra-fast 3-column workspace designed for sub-60-second completion.
- Left column: Patient summary, medical conditions, allergy alerts, past prescriptions with one-click "Copy".
- Middle column: Chief complaint, examination, diagnosis, investigations with quick-text chips; FDI tooth selector chart (permanent 11–48 and deciduous 51–85).
- Right column: Medicine search with frequency ranking, prefilled last-used instructions, Bangla dosage chips (`১+০+১`), Bangla meal timings, Bangla durations, grouped Bangla advice.
- Safety: Drug class allergy checker triggering `block` override dialog (with audit logging) or `caution` banner.
- Snapshot persistence on save (`medicine_line_snapshot`, Bangla texts) and code generation (`RX-{SHORT}-{seq6}`).

---

### Phase 10: Billing & Invoicing (Clinic ↔ Patient)

#### [NEW] `app/(tenant)/app/billing/` & `components/billing/`
- Draft invoice auto-creation upon moving queue card from "In Chair" to "Billing".
- Item editor (services, teeth, quantity, unit price, taka or percentage discount).
- Finalize invoice (`INV-{SHORT}-{seq6}`).
- Record payment dialog (cash, card, bKash, Nagad, Rocket, bank transfer) supporting multiple partial payments.
- Tenant Admin same-day payment deletion and invoice voiding with audit log.
- Outstanding Dues list (`/app/billing/dues`) with daily reminder rate-limiting.
- Today's Cash & Digital Collection reconciliation widget.

---

### Phase 11: Dedicated HTML Print Views

#### [NEW] `app/(print)/print/`
- Flat, high-contrast, pure CSS `@media print` layouts.
- `prescription/[id]`: Letterhead or blank top margin for pre-printed pads, doctor BMDC reg, patient header, FDI teeth, Rx items, Bangla advice bullets, QR/barcode.
- `invoice/[id]`: Clinic header, INV barcode, line items, subtotal, discount, paid amount, due balance, payment breakdown.
- `card/[patientId]`: CR80 format (85.6 × 54 mm) with patient details and Code128 card barcode.
- `label/[attachmentId]`: 50 × 25 mm thermal sticker with RPT barcode.

---

### Phase 12: File Management, Medical Images & S3/CloudFront

#### [NEW] `lib/s3.ts` & `app/api/uploads/`
- Presigned POST generation with file size (max 15MB) and mime-type restrictions.
- Confirmation handler inserting `attachments` records and generating `RPT-{SHORT}-{seq6}` codes for reports.
- CloudFront signed URL issuance with 1-hour expiry.
- Lightbox viewer supporting zoom, pan, and inline PDF preview.

---

### Phase 13: Transactional Email Queue & Scheduled Jobs

#### [NEW] `lib/mailer.ts`, `lib/email-queue.ts`, `emails/*.tsx`
- Mailcow SMTP transport via Nodemailer.
- Asynchronous queuing with `after()` post-response triggers.
- Deduplication keys (`dedupe_key`) preventing repeated notifications.
- React Email templates for all specified events (`tenant_welcome`, `staff_invite`, `appointment_confirmed`, `appointment_cancelled`, `payment_received`, `payment_due`).

#### [NEW] `app/api/cron/` & `vercel.json`
- `/api/cron/email-queue`: Every minute retry loop with exponential backoff.
- `/api/cron/reminders`: 15-minute sweep queuing 24h and 2h reminder emails.
- `/api/cron/daily`: Midnight sweep marking yesterday's booked as no-shows, cancelling expired pending bookings, and flagging past-due subscriptions.
- Authenticated via `Authorization: Bearer $CRON_SECRET`.

---

### Phase 14: Public Booking & Embed Widget

#### [NEW] `app/book/[tenantSlug]/page.tsx` & `public/widget.js`
- Mobile-first public booking flow: service selection, dentist choice, slot grid lookup, patient verification (existing card+phone vs new patient), confirmation.
- Rate limiting (60 slot lookups/min, 5 bookings/hr per IP, honeypot spam protection).
- Standalone `<script src="/widget.js">` modal overlay handler.

---

## Verification Plan

### Automated Unit & Integration Tests (Vitest)
1. **Slot Engine Unit Tests**:
   - Run `pnpm test tests/unit/slot-engine.test.ts`
   - Test buffer spacing, split shifts, dentist schedules overriding clinic hours, closures, "any dentist" load balancing, and concurrent slot exclusion.
2. **Code Generator & Formatting Tests**:
   - Run `pnpm test tests/unit/codes.test.ts`
   - Verify `APT-`, `RX-`, `INV-`, `RPT-` formats and `AUTO_GENERATE` card numbers (e.g. `1000000001`).
3. **Clinical Allergy Checker Tests**:
   - Run `pnpm test tests/unit/allergy-rules.test.ts`
   - Verify Penicillin block, Cephalosporin caution cross-allergy, NSAID block, and Chlorhexidine block.
4. **Bangladeshi Phone Normalization & Currency Formatting Tests**:
   - Run `pnpm test tests/unit/utils.test.ts`
   - Verify Bangladeshi mobile number normalization (accepts `+8801...`, `8801...`, `01...`, validates strict Bangladeshi mobile regex `^01[3-9]\d{8}$` for GP, Robi, Banglalink, Teletalk, etc., storing as 11-digit `01XXXXXXXXX`).
   - Verify whole-taka currency formatting (`৳1,500`, `৳1,00,000`).

### End-to-End Golden Path Verification (Playwright)
1. **Super Admin Flow**: Create clinic, verify master catalog clone, verify subscription row creation, verify admin invite generation.
2. **Clinical Day Flow**: Register patient with card number, book appointment, scan barcode to check in, advance queue to "In Chair", author 4-medicine Rx with Bangla presets in under 60 seconds, move to Billing, generate draft invoice, record partial payment, verify balance in Dues list.
3. **Multi-Tenancy Isolation Test**: Attempt accessing Clinic A's invoice with Clinic B's session and verify strict 404 response.
