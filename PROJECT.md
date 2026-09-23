# Oris EMR — Master Project Specification

**Version:** 2.0 (final for build) · **Date:** 2026-09-23
**Companion files:** `CLAUDE.md` · `DATABASE_SCHEMA.md` · `SEED_DATA.md`

---

## 0. How to use these documents (AI agent: read this first)

You are building **Oris EMR**, a multi-tenant SaaS EMR for dental chambers in Bangladesh.

| File | What it is |
|---|---|
| `CLAUDE.md` | Short standing rules, loaded automatically every session |
| `PROJECT.md` (this file) | What to build and exactly how it must behave |
| `DATABASE_SCHEMA.md` | Contract for every table, column, enum and constraint — names are final |
| `SEED_DATA.md` | Master data copied into every new clinic, plus bootstrap and demo seeding |
| `DECISIONS.md` | Created and maintained by you (rule 4) |

1. Read this file completely, then `DATABASE_SCHEMA.md`, then `SEED_DATA.md`, before writing any code.
2. Build in the order given in **Section 16**. Finish each step end-to-end (schema → server → UI → tests) before starting the next.
3. **Section 17** is the decisions log. Every entry is final — implement as written.
4. If you hit something not covered anywhere: pick the smallest reasonable option, append it to `DECISIONS.md` (date, decision, reason), and keep going. Do not stall waiting for clarification.
5. Conflicts: `DATABASE_SCHEMA.md` wins on names and types; this file wins on behavior. Log any conflict you find in `DECISIONS.md`.
6. **Section 18** maps every requirement from the original product brief to where it is specified. Use it as the final acceptance checklist.

---

## 1. Product overview

**Oris EMR** is a multi-tenant SaaS for dental chambers: patient records, appointments, a live patient queue, fast digital prescriptions, billing and automatic emails. One Next.js application and one database serve many clinics ("tenants").

| Who | What they do |
|---|---|
| **Super Admin** (product owner) | Runs the SaaS: creates clinics, manages any clinic's users, turns access on/off, records platform subscription payments, controls which features each clinic's plan includes, broadcasts notifications, curates the master catalogs new clinics start with |
| **Tenant Admin** | Clinic owner/manager: clinic profile, hours, staff and roles, services and prices, medicine list, prescription presets, feature toggles. Often also a practising dentist (`is_doctor`, §4.1) |
| **Doctor** | Sees the queue, reads patient history, writes prescriptions, can take payments |
| **Receptionist** | Registers patients, books appointments, runs the queue, takes payments, prints |
| **Patient** (public, no login) | Books from the clinic's own website; receives emails |

**The daily flow the product must make fast:**
Patient arrives → card scanned → checked in with a serial number → waiting → in chair (dentist sees full history and writes the prescription in under a minute) → billing (invoice built automatically from the services done, payment recorded) → done. Emails go out automatically at booking, before the visit and after payment.

**Market specifics:** Bangladesh. Currency BDT (৳). App UI in English. Prescription instruction presets and advice in Bangla (§10).

---

## 2. Tech stack (locked — log a reason in `DECISIONS.md` before substituting anything)

| Concern | Choice |
|---|---|
| Framework | Next.js, latest stable (16.x at time of writing), App Router, TypeScript `strict`, Server Components + Server Actions |
| Package manager | pnpm |
| Database | Neon (serverless Postgres), same region as the Vercel functions (§14) |
| ORM / migrations | Drizzle ORM + drizzle-kit, `casing: "snake_case"` (driver: §3.6) |
| Hosting | Vercel **Pro** (required for commercial use and per-minute cron jobs; Hobby only allows daily crons) |
| Auth | Better Auth — email & password, database sessions, Drizzle adapter (§3.2) |
| Styling / components | Tailwind CSS v4 + shadcn/ui, lucide-react icons |
| Animation | Motion (formerly Framer Motion; package `motion`, import from `motion/react`) |
| Drag and drop | dnd-kit |
| Forms / validation | React Hook Form + Zod (the same Zod schemas validate on client and server) |
| Client data / polling | TanStack Query |
| Tables | TanStack Table |
| Command palette | cmdk (via shadcn `Command`) |
| Toasts | sonner |
| Charts | Recharts |
| Dates / time zones | date-fns v4 + `@date-fns/tz` |
| Email | Nodemailer (SMTP → self-hosted Mailcow) + React Email templates |
| Barcode rendering | JsBarcode (Code128, SVG output) |
| Barcode scanning by camera | Native `BarcodeDetector` where available, fallback `@zxing/browser` |
| Camera capture | `react-webcam` (desktop webcam); `<input type="file" accept="image/*" capture>` (phones/tablets) |
| Image compression | `browser-image-compression` (client-side, before upload) |
| Printing | Browser printing of dedicated HTML print routes (§7) — no PDF library in MVP |
| AWS | `@aws-sdk/client-s3`, `@aws-sdk/s3-presigned-post`, `@aws-sdk/cloudfront-signer` |
| Testing | Vitest (unit and integration), Playwright (end-to-end) |

---

## 3. Architecture

### 3.1 Multi-tenancy

**Shared database, shared schema, row-level isolation by `tenant_id`.** Every tenant-owned table has a non-null, indexed `tenant_id` (full list: `DATABASE_SCHEMA.md` §1).

Hard rules:
- All tenant data access goes through one helper, `lib/tenant-scope.ts`. It takes the tenant ID from the authenticated session and adds `tenant_id = …` to every select/update/delete and sets it on every insert. Feature code never queries a tenant table without it.
- Never accept `tenant_id` from a request body, query string or form field. It comes from the session — or, on public routes only, from the clinic slug in the URL (§5.9).
- Requesting a record by ID that belongs to another tenant returns **404**, never 403, so its existence isn't leaked.
- Super Admin code under `/platform` reads across tenants only through explicit platform functions (`lib/platform/*`), never by bypassing the helper from tenant routes.

### 3.2 Authentication and the single login

- Exactly one login page, `/login` (email + password), for every user type. There is **no public sign-up** — users are only created server-side by a Super Admin or Tenant Admin.
- Library: **Better Auth** with the Drizzle adapter and **database sessions**. The auth tables (`users`, `sessions`, `accounts`, `verifications`) come from Better Auth's schema generator, extended with the user fields in `DATABASE_SCHEMA.md` §3. Configure Better Auth to generate UUID IDs so every foreign key is `uuid`.
- Why not Auth.js: its email/password (Credentials) provider only works with JWT sessions, and a JWT can't be revoked the moment a clinic is switched off (§3.3).
- **New user flow:** an admin creates the user (random unusable password) → the system emails a "Set your password" link using Better Auth's reset-password flow (valid 72 hours) → the user sets a password → `email_verified = true`. Create users through Better Auth's server-side API (e.g. the admin plugin's `createUser`). If you use the admin plugin, its `role` field must hold our `user_role` values — never keep two role columns.
- **Forgot password:** link on `/login`, same flow, link valid 1 hour.
- **Sessions:** expire after 12 hours, sliding (refreshed while active). Disable Better Auth's cookie cache (or cap it at 60 seconds) so revoking a session takes effect immediately.
- **Login rate limiting:** Better Auth's built-in limiter with **database** storage (serverless instances share no memory). Lock an account for 15 minutes after 5 failed attempts.
- **After login**, redirect by role: `SUPER_ADMIN` → `/platform`; `TENANT_ADMIN`, `DOCTOR`, `RECEPTIONIST` → `/app`.
- **`requireSession()`** (`lib/session.ts`) is the one real gate. Every protected layout, page, server action and route handler calls it. It loads the session → loads the user **and** their tenant fresh from the database → rejects if the user is `disabled` or the tenant is `suspended` → checks the required role/permission → returns `{ user, tenant, role, isDoctor, features }`.
- `proxy.ts` (Next.js 16; named `middleware.ts` on Next.js 15) only does cheap routing: no session cookie → `/login`; wrong area (`/platform` vs `/app`) → redirect. It is never the only check.
- The Super Admin account is created by the seed script from env vars (`SEED_DATA.md` §9). TOTP two-factor login for the Super Admin is Phase 2 (Better Auth `twoFactor` plugin).

### 3.3 Instant access control (on/off)

- **Suspend a clinic** (Super Admin): set `tenants.status = suspended` → delete every session belonging to that clinic's users → write an audit entry → queue a `tenant_suspended` email to the clinic's admins. On their next request, staff land on `/login` with: "Access to this clinic is currently disabled. Please contact Oris EMR support." The public booking page shows "Online booking is currently unavailable." No data is deleted.
- **Reactivate:** set `active`, queue `tenant_reactivated`. Users just log in again.
- **Disable one user** (Super Admin or Tenant Admin): same pattern for a single user.
- `requireSession()` checks both statuses on every request, so even a session created a moment before suspension is refused.

### 3.4 Two separate money flows — never mix them

| | Platform billing | Clinic billing |
|---|---|---|
| Who pays whom | Clinic pays **you** for Oris EMR | Patient pays the **clinic** for treatment |
| Tables | `platform_subscriptions`, `platform_payments` | `invoices`, `invoice_items`, `payments` |
| Managed from | Super Admin panel (`/platform`) | Clinic workspace (`/app`) |
| Recorded by | Super Admin | Receptionist, dentist or Tenant Admin |

No shared tables, components or screens between the two.

### 3.5 Appointments vs. queue — related but separate

- **Appointment** = the plan: patient, dentist, service(s), approximate start and end time. Made in advance by staff or by the patient online, or on the spot for a walk-in.
- **Queue entry** = what actually happens on the day: booked → waiting → in chair → billing → done. Staff drag it around because real life doesn't follow the schedule.
- Every **confirmed** appointment has exactly one queue entry, created in the same transaction, with `date` = the appointment's Dhaka calendar date. Rescheduling moves the queue entry's date; cancelling marks it `cancelled`.
- A **walk-in** is created as an appointment with `source = walk_in` and start time = now, plus a queue entry that starts in `waiting`. One uniform model: services, dentist and invoice work the same way, and walk-ins are visible to the slot engine.
- Pending online bookings from new patients (§5.9) get their queue entry only when staff confirm them.

### 3.6 Database access and transactions

- Driver: `drizzle-orm/neon-serverless` (Neon `Pool` over WebSockets), which supports interactive transactions. **Do not use `drizzle-orm/neon-http`** for anything that needs `db.transaction()`. Follow Neon's current guidance for pool lifecycle inside Vercel functions.
- All database code runs on the Node.js runtime (no Edge runtime for anything that touches the DB).
- Migrations use the **unpooled** connection string (`DATABASE_URL_UNPOOLED`); the app uses the pooled one (`DATABASE_URL`).
- These operations must each be a single transaction:
  - Clinic creation + master data copy + counters + features + subscription + admin user.
  - Booking or rescheduling an appointment (overlap re-check + write + queue entry).
  - Generating any code from `tenant_counters` (§6.1) together with the row that uses it.
  - Recording or deleting a payment together with updating `invoices.paid_bdt` and `status`.
  - Queue transitions that create records (moving to Billing creates the draft invoice).
- Postgres features used: the `btree_gist` and `pg_trgm` extensions, an exclusion constraint on appointments, check constraints, partial unique indexes. Whatever Drizzle can't express goes in a custom SQL migration (`drizzle-kit generate --custom`) — see `DATABASE_SCHEMA.md` §12.

### 3.7 Conventions

| Topic | Rule |
|---|---|
| IDs | `uuid` everywhere |
| Time storage | `timestamptz`, UTC |
| Business time zone | **Asia/Dhaka** (UTC+6, no daylight saving) for everything user-facing: working hours, slots, "today", queue dates, reminders, reports. `time` columns are Dhaka wall-clock times; `date` columns are Dhaka calendar dates. |
| Money | Integer **whole taka**; columns end in `_bdt`. Percentage discounts round to the nearest taka (half up). Display `৳1,500`, using `Intl.NumberFormat('en-IN')` grouping so large amounts read `৳1,00,000`. |
| Phone numbers | Store Bangladeshi mobiles normalized as `01XXXXXXXXX`. Accept `+8801…` / `8801…` input and normalize. Validate `^01[3-9]\d{8}$`. The clinic's own phone field is free text. |
| Record codes | `{PREFIX}-{SHORT_CODE}-{SEQ}` with a 6-digit zero-padded per-clinic sequence, e.g. `INV-DDC-000123` (§6.1) |
| Deleting | Patients and files are soft-deleted (`deleted_at`); appointments are cancelled; invoices are voided. Clinical and financial records are never hard-deleted. |

---

## 4. Roles, permissions and feature flags

### 4.1 Roles

Four fixed roles in MVP: `SUPER_ADMIN`, `TENANT_ADMIN`, `DOCTOR`, `RECEPTIONIST`.

Separately, every clinic user has an **`is_doctor`** flag. It controls clinical ability (writing prescriptions, having a schedule, being bookable), while the role controls access. This covers the very common solo chamber where the owner is both admin and dentist: `role = TENANT_ADMIN`, `is_doctor = true`. A `DOCTOR` always has `is_doctor = true`. A clinic needs at least one active `is_doctor` user before appointments can be booked.

In this document "dentist" means any user with `is_doctor = true`.

### 4.2 Permission matrix

| Capability | Super Admin | Tenant Admin | Doctor | Receptionist |
|---|---|---|---|---|
| Create / edit / suspend clinics | ✅ | — | — | — |
| Manage any clinic's staff (add, change role / `is_doctor`, disable, resend invite) | ✅ | own clinic | — | — |
| Platform subscription and payments | ✅ | view own | — | — |
| Plan feature flags (what a clinic may use) | ✅ | — | — | — |
| Turn allowed features on/off for the clinic | — | ✅ | — | — |
| Broadcast notifications | ✅ | — | — | — |
| Master catalogs (templates for new clinics) | ✅ | — | — | — |
| Clinic settings: profile, hours, closures, chairs, services, medicines, prescription presets, printing, public booking | — | ✅ | — | — |
| Register / edit patients | — | ✅ | ✅ | ✅ |
| Soft-delete patients | — | ✅ | — | — |
| Book / reschedule / cancel appointments; confirm online bookings | — | ✅ | ✅ | ✅ |
| Run the queue | — | ✅ | ✅ (own patients) | ✅ |
| Write / edit prescriptions | — | if `is_doctor` | ✅ | — |
| View and reprint prescriptions | — | ✅ | ✅ | ✅ (read-only) |
| View clinical notes and full history | — | if `is_doctor` | ✅ | — (sees visits, prescriptions, invoices, files) |
| Create invoices, record payments | — | ✅ | ✅ | ✅ |
| Void invoices, delete same-day payments | — | ✅ | — | — |
| Clinic reports and financials | — | ✅ | own stats | today's collection only |
| Upload / view patient files | — | ✅ | ✅ | ✅ |

Implement as `can(user, capability)` in `lib/permissions.ts`, used by the UI (hide/disable) and the server (enforce). The server check is the one that matters. A custom per-clinic role builder is Phase 3.

### 4.3 Feature flags

Each clinic has one `tenant_features` row per feature with two switches: `platform_enabled` (Super Admin — "is it in their plan?") and `tenant_enabled` (Tenant Admin — "do we want it on?"). A feature is active only when both are true.

| `feature_key` | Controls |
|---|---|
| `public_booking` | `/book/[slug]` page, embed widget, public API |
| `email_notifications` | All patient-facing emails (staff and system emails always send) |
| `billing` | Invoices, payments, dues, the Billing column on the queue |
| `reports` | Clinic reports page |
| `camera_scan` | Scanning barcodes with a phone/tablet camera |

Core modules (patients, appointments, queue, prescriptions, files) are always on. Features the plan doesn't include show as locked ("Not included in your plan") in clinic settings. The server checks `features` from `requireSession()`, not only the UI.

---

## 5. Module specifications

### 5.1 Super Admin panel (`/platform`)

**Dashboard:** clinics (active / suspended), subscriptions due in the next 7 days, past-due count, monthly recurring revenue (yearly plans ÷ 12), newest clinics, failed-email count.

**Clinics**
- List with search and status / subscription filters.
- **Create clinic wizard** (one transaction, §3.6):
  1. Clinic: name, slug (lowercase letters, digits, hyphens; unique; used in `/book/{slug}`), short code (2–6 uppercase letters/digits; unique; used in record codes), phone, email, address.
  2. Admin: name, email, phone, "Also a practising dentist" (`is_doctor`).
  3. Plan: plan name, price (BDT), cycle (monthly / yearly), start date, optional trial end date.
  4. Features: toggles for §4.3 (default all on).
  - On submit: create clinic → copy master catalogs (`SEED_DATA.md` §0) → create counters and feature rows → create subscription → create admin user → queue `tenant_welcome` email with set-password link → audit entry.
- **Clinic detail** tabs:
  - **Overview:** profile, status, suspend/reactivate (reason required).
  - **Staff:** full user management for that clinic — add, edit, change role / `is_doctor`, disable/enable, resend set-password email. No impersonation.
  - **Subscription:** plan, period, status, payment history, "Record payment".
  - **Features:** plan switches.
  - **Audit:** that clinic's audit entries.

**Subscriptions and platform payments**
- "Record payment": amount, method, transaction reference, date, note → inserts `platform_payments` → advances the period by one cycle → status `active`.
- The daily job (§8.3) sets `past_due` once `current_period_end` has passed and queues due-soon / overdue emails. **No automatic suspension** — the Super Admin decides.
- Tenant Admins see a banner: amber from 3 days before the due date, red once past due.

**Broadcasts:** title + body (plain text, line breaks kept), target (all clinics / selected clinics / selected users), audience (clinic admins only / all staff), channels (in-app banner and/or email). On send: resolve recipients → insert `notifications` rows (in-app) and `email_queue` rows (email) → set `sent_at` and `recipient_count`. Sent broadcasts are listed with their recipient counts.

**Master catalogs:** edit the template lists new clinics receive — service categories, services, medicines, dosage patterns, meal timings, durations, advice templates, quick texts. "Push new items to existing clinics" (Phase 2) copies only master rows a clinic doesn't have yet (matched by `master_id`) and never overwrites a clinic's own edits.

**Email monitor** (Phase 2): pending/failed `email_queue` rows with the error text and a Retry button.

**Audit log:** filterable list of all audit entries.

### 5.2 Clinic onboarding and settings (`/app/settings`)

Until complete, the clinic dashboard shows a **setup checklist**:
1. Clinic profile and logo.
2. Working hours.
3. At least one dentist (`is_doctor`) — the admin can tick it on for themselves.
4. Service prices reviewed (services priced 0 are flagged).
5. Medicine list reviewed.
6. Patient card mode chosen.
7. Print settings checked with a test print.
8. Public booking link copied (if the feature is on).

| Settings page | Contents |
|---|---|
| Clinic | Name, logo, address, phone, email (used as Reply-To on patient emails), brand color (public booking page) |
| Hours & closures | Weekly working hours — **several time ranges per day allowed** (e.g. 10:00–13:00 and 17:00–23:00); a day with no ranges is closed. Closures: dates when the whole clinic or one dentist is off (holidays, leave). |
| Staff | Add/edit users (name, email, phone, role, `is_doctor`). For dentists: title, degrees, specialty, BMDC registration number, signature image, calendar color, and an optional **personal weekly schedule** (if empty, the dentist follows clinic hours). |
| Services | Seeded list: edit name, category, duration, price, "bookable online", active; add custom; drag to reorder |
| Medicines | Seeded list: edit, deactivate, add custom (brand, generic, strength, form, drug class); optional default instruction (dosage / meal timing / duration) per medicine |
| Prescription presets | Dosage patterns, meal timings, durations, advice templates (grouped), quick texts — edit, reorder, deactivate, add custom (Bangla typed with any Bangla keyboard) |
| Chairs | Name, active, order (one chair by default) |
| Patient cards | Mode `PRE_PRINTED` / `AUTO_GENERATE`; allowed length range (default 10–16) |
| Printing | Prescription paper (A4/A5); print letterhead yes/no plus top margin in mm for pre-printed pads; invoice paper (A4 / A5 / 80 mm thermal) |
| Public booking | Link and embed snippet, days ahead (default 30), minimum notice (default 60 min), auto-confirm existing patients (default on), 24 h / 2 h reminders on/off |
| Features | Toggle the features the plan allows |
| Subscription | Read-only: plan, status, next due date, payment history |

Catalog rule: anything referenced by existing records is never hard-deleted, only deactivated (hidden from pickers, still shown on old records). Every clinic catalog row keeps `source` (`master` / `custom`) and `master_id`.

### 5.3 Patient management

**Registration form** (one screen, keyboard-friendly):
- Card number — see card modes below. The field is a scan target (§6.2).
- Name\*, phone\* (normalized), email (optional; needed for email notifications), date of birth **or** approximate age, gender\*, blood group, address, emergency contact name and phone.
- Medical conditions and allergy flags as multi-select chips (`SEED_DATA.md` §8), plus free-text notes.
- Photo (below).

**Card modes**
- `PRE_PRINTED`: staff scan or type the number printed on the physical card they hand the patient. Digits only, within the clinic's length range, unique within the clinic.
- `AUTO_GENERATE`: the system assigns the next number from the `CARD` counter, formatted as `1` followed by the counter zero-padded to (minimum length − 1) digits (10 digits → `1000000001`, `1000000002`, …), skipping any number already in use, and offers "Print card" immediately (§7).

**Duplicate check:** if the phone number already belongs to another patient, show "This phone is already used by {name} ({card no})" with "Open that patient" / "Continue anyway". Warn, never block — families in Bangladesh often share one phone.

**Photo capture:** one `PatientPhotoCapture` component with three sources:
1. Webcam (desktop/laptop) via `react-webcam` — live preview, capture, retake.
2. Phone/tablet camera via `<input type="file" accept="image/*" capture="user">` (front camera for the patient's face; `capture="environment"` for X-ray and intraoral photos).
3. File upload.

Compress on the client (longest edge 1600 px, JPEG quality ~0.8), then upload via presigned POST (§9). If camera permission is denied, fall back to file upload with a clear message.

**Patient profile** (`/app/patients/[id]`)
- Header: photo, name, age/gender, card number (monospace), phone, and **alert chips — allergies in red, conditions in amber** — always visible.
- Actions: Book appointment · Add walk-in · New prescription (dentists) · New invoice · Upload file · Print card.
- Tabs: **Timeline** (default for dentists: one chronological feed of visits, prescriptions, invoices/payments and files, newest first), Appointments, Prescriptions, Billing (outstanding balance at the top), Files.
- Find any patient by name, phone or card number from the command palette (§11).
- Soft delete: Tenant Admin only, audited. Card numbers of deleted patients are never reused.

### 5.4 Services and durations

- Each service: category, name (English), duration in minutes, price (BDT), bookable online (yes/no), active.
- Duration is the slot engine's input (§5.5). Several services on one appointment add up.
- The name, duration and price are copied onto the appointment (`*_snapshot` columns) and then the invoice, so later edits never rewrite history.
- Seeded list: `SEED_DATA.md` §1. Prices are seeded as 0 — each clinic sets its own, and the setup checklist flags any left at 0.

### 5.5 Appointments and the slot engine

**Staff booking screen** (`/app/appointments/new`, also opened from a patient profile): service(s) → dentist (specific or "Any available") → date → slot grid (with a "Next available" shortcut) → patient (search, scan or quick-register) → notes → confirm. Times are always labeled **"approx."** in the UI and in emails.

**Slot engine** (`lib/scheduling/`: pure functions plus one DB loader). The staff screen and the public booking page call the **same** code.

Inputs: clinic, date (Dhaka), service IDs, dentist ID or `any`, caller (`staff` | `public`).

1. `total = sum(service.duration_minutes)`.
2. Candidate dentists: the chosen one, or every active `is_doctor` user.
3. For each dentist, the **availability windows** for that weekday are the dentist's `doctor_schedules` rows if they have any, otherwise the clinic's `tenant_working_hours` rows. A `closures` row for that date (clinic-wide, or for this dentist) → no windows.
4. **Busy intervals** = that dentist's appointments on that date with status `pending` or `confirmed` (overbooked ones included), each widened by `booking_buffer_minutes` on both sides.
5. Walk each window from its start in steps of `slot_granularity_minutes` (default 10). A start time `t` is valid if `t + total ≤ window end` and `[t, t + total)` overlaps no busy interval.
6. Earliest start: now (staff) or now + `public_booking_min_lead_minutes` (public). Latest date for public: today + `public_booking_days_ahead`.
7. Output: for a specific dentist, the list of valid start times. For `any`: the union of times, each carrying the dentist to assign — the free dentist with the fewest appointments that day (tie → dentist sort order).
8. **Writing the booking** happens in a transaction that re-checks the overlap. The database exclusion constraint (`DATABASE_SCHEMA.md` §12) is the final guard when two people grab the same slot at once — if it fires, respond "That time was just taken — please pick another" and refresh the slots.
9. **Overbooking (staff only):** staff may pick a time that isn't offered. The UI asks "Overlaps with {patient} at {time} — book anyway?" If confirmed, the appointment is saved with `is_overbooked = true` (excluded from the constraint). Walk-ins that overlap are flagged overbooked automatically.

**Worked example from the brief (must be a unit test):** clinic hours 17:00–23:00, Root Canal = 30 min, granularity 10, buffer 0. Patient A books a Root Canal at 17:00 → busy 17:00–17:30. Patient B asks for any service with the same dentist → the earliest time offered is 17:30.

**Lifecycle**

| Status | Meaning |
|---|---|
| `pending` | Online booking by a new patient (or by an existing patient when auto-confirm is off). Holds the slot. No queue entry yet. |
| `confirmed` | Real booking; has a queue entry |
| `completed` | Its queue entry reached Done |
| `cancelled` | Cancelled or declined by staff (reason required); frees the slot |
| `no_show` | Never checked in (set by the daily job, or by staff) |

- Reschedule by editing time / dentist / services (same validation), or by dragging on the week calendar (Phase 2).
- Views: **day list** per dentist (Phase 1); **week calendar** with drag-to-reschedule (Phase 2).
- Emails: `appointment_confirmed` on confirmation, `appointment_cancelled` on cancellation, reminders per §8.

### 5.6 Queue management (`/app/queue`)

A Kanban board for one day (default: today), filterable by dentist, built with dnd-kit. Cards glide between columns (Motion layout animation).

| Column | Meaning |
|---|---|
| **Booked** | Today's confirmed appointments, not arrived yet (sorted by time) |
| **Waiting** | Checked in, has a serial number; drag to reorder priority |
| **In chair** | With a dentist (chair shown if assigned) |
| **Billing** | Treatment finished, payment pending (hidden when `billing` is off) |
| **Done** | Finished |
| No-show / Cancelled | Collapsed side lists |

Card: serial number (large), photo and name, services, dentist, appointment time, time waited, payment badge (due / paid), allergy icon.

| Move | Triggered by | What happens |
|---|---|---|
| Booked → Waiting | "Check in" button, drag, or scanning the patient's card (§6.3) | Next **serial number** for the day (counter `SERIAL:{yyyy-mm-dd}`), `checked_in_at` set |
| Waiting → In chair | "Call next" (dentist), "Send to chair", or drag | `in_chair_at`, dentist and optional chair set |
| In chair → Billing | Dentist clicks "Finish treatment" | Dialog to confirm services performed (prefilled from the appointment; add/remove; tooth numbers) → builds the **draft invoice** |
| Billing → Done | Payment recorded in full (moves automatically), or "Finish with due" | Invoice finalized; if balance > 0 → `payment_due` email; appointment → `completed` |
| Any active → No-show / Cancelled | Card menu or drag | Cancel needs a reason; appointment updated |

- **Walk-in:** "Add walk-in" → scan/search the patient (or quick-register) → services → dentist (default: shortest Waiting line) → creates an appointment (`walk_in`) plus a queue entry directly in **Waiting** with a serial number.
- **Dentist view:** only their Waiting and In chair cards, with a big "Call next" button.
- Cards can move backwards, except out of Done.
- **Live updates:** TanStack Query polling every 5 seconds, plus optimistic updates. Every transition is a conditional update (`WHERE id = ? AND status = <expected>`); if no row changes, show "Updated by someone else" and refresh.
- Reordering Waiting only changes `queue_position`; it never changes appointment times.

### 5.7 Prescriptions — the dentist's workspace

**Goal (acceptance criterion): a typical 4-medicine prescription in under 60 seconds, with no typing needed for instructions.**

**Layout** (`/app/prescriptions/new?patientId=…&appointmentId=…`):
- **Left:** patient summary with allergy/condition alerts, previous prescriptions (each with "Copy"), recent visits.
- **Middle — clinical notes:** Chief complaint, On examination, Diagnosis, Investigations advised. Each is a text area with one-click **quick-text chips** (English, `SEED_DATA.md` §7) that append text. **Tooth selector:** an FDI tooth chart (permanent 11–48; toggle to primary 51–85), multi-select, saved as `tooth_codes`.
- **Right:** the **Rx list** and **Advice**.

**Adding a medicine (keyboard-first):**
1. Type part of the brand or generic name → search-as-you-type (matches both; this dentist's most-used medicines rank first) → Enter.
2. The row is added and **prefilled**, in this order of priority: this dentist's last instruction for that medicine (`doctor_medicine_preferences`) → the medicine's default instruction → empty.
3. Three rows of one-click chips with Bangla labels: **Dosage pattern** (filtered by the medicine's form — tablets see `১+০+১`, a mouthwash sees "১০ মিলি দিয়ে দিনে ২ বার … কুলি করবেন", a gel sees "আক্রান্ত স্থানে … লাগাবেন"; "Show all" reveals the rest), **Meal timing** (optional), **Duration**. Keyboard: Tab moves between chip rows; number keys 1–9 pick a chip.
4. Optional free-text custom instruction (any language).
- Rows can be dragged to reorder and removed.

**Advice:** advice templates are grouped (General oral care, Post-extraction, After root canal, …). Clicking a group name adds all its lines; single lines toggle on/off; custom advice text can be added.

**Speed tools:** "Save as template" / "Apply template" (medicines + advice), "Copy previous prescription", next-visit quick picks (+3 days, +7 days, +14 days, +1 month, custom date).

**Safety:** each allergy flag maps to drug classes at level `block` or `caution` (`SEED_DATA.md` §8).
- `block` match → confirmation dialog "Patient is allergic to {flag}. Prescribe anyway?" Continuing sets `allergy_override = true` and writes an audit entry.
- `caution` match → inline amber notice on the row.
- Conditions (pregnancy, blood thinners, …) show as a banner while prescribing.

**Saving:** assigns `RX-{SHORT}-{seq}`. Each item stores **snapshots** of the printed medicine line and every Bangla instruction text, so later catalog edits never change an old prescription. Updates `doctor_medicine_preferences` (last instruction, use count). Then opens the print view (§7).

**Editing:** the author can edit for 24 hours after creation (audited); after that it's read-only. Receptionists can view and reprint, never edit.

**Printed format:**
```
1. Tab. Napa 500 mg (Paracetamol)
   ১+১+১ — খাবার পরে — ৫ দিন
2. Cap. Moxacil 500 mg (Amoxicillin)
   ১+১+১ — খাবার পরে — ৭ দিন
3. Mouthwash Chlorhexidine Gluconate 0.2%
   ১০ মিলি দিয়ে দিনে ২ বার ৩০ সেকেন্ড কুলি করবেন (গিলবেন না) — ৭ দিন
```
Medicine line: `{form prefix} {brand} {strength} ({generic})`, or `{form prefix} {generic} {strength}` when there's no brand (prefixes: `SEED_DATA.md` §2). Instruction line: dosage — meal timing — duration, skipping empty parts; a custom instruction goes on the next line.

### 5.8 Billing and payments (clinic ↔ patient)

- A **draft invoice** is created automatically when a queue card moves to Billing (§5.6), or manually from a patient profile or the Billing page.
- Line items: service (or custom description), tooth numbers, quantity, unit price → line total. Discount as an amount or a percentage (rounded to whole taka). `total = subtotal − discount`, never negative.
- **Finalize** → assigns `INV-{SHORT}-{seq}` (drafts have no code, so abandoned drafts leave no gaps) → status `due`.
- **Record payment:** amount (up to the balance — no overpayment), method (cash, card, bKash, Nagad, Rocket, bank transfer, other), transaction reference (shown for non-cash methods), received by (the logged-in user), time. Several partial payments per invoice are allowed. Status updates automatically: nothing paid → `due`, some → `partial`, all → `paid`. A `payment_received` email goes out for each payment.
- Receptionists, dentists and Tenant Admins can all take payments.
- **Corrections:** the Tenant Admin can delete a payment made the same day (reason, audited) and void an invoice that has no payments (reason, audited). No refunds in MVP.
- **Dues list** (`/app/billing/dues`): every `due` / `partial` invoice with patient, balance and age in days; "Send reminder" (email, at most once a day per invoice).
- **Today's collection** widget: totals by payment method and by staff member, for end-of-day cash reconciliation.
- Printable invoice/receipt with barcode (§7).

### 5.9 Public booking (for the clinic's own website)

Each clinic with `public_booking` on gets:
1. A public page at `{NEXT_PUBLIC_APP_URL}/book/{slug}` — mobile-first, no login, showing the clinic's logo, name, address, phone and hours in its brand color.
2. A plain link for their website:
   ```html
   <a href="{NEXT_PUBLIC_APP_URL}/book/{slug}" target="_blank" rel="noopener">Book appointment</a>
   ```
3. An embeddable widget that opens the same page in a modal:
   ```html
   <script src="{NEXT_PUBLIC_APP_URL}/widget.js" data-tenant="{slug}" defer></script>
   <button data-orisemr-book>Book appointment</button>
   ```
   `public/widget.js` (plain JavaScript, no dependencies, under 5 KB) finds `[data-orisemr-book]` elements and, on click, opens a full-screen overlay with an iframe to `/book/{slug}?embed=1`. It closes on Esc, a backdrop click, or `postMessage({ type: 'oris:close' })` from the iframe. On screens narrower than 640 px it opens the page in a new tab instead. Only `/book/*` may be framed (`Content-Security-Policy: frame-ancestors *`); every other route sends `frame-ancestors 'none'`.

Both are shown ready to copy in Settings → Public booking. A full REST API with per-clinic API keys is Phase 3.

**Booking flow**
1. Choose service(s) — only `bookable_online` ones, with approximate duration shown.
2. Choose a dentist (name + specialty) or "Any available".
3. Choose a date (closed days disabled) → see real open times from the slot engine (§5.5, caller `public`) → pick one.
4. Identify:
   - **Existing patient:** card number + phone. Both must match the same patient. On mismatch show "We couldn't find a matching patient" — never say which field was wrong. On a match, show only the first name for confirmation.
   - **New patient:** name, phone, optional email (optional age and gender).
5. Confirm → appointment created with `source = public_booking`:
   - Existing patient with auto-confirm on → `confirmed` (+ queue entry) → `appointment_confirmed` email.
   - New patient, or auto-confirm off → `pending` (slot held; details stored in the `pending_patient_*` fields) → `appointment_request_received` email → in-app notification to staff.
6. Confirmation screen: appointment code (`APT-…`), date, approximate time, clinic contact details.

**Confirming pending bookings (staff):** dashboard panel "Online bookings to confirm". Staff link the booking to an existing patient (search by phone) or register the new patient (card number) → `confirmed` → queue entry → confirmation email. Or decline → `cancelled` with reason → `appointment_cancelled` email.

**Abuse protection:** hidden honeypot field; reject forms submitted in under 3 seconds; Postgres-backed rate limits (`rate_limits` table) — 60 slot lookups per minute and 5 bookings per hour per IP; at most 2 upcoming online bookings (pending or confirmed) per phone per clinic. Public endpoints return only what the page needs — never medical data, never anything about other patients. Phone OTP verification is Phase 3.

**Public API** (same-origin only — the iframe loads our own page, so no CORS is needed):
- `GET /api/public/[slug]/info` — clinic profile, bookable services, dentists, open weekdays.
- `GET /api/public/[slug]/slots?date=&serviceIds=&doctorId=` — valid start times.
- `POST /api/public/[slug]/bookings` — create the booking.

### 5.10 Files, reports and X-rays

- Upload from the patient profile or from the prescription screen: kind (patient photo, X-ray, intraoral photo, report, document, other), title, file (JPEG / PNG / WebP / PDF, max 15 MB; images compressed on the client).
- Files of kind `report` get an `RPT-{SHORT}-{seq}` code (`report_code`) so a printed report can be tracked; "Print label" prints a 50 × 25 mm barcode sticker (§7).
- Viewer: image lightbox with zoom and pan; PDFs inline; download.
- Soft delete by the Tenant Admin or the uploader (audited).
- DICOM viewing isn't supported in MVP (upload such files as `other` and download them).

### 5.11 Dashboards and clinic reports

**Role dashboards** are grids of widgets. In Phase 2 users can drag widgets to rearrange or hide them; the layout is saved per user (`users.preferences`).
- Receptionist: queue counts for today, online bookings to confirm, today's appointments, today's collection, dues.
- Dentist: my queue, next patient, patients seen today, recent prescriptions.
- Tenant Admin: all of the above plus a 30-day revenue chart, new patients this month, no-show rate, the setup checklist and the subscription banner.

**Reports** (`/app/reports`, Tenant Admin, feature `reports`, Phase 2): collections by date range / method / staff; revenue by service and by dentist; dues ageing (0–30, 31–60, 60+ days); appointment summary (booked, completed, no-show, cancelled; online vs. staff); new patients per period. Date-range picker, Recharts charts, CSV export.

### 5.12 In-app notifications

- Bell in the top bar with an unread count; list pages `/app/notifications` and `/platform/notifications`.
- Created for: broadcasts; new online bookings to confirm; subscription due soon / overdue (Tenant Admins); failed emails (Super Admin).
- Unread broadcasts also appear as a dismissible banner at the top of the app; dismissing sets `read_at`.

---

## 6. Barcode system

### 6.1 Codes

| Record | Format | Generated by |
|---|---|---|
| Patient card | 10–16 digits, no prefix (each clinic sets its allowed range) | Pre-printed card from an external vendor, or the `CARD` counter in `AUTO_GENERATE` mode (§5.3) |
| Appointment | `APT-{SHORT}-{seq6}` | System, on creation |
| Prescription | `RX-{SHORT}-{seq6}` | System, on save |
| Invoice | `INV-{SHORT}-{seq6}` | System, on finalize |
| Report file | `RPT-{SHORT}-{seq6}` | System, on upload of kind `report` |

Sequences come from `tenant_counters` (keys `APT`, `RX`, `INV`, `RPT`, `CARD`, `SERIAL:{yyyy-mm-dd}`), incremented with `UPDATE … SET next_value = next_value + 1 RETURNING` in the same transaction as the insert — never `MAX() + 1`. Every printed barcode is **Code128** with the human-readable text underneath.

### 6.2 Hardware scanners (USB / Bluetooth)

Standard scanners act as a keyboard ("keyboard wedge"): they type the code very fast and press Enter. No driver or special browser API is needed. Configure scanners for keyboard (HID) mode, Enter suffix, US English layout.

**Global scan listener** (`components/scan/ScanListener.tsx`, mounted once in the `/app` layout):
- Listens to `keydown` on `window`. Characters arriving less than ~35 ms apart form a burst; a gap over 100 ms resets it.
- On Enter: a burst of 6 or more characters is a scan → `preventDefault()` and route it (§6.3).
- If a normal text field had focus when the burst started, snapshot its value at the start and restore it once the scan is confirmed, so the code doesn't end up typed into, say, the notes box.
- Fields marked `data-scan-target` (card number on the registration form, the search box) receive scans normally — and there the scanner's Enter must **not** submit the form; move focus to the next field instead.
- Human typing (slow keystrokes) is never intercepted.

### 6.3 Lookup routing

`resolveCode(code)` (server action, tenant-scoped):
1. Trim and uppercase.
2. `APT-` → appointment; `RX-` → prescription; `INV-` → invoice; `RPT-` → report file. If the `{SHORT}` part isn't this clinic's short code → not found.
3. Digits only, within the clinic's length range → `patients.card_number`.
4. Anything else → toast "No record found for {code}" with a manual search box.

Scanning a patient card opens the profile. If that patient has an appointment today that isn't checked in yet, a prompt appears: "Check in {name} now?" (Enter = yes) → Waiting, with a serial number.

**Manual entry:** type or paste any code or card number into the command palette (§11) — for smudged cards or when no scanner is attached.

### 6.4 Camera scanning (Phase 2, feature `camera_scan`)

"Scan with camera" in the palette opens a camera view (rear camera on phones) that decodes Code128 and QR with the native `BarcodeDetector` API when available, otherwise `@zxing/browser`, and passes the result to the same `resolveCode()`.

---

## 7. Printing

Printing uses dedicated HTML print routes with print CSS (`@page` sizes), opened in a new tab that triggers the print dialog automatically. Reason: the browser's text engine shapes Bangla conjunct letters (যুক্তাক্ষর) correctly; PDF libraries such as `@react-pdf/renderer` don't do it reliably, so printed Bangla instructions could come out broken. Server-side PDF generation (headless Chromium) is Phase 3.

| Route | Paper | Contents |
|---|---|---|
| `/print/prescription/[id]` | A4 or A5 (setting) | Letterhead (logo, clinic name, address, phone; dentist name, degrees, specialty, BMDC reg. no.) — or a blank top margin for pre-printed pads → patient line (name, age/gender, card no., date) + RX barcode → left column: C/C, O/E, Diagnosis, Teeth, Investigations → right column: Rx items (§5.7 format) → Advice (Bangla bullets) → Next visit → signature image and name → footer |
| `/print/invoice/[id]` | A4, A5 or 80 mm thermal | Clinic header, INV barcode, patient, items (service, teeth, qty, unit price, total), subtotal, discount, total, paid, **due**, payments (method, reference, time), received by |
| `/print/card/[patientId]` | CR80 card, 85.6 × 54 mm | Clinic name/logo, patient name, card-number barcode |
| `/print/label/[attachmentId]` | 50 × 25 mm sticker | RPT barcode, patient name, report title, date |

- Fonts are self-hosted with `next/font`: Inter (Latin) and **Noto Sans Bengali** (Bangla). Wrap Bangla text in `<span lang="bn">`.
- Barcodes render as SVG with JsBarcode.
- Print pages use the flat style only: black text on white, no glass, no shadows.

---

## 8. Email and notifications

### 8.1 Delivery

- Nodemailer SMTP transport to the self-hosted **Mailcow** server (port 587 with STARTTLS, or 465 with TLS).
- From: `"{Clinic name} via Oris EMR" <SMTP_FROM_EMAIL>`; Reply-To: the clinic's email when set. Platform emails are sent as `SMTP_FROM_NAME`.
- Never send inside a request. Insert into `email_queue`, then (a) try to send right after the response with Next.js `after()`, and (b) let the `/api/cron/email-queue` job (every minute) retry anything still `pending` or `failed`, with backoff (1, 5, 15, 60 minutes) and at most 5 attempts.
- A unique `dedupe_key` prevents duplicates, e.g. `reminder24:{appointmentId}`, `paid:{paymentId}`.
- Patient emails go out only if the patient (or pending booking) has an email address **and** the clinic's `email_notifications` feature is on **and** the clinic is active.
- Content: English, short — clinic name, address and phone, date and approximate time, codes, amounts. **Never diagnoses, medicines or clinical notes.**
- DNS for the sending domain: SPF, DKIM (Mailcow generates the key) and DMARC. Test deliverability (e.g. with mail-tester) before launch.

### 8.2 Email matrix

| Template key | To | When |
|---|---|---|
| `tenant_welcome` | New clinic admin | Clinic created (includes set-password link) |
| `staff_invite` | New staff member | User created (includes set-password link) |
| `password_reset` | Any user | Forgot password |
| `appointment_confirmed` | Patient | Booking confirmed (by staff, auto-confirmed online, or pending booking confirmed) |
| `appointment_request_received` | Patient | Pending online booking created |
| `appointment_reminder_24h` | Patient | About 24 h before (if enabled) |
| `appointment_reminder_2h` | Patient | About 2 h before (if enabled) |
| `appointment_cancelled` | Patient | Cancelled or declined by the clinic |
| `payment_received` | Patient | Each payment recorded |
| `payment_due` | Patient | Visit finished with a balance > 0; manual reminder from the dues list |
| `platform_payment_due_soon` | Clinic admins | 3 days before the period ends |
| `platform_payment_overdue` | Clinic admins | The day after the period ends |
| `tenant_suspended` / `tenant_reactivated` | Clinic admins | Clinic status changed |
| `broadcast` | Selected recipients | Super Admin sends a broadcast by email |

### 8.3 Scheduled jobs

Defined in `vercel.json`. Vercel sends `Authorization: Bearer $CRON_SECRET`; reject anything else.

| Route | Schedule (UTC) | Does |
|---|---|---|
| `/api/cron/email-queue` | `* * * * *` | Send and retry queued emails |
| `/api/cron/reminders` | `*/15 * * * *` | Queue 24 h reminders for confirmed appointments starting 24 h–24 h 15 min from now, and 2 h reminders for 2 h–2 h 15 min; set `reminder_24h_sent_at` / `reminder_2h_sent_at` |
| `/api/cron/daily` | `5 18 * * *` (00:05 Dhaka) | Yesterday's Booked queue entries → `no_show` (and their appointments); past `pending` appointments → `cancelled`; subscriptions → `past_due` when due; platform due-soon / overdue emails |

---

## 9. File storage (S3 + CloudFront)

**Keys** — store only the key in the database, never a full URL; build URLs when reading:
- Patient files: `tenants/{tenantId}/patients/{patientId}/{kind}/{uuid}.{ext}`
- Dentist signatures: `tenants/{tenantId}/staff/{userId}/signature/{uuid}.png`
- Clinic logos (public): `public/tenants/{tenantId}/logo/{uuid}.{ext}`

**Upload**
1. The client calls `/api/uploads/presign` with kind, patient, content type and size.
2. The server checks permission and that the patient belongs to the clinic, builds the key, and returns an S3 **presigned POST** (expires in 5 minutes) whose conditions pin the exact key, `content-length-range` up to 15 MB and the allowed content type.
3. The client uploads straight to S3.
4. The client calls `/api/uploads/confirm` → the server runs `HeadObject` to check the file exists and its size → inserts the `attachments` row (or sets `patients.photo_key`).

**Reads**
- Private files: **CloudFront signed URLs** (1-hour expiry) via `@aws-sdk/cloudfront-signer`, issued only after the clinic/permission check. Until CloudFront signing is configured, fall back to S3 presigned GET URLs.
- `public/*` (logos): plain CloudFront URL, no signing.

**AWS setup** (checklist in §14): bucket private (Block Public Access on) behind CloudFront Origin Access Control; the default CloudFront behavior restricted to a trusted key group (signed URLs); a second behavior for `public/*` without signing; bucket CORS allowing `POST` from `NEXT_PUBLIC_APP_URL`; an IAM user limited to this bucket (`s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`).

---

## 10. Language and formatting

| Content | Language / format |
|---|---|
| All app UI (menus, buttons, labels, messages, settings) | **English** |
| Public booking page and emails | English |
| Service names, medicine names, quick texts (complaints, findings, diagnoses, investigations) | English |
| **Prescription instruction presets:** dosage patterns, meal timings, durations, advice templates | **Bangla** — shown to the dentist as Bangla chips and printed in Bangla for the patient |
| Custom instructions / custom advice | Whatever the dentist types |
| Headings on the printed prescription (Rx, Advice, Next visit…) | English |
| Digits | Western digits everywhere, except inside the Bangla preset text itself (e.g. `১+০+১`) |
| Currency | BDT, `৳1,500`, `en-IN` grouping (`৳1,00,000`) |
| Dates and times | `dd/MM/yyyy` and `h:mm a` (Bangladesh's day-first convention), Asia/Dhaka |
| Fonts | Inter for Latin text, Noto Sans Bengali for Bangla (font-stack fallback), JetBrains Mono for codes and card numbers |

Bangla text is stored as UTF-8 in `label_bn` / `text_bn` columns and must render correctly in the UI, in print views and wherever the two scripts mix.

---

## 11. UI/UX direction

Source: the owner's house style guides — **Minimal** as the base, **Liquid Glass** for floating layers only. The tokens are copied here so this spec is self-contained. Define them once as CSS variables (`app/globals.css` + Tailwind theme); no hard-coded colors in components.

**Principles:** calm, fast, data-first. One accent color. Flat surfaces for everything dense (tables, forms, the prescription builder, print). Glass and motion only where they help people keep their bearings. Sentence case everywhere.

**Color tokens**

| Token | Light | Dark (optional, Phase 2) | Use |
|---|---|---|---|
| `ink` | `#1C1C1E` | `#F4F4F5` | Text |
| `paper` | `#FFFFFF` | `#1C1C1E` | Background |
| `mist` | `#F4F4F5` | `#26262A` | Secondary surfaces, table stripes |
| `ash` | `#6B7280` | `#A1A1AA` | Secondary text, metadata |
| `line` | `#E4E4E7` | `#3F3F46` | Borders, dividers |
| `signal` | `#2A5CAA` | `#2A5CAA` | The one accent: primary buttons, links, focus rings, active states |
| `signal-tint` | `#E8EEF7` | `rgba(42,92,170,0.18)` | Selected rows, tags |
| `success` / `warning` / `danger` | `#30D158` / `#FF9F0A` / `#FF453A` | same | **Status only** (paid, due, allergy, errors) — as ~15% tinted backgrounds with dark text and icons; never as text color on white |

**Type:** Inter. Page title 28 px / 700, section 22 px / 600, subsection 18 px / 600, body 15 px, tables 14 px, small 13 px. Line icons only (lucide, 1.5–2 px stroke), monochrome.

**Spacing:** 8 px grid (4 px half-step). **Radius:** inputs and buttons 6 px, cards 12 px; glass overlays use the concentric scale 20 / 28 / 36 px; pills fully rounded.

**Glass — floating layers only:** the sticky top bar (content scrolls underneath), command/scan palette, dialogs and sheets, toasts, the queue card while it's being dragged, and the public booking page (glass cards over a soft gradient in the clinic's brand color). Use "regular" glass for anything with text — light: `rgba(255,255,255,0.55)`, 24 px backdrop blur, `1px rgba(255,255,255,0.45)` border, top highlight `inset 0 1px 0 rgba(255,255,255,0.5)`; dark: `rgba(28,28,32,0.6)`. Elevation: raised `0 8px 24px rgba(0,0,0,0.18)`, overlay `0 16px 48px rgba(0,0,0,0.28)`. **Never** glass on tables, forms, the prescription builder or print. Text on glass must reach 4.5:1 contrast.

**Motion** (Motion library): easing `cubic-bezier(0.32, 0.72, 0, 1)`; button press scales to 0.96 over 150 ms; dialogs and sheets slide up over 350–400 ms with a slight settle; list and card position changes use layout animation; queue cards glide between columns. Respect `prefers-reduced-motion` (switch off everything non-essential).

**Drag and drop (dnd-kit):** queue board (between columns and within Waiting) · Rx items in the prescription builder · catalog ordering in settings · dashboard widgets (Phase 2) · calendar rescheduling (Phase 2). All with keyboard support and screen-reader announcements.

**Layout:** collapsible left sidebar (Dashboard, Queue, Appointments, Patients, Billing, Reports, Settings) + glass top bar with the command/scan palette, notification bell and user menu.

**Command palette** (`Ctrl+K` or `/`): find patients by name, phone or card number; type or paste any code (`INV-…`, `RX-…`); actions ("New patient", "Book appointment", "Add walk-in", "Open queue").

**States:** skeleton loaders, empty states with one clear action, optimistic updates, sonner toasts, confirmation dialogs for anything destructive.

**Responsive targets:** reception desktop ≥ 1280 px; dentist desktop or tablet ≥ 768 px; public booking and camera capture mobile-first from 360 px.

**Accessibility:** WCAG AA contrast, visible focus rings, everything reachable by keyboard.

---

## 12. Security requirements

- Tenant isolation per §3.1; `requireSession()` per §3.2 at every protected entry point; permissions per §4.2 enforced on the server.
- Validate every input with Zod on the server (server actions, route handlers, public API).
- Passwords are handled by Better Auth (strong hashing); minimum length 10. Never log passwords, tokens or full request bodies.
- Private files only through signed URLs issued after a permission check (§9).
- Audit log (`audit_logs`, with before/after JSON) for: clinic create/suspend/reactivate/plan or feature change; staff create/role change/disable; platform payments; patient edit/delete; prescription create/edit and allergy overrides; invoice finalize/void; payment record/delete; settings changes.
- Public endpoints: rate limits, honeypot, minimal responses (§5.9).
- Security headers: CSP (with the `/book/*` framing exception), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS.
- Secrets only in server-side env vars; only `NEXT_PUBLIC_` variables reach the browser.
- No patient data in logs, analytics or email bodies beyond what §8.1 allows.
- Backups: Neon point-in-time restore — confirm the plan's retention window before launch.
- Phase 3 hardening: Postgres Row-Level Security keyed on `tenant_id` as a second layer.

---

## 13. Folder structure and route map

```
/
├─ app/
│  ├─ (auth)/login · forgot-password · reset-password
│  ├─ (platform)/platform/                      SUPER_ADMIN only
│  │   ├─ page.tsx                              dashboard
│  │   ├─ tenants/ · tenants/new · tenants/[id]/{overview,staff,subscription,features,audit}
│  │   ├─ subscriptions/
│  │   ├─ broadcasts/ · broadcasts/new
│  │   ├─ catalog/{services,medicines,dosage-patterns,meal-timings,durations,advice,quick-texts}
│  │   └─ emails/ · audit/ · notifications/
│  ├─ (tenant)/app/                             TENANT_ADMIN · DOCTOR · RECEPTIONIST
│  │   ├─ page.tsx                              role dashboard
│  │   ├─ queue/
│  │   ├─ appointments/ · appointments/new · appointments/pending
│  │   ├─ patients/ · patients/new · patients/[id]
│  │   ├─ prescriptions/new · prescriptions/[id]
│  │   ├─ billing/ · billing/dues · billing/[invoiceId]
│  │   ├─ reports/ · notifications/
│  │   └─ settings/{clinic,hours,staff,services,medicines,rx-presets,chairs,patient-cards,printing,public-booking,features,subscription}
│  ├─ (print)/print/{prescription/[id],invoice/[id],card/[patientId],label/[attachmentId]}
│  ├─ book/[tenantSlug]/                        public booking (no login)
│  └─ api/
│      ├─ auth/[...all]/                        Better Auth handler
│      ├─ public/[tenantSlug]/{info,slots,bookings}/
│      ├─ uploads/{presign,confirm}/
│      └─ cron/{email-queue,reminders,daily}/
├─ components/  ui/ (shadcn) · scan/ · queue/ · patients/ · prescription/ · billing/ · dashboard/ · print/
├─ db/          schema/*.ts · index.ts · migrations/ · seed/{master-data.ts,seed.ts,demo.ts}
├─ emails/      React Email templates, one per template key (§8.2)
├─ lib/         auth.ts · auth-client.ts · session.ts · tenant-scope.ts · permissions.ts · features.ts
│               scheduling/ · barcode/ · codes.ts · money.ts · phone.ts · dates.ts · clinical-flags.ts
│               s3.ts · mailer.ts · email-queue.ts · rate-limit.ts · audit.ts · env.ts · platform/
├─ public/widget.js
├─ tests/       unit/ · integration/ · e2e/
├─ proxy.ts     (middleware.ts on Next.js 15)
├─ vercel.json  cron jobs (§8.3)
└─ CLAUDE.md · PROJECT.md · DATABASE_SCHEMA.md · SEED_DATA.md · DECISIONS.md
```

Mutations are Server Actions in each route segment (`actions.ts`). Route handlers exist only for Better Auth, the public API, uploads and cron jobs.

---

## 14. Environment and infrastructure setup

```bash
# Database (Neon)
DATABASE_URL=                     # pooled connection string (app)
DATABASE_URL_UNPOOLED=            # direct connection string (migrations)

# Auth (Better Auth)
BETTER_AUTH_SECRET=               # 32+ random bytes
BETTER_AUTH_URL=                  # the app's public origin
NEXT_PUBLIC_APP_URL=              # same origin; used in emails, booking links, widget snippet

# AWS (S3 + CloudFront)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=                       # the bucket's actual region, e.g. ap-southeast-1
S3_BUCKET_NAME=
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=    # e.g. dxxxxxxxxxxxx.cloudfront.net
CLOUDFRONT_KEY_PAIR_ID=           # public key ID in the trusted key group
CLOUDFRONT_PRIVATE_KEY=           # PEM, newlines escaped as \n

# Email (Mailcow SMTP)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false                 # true when using port 465
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=Oris EMR

# Scheduled jobs
CRON_SECRET=

# First deploy only (seed)
SEED_SUPER_ADMIN_NAME=
SEED_SUPER_ADMIN_EMAIL=
SEED_SUPER_ADMIN_PASSWORD=
```

`lib/env.ts` validates every variable with Zod at startup and fails fast with a clear message.

**Infrastructure checklist**
1. **Neon:** create the project in AWS Singapore (`ap-southeast-1`), the closest region to Bangladesh; copy the pooled and unpooled connection strings. The extensions are created by the custom migration.
2. **Vercel:** Pro plan; function region Singapore (`sin1`), next to the database; add all env vars; crons from `vercel.json` (§8.3).
3. **AWS:** confirm the bucket's actual region (the brief lists `ap-southeast-…`); configure per §9; create a CloudFront public key and key group for signed URLs.
4. **Mailcow:** an SMTP user for the app; SPF, DKIM and DMARC for the sending domain.
5. **First deploy:** run migrations → `pnpm db:seed` (master catalogs + Super Admin) → log in as Super Admin → create the first clinic.

**Scripts:** `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `db:generate`, `db:migrate`, `db:seed`, `db:seed:demo`.

---

## 15. Testing and definition of done

**Unit (Vitest):** slot engine (the brief's example; buffer; split shifts; closures; dentist schedule vs. clinic hours; "any dentist" assignment; minimum notice; overbooking); code generation and formatting (including AUTO_GENERATE card numbers); `resolveCode()` routing; money and discount rounding; phone normalization; invoice status transitions; allergy mapping; prescription line formatting.

**Integration:**
- Cross-tenant access: clinic B cannot read or change clinic A's patient, appointment, prescription, invoice or file (→ 404).
- Two simultaneous bookings of the same slot → exactly one succeeds (exclusion constraint).
- Suspending a clinic deletes its sessions and blocks the next request.

**End-to-end (Playwright) golden paths:**
1. Super Admin creates a clinic → admin sets a password → completes the setup checklist.
2. Receptionist registers a patient with a card number → books an appointment → scans the card on arrival → checks in → dentist calls the patient, writes a 4-medicine prescription with Bangla presets → prints → finishes → receptionist records a partial payment → the dues list shows the balance.
3. Public booking as a new patient → staff confirm → emails queued.
4. Clinic suspended → staff request rejected.

**Definition of done for each build step:** typecheck and lint clean; tests for the new logic pass; migration committed; seed updated if catalogs changed; the step's box ticked in §16; any new decisions logged in `DECISIONS.md`.

---

## 16. Build phases

### Phase 1 — MVP (a clinic can run a full day on it). Build in this order:

- [ ] **1.1 Foundation** — Next.js + TypeScript strict, pnpm, Tailwind v4, shadcn/ui, Motion, design tokens (§11), app shell (sidebar, glass top bar), `lib/env.ts`, Vitest and Playwright set up.
- [ ] **1.2 Database** — every table in `DATABASE_SCHEMA.md`, the custom SQL migration (its §12), the `tenant-scope` helper, and the seed script for master catalogs + Super Admin (`SEED_DATA.md`).
- [ ] **1.3 Auth** — Better Auth, `/login`, forgot/reset password, set-password invites, `requireSession()`, role redirects, `proxy.ts`, suspend/disable enforcement (§3.2–3.3).
- [ ] **1.4 Super Admin** — clinic list, create-clinic wizard with master data copy, clinic detail (overview, staff, subscription, features, audit), suspend/reactivate, record platform payments, subscription banners (§5.1).
- [ ] **1.5 Clinic settings** — every page in §5.2 plus the setup checklist.
- [ ] **1.6 Patients** — registration, card modes, duplicate-phone warning, photo capture and uploads (§9), profile with timeline, card printing (§5.3, §7).
- [ ] **1.7 Barcode and palette** — scan listener, command palette, `resolveCode()`, check-in prompt (§6.1–6.3, §11).
- [ ] **1.8 Appointments** — slot engine with tests, staff booking screen, day list, reschedule/cancel, overbooking (§5.5).
- [ ] **1.9 Queue** — board with drag and drop, serial numbers, walk-ins, dentist view, polling, conditional updates (§5.6).
- [ ] **1.10 Prescriptions** — builder, quick texts, tooth chart, Bangla chips, prefill memory, templates, copy previous, allergy warnings, print view (§5.7, §7).
- [ ] **1.11 Billing** — draft invoice from the queue, finalize, payments, dues list, today's collection, invoice print (§5.8, §7).
- [ ] **1.12 Files** — uploads, viewer, report codes, label printing (§5.10).
- [ ] **1.13 Email** — queue, Mailcow transport, `after()` sending, cron retry; templates `tenant_welcome`, `staff_invite`, `password_reset`, `appointment_confirmed`, `appointment_cancelled`, `payment_received`, `payment_due` (§8).
- [ ] **1.14 Notifications and dashboards** — bell, in-app notifications, role dashboards with a fixed layout (§5.11–5.12).

### Phase 2

- [ ] Public booking page, `widget.js`, public API, pending-confirmation flow, `appointment_request_received` email (§5.9)
- [ ] Reminder and daily cron jobs: 24 h / 2 h reminder emails, automatic no-shows, subscription status updates (§8.3)
- [ ] Broadcasts (email + in-app banner); platform due-soon / overdue emails (§5.1, §8.2)
- [ ] Camera barcode scanning (§6.4)
- [ ] Dashboard widgets with drag and drop and saved layouts (§5.11)
- [ ] Week calendar with drag-to-reschedule (§5.5)
- [ ] Clinic reports with CSV export (§5.11)
- [ ] "Push new items to existing clinics" for master catalogs; Super Admin email monitor (§5.1)
- [ ] Super Admin TOTP two-factor login (§3.2); optional dark mode (§11)

### Phase 3

- [ ] Payment gateways (bKash, Nagad, SSLCommerz) for platform billing; optional online patient payments
- [ ] SMS reminders through a Bangladeshi SMS gateway
- [ ] Custom role / permission builder per clinic
- [ ] One login for dentists who work at several clinics (multi-clinic memberships)
- [ ] Postgres Row-Level Security
- [ ] Odontogram (per-tooth charting and history)
- [ ] Waiting-room display ("Now serving #12")
- [ ] Public booking: phone OTP, self-cancel link, add-to-calendar
- [ ] REST API with per-clinic API keys
- [ ] Server-side PDF generation; clinic data export

---

## 17. Decisions log (final)

1. **Multi-tenancy:** shared database and schema, isolated by `tenant_id` through one scoping helper (§3.1).
2. **Auth:** Better Auth with database sessions — Auth.js's email/password provider requires JWT sessions, which can't be revoked instantly (§3.2–3.3).
3. **Language:** English UI; Bangla only for prescription instruction presets and advice (§10).
4. **Card numbers:** 10–16 digits, range set per clinic; unique per clinic, not globally, because lookups always happen inside one clinic's session.
5. **Card modes:** `PRE_PRINTED` (default) or `AUTO_GENERATE`, chosen per clinic.
6. **Online bookings:** new patients → `pending` until staff confirm and register them; existing patients (card + phone verified) are auto-confirmed unless the clinic turns that off.
7. **Billing:** platform billing and clinic billing are separate modules with separate tables (§3.4).
8. **No payment gateway in MVP:** all payments are recorded by a person against a real-world transaction (cash, bKash, card machine…). Gateways are Phase 3.
9. **Scheduling resource:** the dentist. Chairs are labels on the queue, not scheduling resources, in MVP.
10. **Slots are approximate but never double-booked online;** only staff can overbook, explicitly (§5.5).
11. **Walk-ins are appointments** with `source = walk_in` (§3.5).
12. **Master data is copied, not referenced;** `master_id` is kept so new master items can later be pushed to existing clinics.
13. **Medicine seed list is a starting point, not a certified formulary:** brand rows only where the brand is well established; generic-only rows elsewhere; the whole list must be checked by a dentist or pharmacist before go-live (`SEED_DATA.md` §2).
14. **Per-medicine default instructions are not seeded;** each clinic sets its own, and each dentist's last-used instruction is remembered automatically.
15. **Prescriptions store snapshots** of medicine and instruction text.
16. **Printing is browser-based HTML** because it shapes Bangla correctly (§7).
17. **Money is stored as whole taka integers** (§3.7).
18. **Emails are queued,** sent with `after()` and retried by cron; this needs Vercel Pro for per-minute cron.
19. **Patient notifications are email-only in MVP** and only for patients with an email address; SMS is Phase 3.
20. **One user belongs to one clinic** in MVP; a dentist working at two chambers uses two accounts (different emails) until Phase 3.
21. **Clinical and financial records are never hard-deleted.**
22. **Receptionists can view and reprint prescriptions but not clinical notes.**
23. **Dates display as `dd/MM/yyyy`** — a deliberate deviation from the house style guide's ISO rule, because clinic staff and patients read dates day-first.
24. **No automatic suspension** for overdue platform subscriptions; the Super Admin decides.
25. **The queue uses 5-second polling,** not websockets.
26. **UI style:** Minimal style guide as the base, Liquid Glass only for floating layers (§11).

---

## 18. Brief coverage checklist

| # | Requirement from the original brief | Specified in |
|---|---|---|
| 1 | Next.js, Neon + Drizzle ORM, hosted on Vercel | §2, §3.6, §14 |
| 2 | Files in the existing S3 bucket via CloudFront | §9 |
| 3 | All email through the self-hosted Mailcow SMTP | §8 |
| 4 | Only one login for everyone | §3.2 |
| 5 | Product owner admin creates clinics and manages each clinic's users | §5.1 |
| 6 | Access on/off per clinic | §3.3 |
| 7 | Payment updates (platform billing) | §3.4, §5.1 |
| 8 | Notifications to all clinics or individual clinics | §5.1, §5.12 |
| 9 | Clinic admin logs in on the same page, adds features and users by role | §4, §5.2 |
| 10 | Create patients; patient data management | §5.3 |
| 11 | Patient photo from phone camera or laptop/desktop webcam | §5.3, §9 |
| 12 | Approximate appointment times | §5.5 |
| 13 | Patient queue management | §5.6 |
| 14 | Patient images and reports | §5.10 |
| 15 | Doctor sees patient history | §5.3 (Timeline), §5.7 |
| 16 | Fast prescriptions inside the EMR instead of pen and paper | §5.7, §7 |
| 17 | Patient pays the doctor/service fee; receptionist or doctor records it | §5.8 |
| 18 | Emails: appointment confirmation, reminder, payment due, payment done | §8.2 |
| 19 | Pre-printed barcode card (10–16 digits) linked at registration; scanning opens the profile/history | §5.3, §6 |
| 20 | A barcode on every test/report, prescription and payment invoice; scan or type the number to pull it up | §6, §7 |
| 21 | Book-appointment button/API for the clinic's existing website; public URL; new and existing patients | §5.9 |
| 22 | Only genuinely available times are shown | §5.5, §5.9 |
| 23 | Clinic sets its hours in its admin panel (e.g. 5 pm–11 pm) | §5.2 |
| 24 | Service chosen first; each service has an approximate duration (root canal 30 min example) | §5.4, §5.5 |
| 25 | Dental services pre-loaded at clinic creation; custom ones can be added later | §5.1, §5.2, `SEED_DATA.md` §1 |
| 26 | Medicines available in Bangladesh pre-loaded, names in English | `SEED_DATA.md` §2 |
| 27 | Dosage patterns (1+0+1), before/after meal, durations (7 days, 3 days), every-other-day, pre-written advice — in Bangla | §5.7, §10, `SEED_DATA.md` §3–6 |
| 28 | Currency BDT | §3.7, §10 |
| 29 | App UI in English | §10 |
| 30 | Modern UI with animation, drag and drop, modules | §11, §5.6, §5.11 |
