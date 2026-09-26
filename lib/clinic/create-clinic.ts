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
 * Creates a clinic atomically in a single transaction with high-performance batch inserts:
 * - Inserts tenant row
 * - Clones all active master catalogs (services with category mapping, medicines, presets) using bulk batch queries
 * - Seeds default tenant features and counters in batch
 * - Creates default "Chair 1"
 * - Creates clinic Admin user via Better Auth
 * - Creates initial platform subscription
 */
export async function createClinicWithMasterCatalog(input: CreateClinicInput) {
  const cleanEmail = input.adminEmail.toLowerCase().trim();

  // 1. Atomically provision tenant, cloned catalogs, and subscription in high-speed batches
  const result = await db.transaction(async (tx) => {
    // 1. Create tenant
    const [tenant] = await tx
      .insert(schema.tenants)
      .values({
        name: input.name.trim(),
        slug: input.slug.toLowerCase().trim(),
        shortCode: input.shortCode.toUpperCase().trim(),
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        brandColor: input.brandColor || "#2A5CAA",
        patientIdMode: input.patientIdMode || "PRE_PRINTED",
      })
      .returning();

    const tenantId = tenant.id;

    // 2. Clone master service categories in a single bulk insert
    const masterCats = await tx
      .select()
      .from(schema.masterServiceCategories)
      .where(eq(schema.masterServiceCategories.isActive, true));

    const categoryMap = new Map<string, string>(); // masterId -> clinicCategoryId
    if (masterCats.length > 0) {
      const insertedCats = await tx
        .insert(schema.serviceCategories)
        .values(
          masterCats.map((mc) => ({
            tenantId,
            masterId: mc.id,
            source: "master" as const,
            name: mc.name,
            sortOrder: mc.sortOrder,
            isActive: true,
          }))
        )
        .returning({
          id: schema.serviceCategories.id,
          masterId: schema.serviceCategories.masterId,
        });

      for (const ic of insertedCats) {
        if (ic.masterId) {
          categoryMap.set(ic.masterId, ic.id);
        }
      }
    }

    // 3. Clone master services in a single bulk insert
    const masterSvcs = await tx
      .select()
      .from(schema.masterServices)
      .where(eq(schema.masterServices.isActive, true));

    const servicesToInsert = masterSvcs
      .filter((ms) => categoryMap.has(ms.categoryId))
      .map((ms) => ({
        tenantId,
        masterId: ms.id,
        categoryId: categoryMap.get(ms.categoryId)!,
        source: "master" as const,
        name: ms.name,
        durationMinutes: ms.durationMinutes,
        priceBdt: ms.priceBdt || 0,
        bookableOnline: ms.bookableOnline,
        sortOrder: ms.sortOrder,
        isActive: true,
      }));

    if (servicesToInsert.length > 0) {
      await tx.insert(schema.services).values(servicesToInsert);
    }

    // 4. Clone master medicines in a single bulk insert
    const masterMeds = await tx
      .select()
      .from(schema.masterMedicines)
      .where(eq(schema.masterMedicines.isActive, true));

    if (masterMeds.length > 0) {
      await tx.insert(schema.medicines).values(
        masterMeds.map((mm) => ({
          tenantId,
          masterId: mm.id,
          source: "master" as const,
          brandName: mm.brandName,
          genericName: mm.genericName,
          strength: mm.strength,
          form: mm.form,
          drugClass: mm.drugClass,
          sortOrder: mm.sortOrder,
          isActive: true,
        }))
      );
    }

    // 5. Clone master dosage patterns in a single bulk insert
    const masterDp = await tx
      .select()
      .from(schema.masterDosagePatterns)
      .where(eq(schema.masterDosagePatterns.isActive, true));

    if (masterDp.length > 0) {
      await tx.insert(schema.dosagePatterns).values(
        masterDp.map((dp) => ({
          tenantId,
          masterId: dp.id,
          source: "master" as const,
          labelBn: dp.labelBn,
          code: dp.code,
          formGroup: dp.formGroup,
          sortOrder: dp.sortOrder,
          isActive: true,
        }))
      );
    }

    // 6. Clone master meal timings in a single bulk insert
    const masterMt = await tx
      .select()
      .from(schema.masterMealTimings)
      .where(eq(schema.masterMealTimings.isActive, true));

    if (masterMt.length > 0) {
      await tx.insert(schema.mealTimings).values(
        masterMt.map((mt) => ({
          tenantId,
          masterId: mt.id,
          source: "master" as const,
          labelBn: mt.labelBn,
          code: mt.code,
          sortOrder: mt.sortOrder,
          isActive: true,
        }))
      );
    }

    // 7. Clone master duration options in a single bulk insert
    const masterDur = await tx
      .select()
      .from(schema.masterDurationOptions)
      .where(eq(schema.masterDurationOptions.isActive, true));

    if (masterDur.length > 0) {
      await tx.insert(schema.durationOptions).values(
        masterDur.map((dur) => ({
          tenantId,
          masterId: dur.id,
          source: "master" as const,
          labelBn: dur.labelBn,
          daysCount: dur.daysCount,
          sortOrder: dur.sortOrder,
          isActive: true,
        }))
      );
    }

    // 8. Clone master advice templates in a single bulk insert
    const masterAdv = await tx
      .select()
      .from(schema.masterAdviceTemplates)
      .where(eq(schema.masterAdviceTemplates.isActive, true));

    if (masterAdv.length > 0) {
      await tx.insert(schema.adviceTemplates).values(
        masterAdv.map((adv) => ({
          tenantId,
          masterId: adv.id,
          source: "master" as const,
          groupName: adv.groupName,
          textBn: adv.textBn,
          sortOrder: adv.sortOrder,
          isActive: true,
        }))
      );
    }

    // 9. Clone master quick texts in a single bulk insert
    const masterQt = await tx
      .select()
      .from(schema.masterQuickTexts)
      .where(eq(schema.masterQuickTexts.isActive, true));

    if (masterQt.length > 0) {
      await tx.insert(schema.quickTexts).values(
        masterQt.map((qt) => ({
          tenantId,
          masterId: qt.id,
          source: "master" as const,
          kind: qt.kind,
          text: qt.text,
          sortOrder: qt.sortOrder,
          isActive: true,
        }))
      );
    }

    // 10. Seed tenant features in a single bulk insert
    const featureKeys = [
      "public_booking",
      "email_notifications",
      "billing",
      "reports",
      "camera_scan",
    ];
    await tx.insert(schema.tenantFeatures).values(
      featureKeys.map((featureKey) => ({
        tenantId,
        featureKey,
        platformEnabled: true,
        tenantEnabled: true,
      }))
    );

    // 11. Seed tenant counters in a single bulk insert
    const counterKeys = ["APT", "RX", "INV", "RPT", "CARD"];
    await tx.insert(schema.tenantCounters).values(
      counterKeys.map((key) => ({
        tenantId,
        key,
        nextValue: 1,
      }))
    );

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
    if (input.billingCycle === "yearly") {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    } else {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    }

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
  if (cleanEmail) {
    try {
      const authResult = await auth.api.signUpEmail({
        body: {
          name: input.adminName.trim(),
          email: cleanEmail,
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
            doctorTitle: input.adminDoctorTitle?.trim() || (input.adminIsDoctor ? "Dr." : null),
            doctorSpecialty: input.adminDoctorSpecialty?.trim() || null,
            doctorRegNo: input.adminDoctorRegNo?.trim() || null,
            status: "active",
            emailVerified: true,
            preferences: {
              mustChangePassword: true,
            },
          })
          .where(eq(schema.users.id, adminUserId));
      }
    } catch (e: any) {
      console.error("[CLINIC ADMIN ONBOARDING ERROR]:", e);
      throw new Error(`Failed to create clinic administrator account: ${e?.message || "Email may already be in use"}`);
    }
  }

  return {
    tenant: result.tenant,
    adminUserId,
  };
}
