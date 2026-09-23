import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  MASTER_ADVICE_TEMPLATES,
  MASTER_CATEGORIES,
  MASTER_DOSAGE_PATTERNS,
  MASTER_DURATIONS,
  MASTER_MEAL_TIMINGS,
  MASTER_MEDICINES,
  MASTER_QUICK_TEXTS,
  MASTER_SERVICES,
} from "./master-data";

async function runSeed() {
  console.log("🌱 Starting Oris EMR Master Seed...");

  // 1. Categories
  console.log("Seeding master service categories...");
  const categoryMap = new Map<string, string>();
  for (const cat of MASTER_CATEGORIES) {
    const [inserted] = await db
      .insert(schema.masterServiceCategories)
      .values({
        key: cat.key,
        name: cat.name,
        sortOrder: cat.sortOrder,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: schema.masterServiceCategories.key,
        set: {
          name: cat.name,
          sortOrder: cat.sortOrder,
          updatedAt: new Date(),
        },
      })
      .returning({ id: schema.masterServiceCategories.id, key: schema.masterServiceCategories.key });

    categoryMap.set(inserted.key, inserted.id);
  }

  // 2. Services
  console.log("Seeding master services...");
  for (const svc of MASTER_SERVICES) {
    const categoryId = categoryMap.get(svc.categoryKey);
    if (!categoryId) continue;

    await db
      .insert(schema.masterServices)
      .values({
        key: svc.key,
        categoryId,
        name: svc.name,
        durationMinutes: svc.durationMinutes,
        priceBdt: svc.priceBdt,
        bookableOnline: svc.bookableOnline,
        sortOrder: svc.sortOrder,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: schema.masterServices.key,
        set: {
          name: svc.name,
          categoryId,
          durationMinutes: svc.durationMinutes,
          priceBdt: svc.priceBdt,
          bookableOnline: svc.bookableOnline,
          sortOrder: svc.sortOrder,
          updatedAt: new Date(),
        },
      });
  }

  // 3. Medicines
  console.log("Seeding master medicines...");
  for (const med of MASTER_MEDICINES) {
    await db
      .insert(schema.masterMedicines)
      .values({
        key: med.key,
        brandName: med.brandName,
        genericName: med.genericName,
        strength: med.strength,
        form: med.form,
        drugClass: med.drugClass,
        sortOrder: med.sortOrder,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: schema.masterMedicines.key,
        set: {
          brandName: med.brandName,
          genericName: med.genericName,
          strength: med.strength,
          form: med.form,
          drugClass: med.drugClass,
          sortOrder: med.sortOrder,
          updatedAt: new Date(),
        },
      });
  }

  // 4. Dosage Patterns
  console.log("Seeding master dosage patterns (Bangla)...");
  for (const dp of MASTER_DOSAGE_PATTERNS) {
    await db
      .insert(schema.masterDosagePatterns)
      .values({
        key: dp.key,
        labelBn: dp.labelBn,
        code: dp.code,
        formGroup: dp.formGroup,
        sortOrder: dp.sortOrder,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: schema.masterDosagePatterns.key,
        set: {
          labelBn: dp.labelBn,
          code: dp.code,
          formGroup: dp.formGroup,
          sortOrder: dp.sortOrder,
          updatedAt: new Date(),
        },
      });
  }

  // 5. Meal Timings
  console.log("Seeding master meal timings (Bangla)...");
  for (const mt of MASTER_MEAL_TIMINGS) {
    await db
      .insert(schema.masterMealTimings)
      .values({
        key: mt.key,
        labelBn: mt.labelBn,
        code: mt.code,
        sortOrder: mt.sortOrder,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: schema.masterMealTimings.key,
        set: {
          labelBn: mt.labelBn,
          code: mt.code,
          sortOrder: mt.sortOrder,
          updatedAt: new Date(),
        },
      });
  }

  // 6. Durations
  console.log("Seeding master durations (Bangla)...");
  for (const dur of MASTER_DURATIONS) {
    await db
      .insert(schema.masterDurationOptions)
      .values({
        key: dur.key,
        labelBn: dur.labelBn,
        daysCount: dur.daysCount,
        sortOrder: dur.sortOrder,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: schema.masterDurationOptions.key,
        set: {
          labelBn: dur.labelBn,
          daysCount: dur.daysCount,
          sortOrder: dur.sortOrder,
          updatedAt: new Date(),
        },
      });
  }

  // 7. Advice Templates
  console.log("Seeding master advice templates (Bangla)...");
  for (const adv of MASTER_ADVICE_TEMPLATES) {
    await db
      .insert(schema.masterAdviceTemplates)
      .values({
        key: adv.key,
        groupName: adv.groupName,
        textBn: adv.textBn,
        sortOrder: adv.sortOrder,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: schema.masterAdviceTemplates.key,
        set: {
          groupName: adv.groupName,
          textBn: adv.textBn,
          sortOrder: adv.sortOrder,
          updatedAt: new Date(),
        },
      });
  }

  // 8. Quick Texts
  console.log("Seeding master quick texts (English)...");
  for (const qt of MASTER_QUICK_TEXTS) {
    await db
      .insert(schema.masterQuickTexts)
      .values({
        key: qt.key,
        kind: qt.kind,
        text: qt.text,
        sortOrder: qt.sortOrder,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: schema.masterQuickTexts.key,
        set: {
          kind: qt.kind,
          text: qt.text,
          sortOrder: qt.sortOrder,
          updatedAt: new Date(),
        },
      });
  }

  // 9. Bootstrap Super Admin Account
  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL || "admin@orisemr.com";
  const superAdminName = process.env.SEED_SUPER_ADMIN_NAME || "Super Admin";
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD || "SuperAdmin123!";

  console.log(`Checking Super Admin bootstrap for ${superAdminEmail}...`);
  const [existingSuperAdmin] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.role, "SUPER_ADMIN"))
    .limit(1);

  if (!existingSuperAdmin) {
    console.log("Creating initial Super Admin account...");
    try {
      const result = await auth.api.signUpEmail({
        body: {
          name: superAdminName,
          email: superAdminEmail,
          password: superAdminPassword,
        },
      });

      if (result && result.user) {
        await db
          .update(schema.users)
          .set({
            role: "SUPER_ADMIN",
            tenantId: null,
            status: "active",
            emailVerified: true,
          })
          .where(eq(schema.users.id, result.user.id));
        console.log("✅ Super Admin created successfully.");
      }
    } catch (err) {
      console.warn("Notice during Super Admin bootstrap:", err);
    }
  } else {
    console.log("Super Admin account already exists. Skipping bootstrap.");
  }

  console.log("🎉 Oris EMR Master Seed Complete!");
}

runSeed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .then(() => process.exit(0));
