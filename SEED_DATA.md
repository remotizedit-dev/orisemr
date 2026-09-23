# Oris EMR — Master Seed Data

**Version:** 2.0 (final for build) · **Date:** 2026-09-23

Everything below goes into the `master_*` tables and is **copied** into each new clinic's own tables when the clinic is created. It's a starting point every clinic can edit, deactivate or extend — nothing here is locked in the UI.

Language rule (`PROJECT.md` §10): services, medicines and quick texts are **English**; dosage patterns, meal timings, durations and advice are **Bangla**.

---

## 0. How seeding works

**Files:** `db/seed/master-data.ts` holds the lists in this document as typed constants; `db/seed/seed.ts` and `db/seed/demo.ts` run them.

**`pnpm db:seed`** (safe to run repeatedly; upserts by `key`):
1. Upserts every master catalog row. Each row gets a stable `key`: a table prefix plus a slug of its name or code — e.g. `svc-endodontic-root-canal-treatment-anterior`, `med-napa-500-mg-tablet`, `med-generic-chlorhexidine-gluconate-0-2-mouthwash`, `dose-1-0-1`, `meal-after-meal`, `dur-7`, `adv-post-extraction-01`, `qt-diagnosis-irreversible-pulpitis`.
2. Creates the Super Admin from env vars if none exists (§9).

**Copy into a new clinic** (inside the create-clinic transaction, `PROJECT.md` §5.1):
1. Copy every **active** master row into the clinic tables with `source = 'master'`, `master_id` = the master row's ID, and the same `sort_order`. Map `category_id` to the clinic's copied categories.
2. Create `tenant_features` rows (§10) and `tenant_counters` rows (§10).
3. Don't copy working hours — the clinic sets them during onboarding.

Later changes to master data never change existing clinics automatically. "Push new items to existing clinics" (Phase 2) only inserts master rows a clinic doesn't have yet.

---

## 1. Services (English)

Prices are seeded as **0 BDT** — each clinic sets its own, and the setup checklist flags any left at 0. Durations are typical per-visit estimates the clinic can change. (The brief's example uses 30 minutes for a root canal; a clinic that works that way simply edits the duration.)

| Category | Service | Duration (min) | Bookable online |
|---|---|---|---|
| General | Consultation | 15 | Yes |
| General | Follow-up Visit | 10 | Yes |
| General | Emergency Visit (Pain / Swelling) | 20 | Yes |
| Diagnostic | Intraoral X-Ray (IOPA) | 10 | Yes |
| Diagnostic | Bitewing X-Ray | 10 | No |
| Diagnostic | OPG (Panoramic X-Ray) | 15 | Yes |
| Preventive | Scaling & Polishing | 30 | Yes |
| Preventive | Fluoride Application | 15 | Yes |
| Preventive | Fissure Sealant (per tooth) | 15 | No |
| Restorative | Filling — Composite | 30 | Yes |
| Restorative | Filling — Glass Ionomer (GIC) | 20 | Yes |
| Restorative | Filling — Amalgam | 30 | No |
| Restorative | Temporary Filling | 15 | No |
| Endodontic | Root Canal Treatment — Anterior | 45 | Yes |
| Endodontic | Root Canal Treatment — Premolar | 60 | Yes |
| Endodontic | Root Canal Treatment — Molar (per visit) | 60 | Yes |
| Endodontic | Re-Root Canal Treatment | 60 | No |
| Endodontic | Pulp Capping | 20 | No |
| Endodontic | Post & Core | 30 | No |
| Oral Surgery | Extraction — Simple | 20 | Yes |
| Oral Surgery | Extraction — Surgical | 45 | No |
| Oral Surgery | Impacted Third Molar Surgery | 60 | No |
| Oral Surgery | Incision & Drainage | 20 | No |
| Oral Surgery | Suture Removal | 10 | Yes |
| Oral Surgery | Biopsy | 30 | No |
| Periodontal | Scaling & Root Planing (per quadrant) | 40 | No |
| Periodontal | Gingivectomy | 45 | No |
| Periodontal | Flap Surgery | 60 | No |
| Prosthodontic | Crown — Metal | 30 | No |
| Prosthodontic | Crown — PFM | 30 | No |
| Prosthodontic | Crown — Zirconia | 30 | No |
| Prosthodontic | Crown — E-max | 30 | No |
| Prosthodontic | Bridge (per unit) | 30 | No |
| Prosthodontic | Crown / Bridge Cementation | 20 | No |
| Prosthodontic | Partial Denture — Acrylic | 30 | No |
| Prosthodontic | Partial Denture — Flexible | 30 | No |
| Prosthodontic | Complete Denture | 45 | No |
| Prosthodontic | Denture Repair | 20 | No |
| Cosmetic | Teeth Whitening (In-Office) | 60 | Yes |
| Cosmetic | Composite Veneer (per tooth) | 45 | No |
| Cosmetic | Porcelain Veneer (per tooth) | 45 | No |
| Cosmetic | Diastema Closure | 45 | No |
| Orthodontic | Orthodontic Consultation | 20 | Yes |
| Orthodontic | Fixed Braces — Placement | 90 | No |
| Orthodontic | Braces — Adjustment Visit | 20 | Yes |
| Orthodontic | Retainer | 20 | No |
| Orthodontic | Clear Aligner Consultation | 20 | Yes |
| Pediatric | Pediatric Consultation | 15 | Yes |
| Pediatric | Pulpotomy (Primary Tooth) | 30 | No |
| Pediatric | Stainless Steel Crown | 30 | No |
| Pediatric | Space Maintainer | 30 | No |
| Pediatric | Extraction — Primary Tooth | 15 | Yes |
| Implant | Implant Consultation | 20 | Yes |
| Implant | Implant Placement | 60 | No |
| Implant | Implant Crown | 30 | No |

Category order = table order.

---

## 2. Medicines (English)

> **Must be verified before go-live.** A dentist or pharmacist has to check every row against the DGDA drug registry or a current Bangladeshi drug index (e.g. MedEx) — brand ownership, strengths and forms change. Brand rows are limited to well-established Bangladeshi brands; everything else is seeded **generic-only** (`brand_name` null) so each clinic adds the brands it actually prescribes. The app must present this list as "Starter list — review before use", not as a certified formulary.

**Form → printed prefix and dosage-chip group**

| `form` | Printed prefix | `form_group` (filters dosage chips, §3) |
|---|---|---|
| tablet | Tab. | oral_solid |
| capsule | Cap. | oral_solid |
| syrup | Syp. | oral_liquid |
| suspension | Susp. | oral_liquid |
| drops | Drops | oral_liquid |
| mouthwash | Mouthwash | mouthwash |
| gel | Gel | topical |
| paste | Oral Paste | topical |
| ointment | Oint. | topical |
| toothpaste | Toothpaste | toothpaste |
| injection | Inj. | any |
| other | (none) | any |

**`drug_class` values:** `paracetamol`, `nsaid`, `penicillin`, `cephalosporin`, `macrolide`, `lincosamide`, `nitroimidazole`, `ppi`, `antihistamine`, `antifungal`, `antiviral`, `local_anaesthetic`, `antiseptic`, `corticosteroid`, `antifibrinolytic`, `vitamin`, `desensitizing`, `other`.

**Brand rows**

| Brand | Generic | Strength | Form | Drug class |
|---|---|---|---|---|
| Napa | Paracetamol | 500 mg | tablet | paracetamol |
| Napa Extra | Paracetamol + Caffeine | 500 mg + 65 mg | tablet | paracetamol |
| Ace | Paracetamol | 500 mg | tablet | paracetamol |
| Rolac | Ketorolac Tromethamine | 10 mg | tablet | nsaid |
| Clofenac | Diclofenac Sodium | 50 mg | tablet | nsaid |
| Naprosyn | Naproxen | 500 mg | tablet | nsaid |
| Flexi | Aceclofenac | 100 mg | tablet | nsaid |
| Moxacil | Amoxicillin | 500 mg | capsule | penicillin |
| Moxaclav | Amoxicillin + Clavulanic Acid | 500 mg + 125 mg | tablet | penicillin |
| Zimax | Azithromycin | 500 mg | tablet | macrolide |
| Azithrocin | Azithromycin | 500 mg | tablet | macrolide |
| Cef-3 | Cefixime | 200 mg | capsule | cephalosporin |
| Sefrad | Cephradine | 500 mg | capsule | cephalosporin |
| Odoxil | Cefadroxil | 500 mg | capsule | cephalosporin |
| Cefotil | Cefuroxime Axetil | 500 mg | tablet | cephalosporin |
| Amodis | Metronidazole | 400 mg | tablet | nitroimidazole |
| Filmet | Metronidazole | 400 mg | tablet | nitroimidazole |
| Flagyl | Metronidazole | 400 mg | tablet | nitroimidazole |
| Seclo | Omeprazole | 20 mg | capsule | ppi |
| Sergel | Esomeprazole | 20 mg | capsule | ppi |
| Maxpro | Esomeprazole | 20 mg | tablet | ppi |
| Pantonix | Pantoprazole | 20 mg | tablet | ppi |
| Alatrol | Cetirizine | 10 mg | tablet | antihistamine |
| Fexo | Fexofenadine | 120 mg | tablet | antihistamine |
| Ceevit | Vitamin C (Ascorbic Acid) | 250 mg | tablet | vitamin |

**Generic-only rows** (`brand_name` = null)

| Generic | Strength | Form | Drug class |
|---|---|---|---|
| Paracetamol | 120 mg/5 ml | suspension | paracetamol |
| Ibuprofen | 400 mg | tablet | nsaid |
| Ibuprofen | 100 mg/5 ml | suspension | nsaid |
| Etoricoxib | 90 mg | tablet | nsaid |
| Amoxicillin | 125 mg/5 ml | suspension | penicillin |
| Clindamycin | 300 mg | capsule | lincosamide |
| Metronidazole | 200 mg/5 ml | suspension | nitroimidazole |
| Tranexamic Acid | 500 mg | tablet | antifibrinolytic |
| Fluconazole | 50 mg | capsule | antifungal |
| Nystatin | 100,000 IU/ml | suspension | antifungal |
| Miconazole | 2% | gel | antifungal |
| Acyclovir | 400 mg | tablet | antiviral |
| Acyclovir | 5% | ointment | antiviral |
| Vitamin B Complex | — | tablet | vitamin |
| Chlorhexidine Gluconate | 0.2% | mouthwash | antiseptic |
| Povidone-Iodine | 1% | mouthwash | antiseptic |
| Benzydamine Hydrochloride | 0.15% | mouthwash | nsaid |
| Lidocaine | 2% | gel | local_anaesthetic |
| Triamcinolone Acetonide | 0.1% | paste | corticosteroid |
| Metronidazole + Chlorhexidine | 1% + 0.25% | gel | nitroimidazole |
| Potassium Nitrate | 5% | toothpaste | desensitizing |

No per-medicine default instructions are seeded (`PROJECT.md` §17, decision 14).

---

## 3. Dosage patterns (Bangla)

Numbers in `১+০+১` style mean morning + noon + night. `code` is ASCII for sorting and matching. The prescription builder shows chips whose `form_group` matches the medicine's form, plus `any`.

| label_bn | code | form_group | Meaning (for developers) |
|---|---|---|---|
| ১+০+০ | 1-0-0 | oral_solid | 1 in the morning |
| ০+১+০ | 0-1-0 | oral_solid | 1 at noon |
| ০+০+১ | 0-0-1 | oral_solid | 1 at night |
| ১+০+১ | 1-0-1 | oral_solid | morning and night |
| ১+১+১ | 1-1-1 | oral_solid | three times a day |
| ১+১+১+১ | 1-1-1-1 | oral_solid | four times a day |
| ½+০+½ | 0.5-0-0.5 | oral_solid | half, morning and night |
| ২+০+২ | 2-0-2 | oral_solid | 2 morning and night |
| একদিন পর পর ১টি | alt-day-1 | oral_solid | 1 every other day |
| সপ্তাহে ১টি | weekly-1 | oral_solid | 1 per week |
| শুধু একবার ১টি | single-dose | oral_solid | single dose |
| ব্যথা হলে ১টি (দিনে সর্বোচ্চ ৩টি) | prn-pain | oral_solid | 1 when in pain, max 3 a day |
| প্রয়োজন হলে | prn | any | as needed |
| ১ চামচ (৫ মিলি) করে দিনে ২ বার | liq-5ml-bd | oral_liquid | 5 ml twice a day |
| ১ চামচ (৫ মিলি) করে দিনে ৩ বার | liq-5ml-tds | oral_liquid | 5 ml three times a day |
| ½ চামচ (২.৫ মিলি) করে দিনে ৩ বার | liq-2.5ml-tds | oral_liquid | 2.5 ml three times a day |
| ২ চামচ (১০ মিলি) করে দিনে ৩ বার | liq-10ml-tds | oral_liquid | 10 ml three times a day |
| ১০ মিলি দিয়ে দিনে ২ বার ৩০ সেকেন্ড কুলি করবেন (গিলবেন না) | mw-10ml-bd | mouthwash | rinse 10 ml for 30 s twice a day, don't swallow |
| ১০ মিলি দিয়ে দিনে ৩ বার ৩০ সেকেন্ড কুলি করবেন (গিলবেন না) | mw-10ml-tds | mouthwash | same, three times a day |
| সমপরিমাণ পানির সাথে মিশিয়ে দিনে ৩ বার কুলি করবেন | mw-diluted-tds | mouthwash | dilute 1:1 with water, rinse three times a day |
| আক্রান্ত স্থানে দিনে ২ বার লাগাবেন | top-bd | topical | apply to the affected area twice a day |
| আক্রান্ত স্থানে দিনে ৩ বার লাগাবেন | top-tds | topical | apply three times a day |
| খাবারের পর ও রাতে ঘুমানোর আগে আক্রান্ত স্থানে লাগাবেন | top-pc-hs | topical | apply after meals and at bedtime |
| দিনে ২ বার এই পেস্ট দিয়ে ব্রাশ করবেন | tp-bd | toothpaste | brush with this paste twice a day |
| রাতে ব্রাশের পর শিরশির করা দাঁতে অল্প পেস্ট লাগিয়ে রাখবেন (কুলি করবেন না) | tp-apply-night | toothpaste | after brushing at night, leave a little paste on sensitive teeth, don't rinse |

---

## 4. Meal timings (Bangla)

Optional on a prescription item (usually left empty for mouthwash, gel and toothpaste).

| label_bn | code |
|---|---|
| খাবার পরে | after_meal |
| খাবার আগে | before_meal |
| খাবারের ৩০ মিনিট আগে | before_meal_30 |
| খাবারের সাথে | with_meal |
| খালি পেটে | empty_stomach |
| রাতে ঘুমানোর আগে | bedtime |
| যেকোনো সময় | any_time |

---

## 5. Durations (Bangla)

| label_bn | days_count |
|---|---|
| ৩ দিন | 3 |
| ৫ দিন | 5 |
| ৭ দিন | 7 |
| ১০ দিন | 10 |
| ১৪ দিন | 14 |
| ২১ দিন | 21 |
| ১ মাস | 30 |
| ৩ মাস | 90 |
| চলবে | null |
| ব্যথা থাকা পর্যন্ত | null |
| পরবর্তী সাক্ষাৎ পর্যন্ত | null |

---

## 6. Advice templates (Bangla, grouped)

`group_name` is English (shown as the group header in the builder); `text_bn` is printed on the prescription. Clicking a group adds all its lines.

**General oral care**
- দিনে দুইবার (সকালে নাস্তার পর ও রাতে ঘুমানোর আগে) নরম ব্রাশ দিয়ে দাঁত ব্রাশ করবেন।
- ফ্লোরাইডযুক্ত টুথপেস্ট ব্যবহার করবেন।
- মিষ্টি ও আঠালো খাবার কম খাবেন।
- ধূমপান, জর্দা, গুল ও পান-সুপারি এড়িয়ে চলবেন।
- প্রতি ৬ মাস পর পর দাঁত পরীক্ষা করাবেন।

**Post-extraction**
- তুলা/গজ ৩০–৪৫ মিনিট শক্ত করে কামড় দিয়ে রাখবেন।
- ২৪ ঘণ্টা কুলি করবেন না এবং থুথু ফেলবেন না।
- ২৪ ঘণ্টা পর থেকে দিনে ৩–৪ বার কুসুম গরম লবণ পানি দিয়ে আলতো করে কুলি করবেন।
- প্রথম দিন ঠান্ডা ও নরম খাবার খাবেন; গরম খাবার ও পানীয় এড়িয়ে চলবেন।
- স্ট্র দিয়ে কিছু পান করবেন না।
- ক্ষতস্থানে জিহ্বা বা আঙুল লাগাবেন না।
- প্রথম দিন গালের বাইরে থেকে বরফের সেঁক দেবেন (১০ মিনিট দিয়ে ১০ মিনিট বিরতি)।
- রক্তপাত বন্ধ না হলে পরিষ্কার গজ দিয়ে চেপে ধরবেন এবং দ্রুত যোগাযোগ করবেন।

**After root canal**
- চিকিৎসা শেষ না হওয়া পর্যন্ত ওই পাশে শক্ত খাবার চিবাবেন না।
- রুট ক্যানালের পর দাঁতে ক্যাপ/ক্রাউন করে নেবেন, নইলে দাঁত ভেঙে যেতে পারে।
- কয়েকদিন হালকা ব্যথা স্বাভাবিক; ব্যথা বা ফোলা বাড়লে যোগাযোগ করবেন।

**After scaling**
- স্কেলিংয়ের পর কয়েকদিন দাঁত শিরশির করতে পারে, এটি স্বাভাবিক।
- দিনে ২ বার কুসুম গরম লবণ পানি দিয়ে কুলি করবেন।
- কয়েকদিন অতিরিক্ত গরম বা ঠান্ডা খাবার এড়িয়ে চলবেন।

**After filling**
- অবশ ভাব না কাটা পর্যন্ত কিছু খাবেন না।
- অ্যামালগাম (সিলভার) ফিলিংয়ের পর ২৪ ঘণ্টা ওই পাশে চিবাবেন না।
- কামড় দিলে দাঁত উঁচু লাগলে যোগাযোগ করবেন।

**Dentures**
- রাতে ঘুমানোর আগে ডেনচার খুলে পরিষ্কার পানিতে রেখে দেবেন।
- প্রতিদিন নরম ব্রাশ দিয়ে ডেনচার পরিষ্কার করবেন।
- ডেনচারে ব্যথা বা ঘা হলে নিজে ঘষাঘষি না করে যোগাযোগ করবেন।

**Braces**
- শক্ত ও আঠালো খাবার (চুইংগাম, চকলেট, হাড়) এড়িয়ে চলবেন।
- প্রতিবার খাবারের পর দাঁত ব্রাশ করবেন।
- ব্র্যাকেট বা তার খুলে গেলে দ্রুত যোগাযোগ করবেন।

**Medication**
- অ্যান্টিবায়োটিকের কোর্স পুরোপুরি শেষ করবেন, মাঝপথে বন্ধ করবেন না।
- ব্যথার ওষুধ খালি পেটে খাবেন না।
- ওষুধ খেয়ে চুলকানি, ফুসকুড়ি বা শ্বাসকষ্ট হলে ওষুধ বন্ধ করে দ্রুত যোগাযোগ করবেন।

**Follow-up**
- নির্ধারিত তারিখে পরবর্তী ফলোআপে আসবেন।
- ব্যথা, ফোলা বা জ্বর বাড়লে দ্রুত যোগাযোগ করবেন।

---

## 7. Quick texts (English)

One-click chips in the prescription builder's clinical notes (`PROJECT.md` §5.7).

**chief_complaint:** Toothache · Pain while chewing · Sensitivity to hot/cold · Bleeding gums · Swollen gums/face · Broken or chipped tooth · Food lodgement · Bad breath · Loose tooth · Missing tooth · Discoloured teeth · Irregular teeth · Mouth ulcer · Denture problem · Routine check-up

**examination:** Deep caries · Tender on percussion (TOP +ve) · Mobility — Grade I · Mobility — Grade II · Mobility — Grade III · Calculus and stains · Bleeding on probing · Periodontal pocket · Intraoral swelling · Sinus tract / pus discharge · Fractured tooth · Defective restoration · Partially erupted tooth · Gingival recession · Attrition / abrasion · Missing teeth

**diagnosis:** Dental caries · Reversible pulpitis · Irreversible pulpitis · Pulp necrosis · Acute apical periodontitis · Periapical abscess · Chronic gingivitis · Chronic periodontitis · Pericoronitis · Impacted third molar · Dentine hypersensitivity · Cracked / fractured tooth · Partially edentulous · Completely edentulous · Malocclusion · Aphthous ulcer · Oral candidiasis

**investigation:** IOPA X-ray · Bitewing X-ray · OPG · CBCT · Pulp vitality test · CBC · RBS · FBS · HbA1c · BT/CT · PT/INR · HBsAg · Anti-HCV · Serum creatinine

---

## 8. Patient conditions, allergy flags and allergy warnings

These are **app constants** (in `lib/clinical-flags.ts`), not catalog tables. Clinics record anything else in the free-text notes.

**Medical conditions** (amber chips on the patient header): Diabetes · Hypertension · Heart disease · Asthma · Bleeding disorder · On blood thinners · Pregnancy · Breastfeeding · Hepatitis B · Hepatitis C · Kidney disease · Liver disease · Epilepsy · Thyroid disorder

**Allergy flags** (red chips): Penicillin · Cephalosporin · Sulfa drugs · NSAIDs / Aspirin · Metronidazole · Local anaesthetic · Latex · Chlorhexidine

**Allergy → medicine warnings** (`PROJECT.md` §5.7)

| Allergy flag | Matches | Level |
|---|---|---|
| Penicillin | `drug_class = penicillin` | block |
| Penicillin | `drug_class = cephalosporin` | caution (possible cross-allergy) |
| Cephalosporin | `drug_class = cephalosporin` | block |
| NSAIDs / Aspirin | `drug_class = nsaid` | block |
| Metronidazole | `drug_class = nitroimidazole` | block |
| Local anaesthetic | `drug_class = local_anaesthetic` | block |
| Chlorhexidine | `generic_name` contains "Chlorhexidine" | block |
| Sulfa drugs, Latex | — (shown on the header only) | — |

---

## 9. Super Admin bootstrap

`pnpm db:seed` creates the first Super Admin if no `SUPER_ADMIN` user exists, from `SEED_SUPER_ADMIN_NAME`, `SEED_SUPER_ADMIN_EMAIL` and `SEED_SUPER_ADMIN_PASSWORD` (`role = SUPER_ADMIN`, `tenant_id = null`, `email_verified = true`). The password must be changed after first login. If a Super Admin already exists, this step does nothing.

---

## 10. Defaults for every new clinic

**`tenant_features`** — one row per key, all `platform_enabled = true`, `tenant_enabled = true` unless the Super Admin unticks them in the create-clinic wizard: `public_booking`, `email_notifications`, `billing`, `reports`, `camera_scan`.

**`tenant_counters`** — `APT`, `RX`, `INV`, `RPT`, `CARD`, each with `next_value = 1`. `SERIAL:{yyyy-mm-dd}` rows are created on first use each day.

**`chairs`** — one row: "Chair 1".

---

## 11. Demo data (development and preview only)

`pnpm db:seed:demo` refuses to run when `NODE_ENV=production`. It creates:
- Clinic "Demo Dental Care" — slug `demo`, short code `DDC`, mode `PRE_PRINTED`, card length 10–16, hours Saturday–Thursday 17:00–23:00, Friday closed, all features on, service prices filled with sample values.
- Users (password `Demo@12345`): `admin@demo.test` (TENANT_ADMIN, `is_doctor`), `doctor@demo.test` (DOCTOR), `reception@demo.test` (RECEPTIONIST).
- 20 patients with 10-digit card numbers `1000000001`–`1000000020` (a few with allergy flags and conditions; two sharing a phone number).
- Today: 8 appointments across both dentists, with queue entries in different columns; last week: completed visits with prescriptions, invoices (paid, partial and due) and payments.
- One pending online booking from a new patient.
