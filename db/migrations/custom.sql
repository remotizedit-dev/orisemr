-- ==============================================================================
-- ORIS EMR - CUSTOM POSTGRESQL EXTENSIONS, CONSTRAINTS & INDEXES
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Appointment Overlap Exclusion Constraint
-- No two active appointments for the same dentist may overlap (final guard against race conditions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_no_overlap'
  ) THEN
    ALTER TABLE appointments ADD CONSTRAINT appointments_no_overlap
      EXCLUDE USING gist (
        doctor_id WITH =,
        tstzrange(start_time, end_time, '[)') WITH &&
      ) WHERE (status IN ('pending', 'confirmed') AND NOT is_overbooked);
  END IF;
END $$;

-- 3. Check Constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_tenant_role_chk') THEN
    ALTER TABLE users ADD CONSTRAINT users_tenant_role_chk
      CHECK (role <> 'SUPER_ADMIN' OR tenant_id IS NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_doctor_flag_chk') THEN
    ALTER TABLE users ADD CONSTRAINT users_doctor_flag_chk
      CHECK (role <> 'DOCTOR' OR is_doctor);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenants_card_len_chk') THEN
    ALTER TABLE tenants ADD CONSTRAINT tenants_card_len_chk
      CHECK (patient_id_min_len >= 10 AND patient_id_max_len <= 16 AND patient_id_min_len <= patient_id_max_len);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenants_short_code_chk') THEN
    ALTER TABLE tenants ADD CONSTRAINT tenants_short_code_chk
      CHECK (short_code ~ '^[A-Z0-9]{2,6}$');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenants_slug_chk') THEN
    ALTER TABLE tenants ADD CONSTRAINT tenants_slug_chk
      CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_card_digits_chk') THEN
    ALTER TABLE patients ADD CONSTRAINT patients_card_digits_chk
      CHECK (card_number ~ '^[0-9]{10,16}$');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_time_chk') THEN
    ALTER TABLE appointments ADD CONSTRAINT appointments_time_chk
      CHECK (end_time > start_time);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_patient_chk') THEN
    ALTER TABLE appointments ADD CONSTRAINT appointments_patient_chk
      CHECK (patient_id IS NOT NULL OR (pending_patient_name IS NOT NULL AND pending_patient_phone IS NOT NULL));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_confirmed_patient_chk') THEN
    ALTER TABLE appointments ADD CONSTRAINT appointments_confirmed_patient_chk
      CHECK (status NOT IN ('confirmed', 'completed', 'no_show') OR patient_id IS NOT NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_amounts_chk') THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_amounts_chk
      CHECK (total_bdt = subtotal_bdt - discount_bdt AND total_bdt >= 0 AND paid_bdt >= 0 AND paid_bdt <= total_bdt);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'twh_chk') THEN
    ALTER TABLE tenant_working_hours ADD CONSTRAINT twh_chk
      CHECK (weekday BETWEEN 0 AND 6 AND start_time < end_time);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ds_chk') THEN
    ALTER TABLE doctor_schedules ADD CONSTRAINT ds_chk
      CHECK (weekday BETWEEN 0 AND 6 AND start_time < end_time);
  END IF;
END $$;

-- 4. Partial Unique Indexes
CREATE UNIQUE INDEX IF NOT EXISTS invoices_code_uq ON invoices (tenant_id, invoice_code) WHERE invoice_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS attachments_rpt_uq ON attachments (tenant_id, report_code) WHERE report_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS queue_serial_uq ON queue_entries (tenant_id, date, serial_no) WHERE serial_no IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS service_categories_master_uq ON service_categories (tenant_id, master_id) WHERE master_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS services_master_uq ON services (tenant_id, master_id) WHERE master_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS medicines_master_uq ON medicines (tenant_id, master_id) WHERE master_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS dosage_patterns_master_uq ON dosage_patterns (tenant_id, master_id) WHERE master_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS meal_timings_master_uq ON meal_timings (tenant_id, master_id) WHERE master_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS duration_options_master_uq ON duration_options (tenant_id, master_id) WHERE master_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS advice_templates_master_uq ON advice_templates (tenant_id, master_id) WHERE master_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS quick_texts_master_uq ON quick_texts (tenant_id, master_id) WHERE master_id IS NOT NULL;

-- 5. Fuzzy Search Trigram Indexes
CREATE INDEX IF NOT EXISTS medicines_search_trgm ON medicines
  USING gin ((coalesce(brand_name, '') || ' ' || generic_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS patients_name_trgm ON patients
  USING gin (name gin_trgm_ops);
