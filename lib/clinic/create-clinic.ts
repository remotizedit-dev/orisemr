import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";

export interface CreateClinicInput {
  name: string;
  slug: string;
  shortCode: string;
  phone?: string;
  email?: string;
  address?: string;
  brandColor?: string;
  patientIdMode?: "PRE_PRINTED" | "AUTO_GENERATE";
  adminName: string;
  adminEmail: string;
  adminPassword?: string;
  adminIsDoctor?: boolean;
  adminDoctorTitle?: string;
  adminDoctorSpecialty?: string;
  adminDoctorRegNo?: string;
  planName?: string;
  priceBdt?: number;
  billingCycle?: "monthly" | "yearly";
}

/**
 * Creates a clinic atomically in a single transaction:
 * - Inserts tenant row
 * - Clones all active master catalogs (services with category mapping, medicines, presets)
 * - Seeds default tenant features and counters
 * - Creates default "Chair 1"
 * - Creates clinic Admin user
 * - Creates initial platform subscription
 */
export async function createClinicWithMasterCatalog(input: CreateClinicInput) {
  const result = await db.transaction(async (tx) => {
    // 1. Create tenant
    const [tenant] = await tx
      .insert(schema.tenants)
      .values({
        name: input.name,
        slug: input.slug.toLowerCase().trim(),
        shortCode: input.shortCode.toUpperCase().trim(),
        phone: input.phone,
        email: input.email,
        address: input.address,
        brandColor: input.brandColor || "#2A5CAA",
        patientIdMode: input.patientIdMode || "PRE_PRINTED",
      })
      .returning();

    const tenantId = tenant.id;

    // 2. Clone master service categories
    const masterCats = await tx
      .select()
      .from(schema.masterServiceCategories)
      .where(eq(schema.masterServiceCategories.isActive, true));

    const categoryMap = new Map<string, string>(); // masterId -> clinicCategoryId
    for (const mc of masterCats) {
      const [clinicCat] = await tx
        .insert(schema.serviceCategories)
        .values({
          tenantId,
          masterId: mc.id,
          source: "master",
          name: mc.name,
          sortOrder: mc.sortOrder,
          isActive: true,
        })
        .returning();
      categoryMap.set(mc.id, clinicCat.id);
    }

    // 3. Clone master services
    const masterSvcs = await tx
      .select()
      .from(schema.masterServices)
      .where(eq(schema.masterServices.isActive, true));

    for (const ms of masterSvcs) {
      const clinicCatId = categoryMap.get(ms.categoryId);
      if (!clinicCatId) continue;

      await tx.insert(schema.services).values({
        tenantId,
        masterId: ms.id,
        categoryId: clinicCatId,
        source: "master",
        name: ms.name,
        durationMinutes: ms.durationMinutes,
        priceBdt: ms.priceBdt || 0,
        bookableOnline: ms.bookableOnline,
        sortOrder: ms.sortOrder,
        isActive: true,
      });
    }

    // 4. Clone master medicines
    const masterMeds = await tx
      .select()
      .from(schema.masterMedicines)
      .where(eq(schema.masterMedicines.isActive, true));

    for (const mm of masterMeds) {
      await tx.insert(schema.medicines).values({
        tenantId,
        masterId: mm.id,
        source: "master",
        brandName: mm.brandName,
        genericName: mm.genericName,
        strength: mm.strength,
        form: mm.form,
        drugClass: mm.drugClass,
        sortOrder: mm.sortOrder,
        isActive: true,
      });
    }

    // 5. Clone master dosage patterns
    const masterDp = await tx
      .select()
      .from(schema.masterDosagePatterns)
      .where(eq(schema.masterDosagePatterns.isActive, true));

    for (const dp of masterDp) {
      await tx.insert(schema.dosagePatterns).values({
        tenantId,
        masterId: dp.id,
        source: "master",
        labelBn: dp.labelBn,
        code: dp.code,
        formGroup: dp.formGroup,
        sortOrder: dp.sortOrder,
        isActive: true,
      });
    }

    // 6. Clone master meal timings
    const masterMt = await tx
      .select()
      .from(schema.masterMealTimings)
      .where(eq(schema.masterMealTimings.isActive, true));

    for (const mt of masterMt) {
      await tx.insert(schema.mealTimings).values({
        tenantId,
        masterId: mt.id,
        source: "master",
        labelBn: mt.labelBn,
        code: mt.code,
        sortOrder: mt.sortOrder,
        isActive: true,
      });
    }

    // 7. Clone master duration options
    const masterDur = await tx
      .select()
      .from(schema.masterDurationOptions)
      .where(eq(schema.masterDurationOptions.isActive, true));

    for (const dur of masterDur) {
      await tx.insert(schema.durationOptions).values({
        tenantId,
        masterId: dur.id,
        source: "master",
        labelBn: dur.labelBn,
        daysCount: dur.daysCount,
        sortOrder: dur.sortOrder,
        isActive: true,
      });
    }

    // 8. Clone master advice templates
    const masterAdv = await tx
      .select()
      .from(schema.masterAdviceTemplates)
      .where(eq(schema.masterAdviceTemplates.isActive, true));

    for (const adv of masterAdv) {
      await tx.insert(schema.adviceTemplates).values({
        tenantId,
        masterId: adv.id,
        source: "master",
        groupName: adv.groupName,
        textBn: adv.textBn,
        sortOrder: adv.sortOrder,
        isActive: true,
      });
    }

    // 9. Clone master quick texts
    const masterQt = await tx
      .select()
      .from(schema.masterQuickTexts)
      .where(eq(schema.masterQuickTexts.isActive, true));

    for (const qt of masterQt) {
      await tx.insert(schema.quickTexts).values({
        tenantId,
        masterId: qt.id,
        source: "master",
        kind: qt.kind,
        text: qt.text,
        sortOrder: qt.sortOrder,
        isActive: true,
      });
    }

    // 10. Seed tenant features
    const featureKeys = [
      "public_booking",
      "email_notifications",
      "billing",
      "reports",
      "camera_scan",
    ];
    for (const featureKey of featureKeys) {
      await tx.insert(schema.tenantFeatures).values({
        tenantId,
        featureKey,
        platformEnabled: true,
        tenantEnabled: true,
      });
    }

    // 11. Seed tenant counters
    const counterKeys = ["APT", "RX", "INV", "RPT", "CARD"];
    for (const key of counterKeys) {
      await tx.insert(schema.tenantCounters).values({
        tenantId,
        key,
        nextValue: 1,
      });
    }

    // 12. Seed default chair
    await tx.insert(schema.chairs).values({
      tenantId,
      name: "Chair 1",
      isActive: true,
      sortOrder: 1,
    });

    // 13. Create initial platform subscription
    const now = new Date();
    const currentPeriodEnd = new Date(now);
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

    await tx.insert(schema.platformSubscriptions).values({
      tenantId,
      planName: input.planName || "Standard",
      priceBdt: input.priceBdt ?? 2000,
      billingCycle: input.billingCycle || "monthly",
      status: "active",
      currentPeriodStart: now.toISOString().split("T")[0],
      currentPeriodEnd: currentPeriodEnd.toISOString().split("T")[0],
    });

    return { tenant };
  });

  // 14. Create Admin User using Better Auth
  let adminUserId: string | null = null;
  if (input.adminEmail) {
    try {
      const authResult = await auth.api.signUpEmail({
        body: {
          name: input.adminName,
          email: input.adminEmail,
          password: input.adminPassword || "ClinicAdmin123!",
        },
      });

      if (authResult?.user) {
        adminUserId = authResult.user.id;
        await db
          .update(schema.users)
          .set({
            tenantId: result.tenant.id,
            role: "TENANT_ADMIN",
            isDoctor: input.adminIsDoctor ?? false,
            doctorTitle: input.adminDoctorTitle,
            doctorSpecialty: input.adminDoctorSpecialty,
            doctorRegNo: input.adminDoctorRegNo,
            status: "active",
            emailVerified: true,
            preferences: {
              mustChangePassword: true,
            },
          })
          .where(eq(schema.users.id, adminUserId));
      }
    } catch (e) {
      console.warn("Notice: user account creation during clinic onboarding:", e);
    }
  }

  return {
    tenant: result.tenant,
    adminUserId,
  };
}
