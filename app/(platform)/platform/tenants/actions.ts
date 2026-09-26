"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin, invalidateSession } from "@/lib/session";
import { createClinicWithMasterCatalog } from "@/lib/clinic/create-clinic";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export async function createClinicAction(formData: FormData): Promise<{
  success?: boolean;
  tenantId?: string;
  error?: string;
}> {
  await requireSuperAdmin();

  const name = (formData.get("name") as string || "").trim();
  const slug = (formData.get("slug") as string || "").toLowerCase().trim();
  const shortCode = (formData.get("shortCode") as string || "").toUpperCase().trim();
  const phone = (formData.get("phone") as string || "").trim() || undefined;
  const email = (formData.get("email") as string || "").trim() || undefined;
  const address = (formData.get("address") as string || "").trim() || undefined;

  const adminName = (formData.get("adminName") as string || "").trim();
  const adminEmail = (formData.get("adminEmail") as string || "").toLowerCase().trim();
  const adminPassword = (formData.get("adminPassword") as string || "").trim() || "ClinicAdmin123!";
  const adminIsDoctor = formData.get("adminIsDoctor") === "on";
  const adminDoctorTitle = (formData.get("adminDoctorTitle") as string || "").trim() || undefined;
  const adminDoctorSpecialty = (formData.get("adminDoctorSpecialty") as string || "").trim() || undefined;
  const adminDoctorRegNo = (formData.get("adminDoctorRegNo") as string || "").trim() || undefined;

  const planName = (formData.get("planName") as string || "").trim() || "Standard";
  const priceBdt = parseInt(formData.get("priceBdt") as string, 10) || 2000;
  const billingCycle = (formData.get("billingCycle") as "monthly" | "yearly") || "monthly";

  // Validate required inputs
  if (!name) {
    return { error: "Clinic Name is required." };
  }
  if (!slug) {
    return { error: "Public URL Slug is required." };
  }
  if (!shortCode) {
    return { error: "Short Code is required." };
  }
  if (!adminName) {
    return { error: "Administrator Full Name is required." };
  }
  if (!adminEmail) {
    return { error: "Administrator Email Address is required." };
  }

  try {
    // 1. Check unique slug
    const [existingSlug] = await db
      .select({ id: schema.tenants.id })
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, slug))
      .limit(1);

    if (existingSlug) {
      return { error: `The URL slug "/book/${slug}" is already taken by another clinic. Please choose another slug.` };
    }

    // 2. Check unique short code
    const [existingShortCode] = await db
      .select({ id: schema.tenants.id })
      .from(schema.tenants)
      .where(eq(schema.tenants.shortCode, shortCode))
      .limit(1);

    if (existingShortCode) {
      return { error: `The short code "${shortCode}" is already taken. Please choose another code.` };
    }

    // 3. Check unique admin user email
    const [existingUser] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, adminEmail))
      .limit(1);

    if (existingUser) {
      return { error: `An account with email "${adminEmail}" already exists. Please choose a different administrator email.` };
    }

    // 4. Provision tenant, batch clone catalog, and create admin user
    const result = await createClinicWithMasterCatalog({
      name,
      slug,
      shortCode,
      phone,
      email,
      address,
      adminName,
      adminEmail,
      adminPassword,
      adminIsDoctor,
      adminDoctorTitle,
      adminDoctorSpecialty,
      adminDoctorRegNo,
      planName,
      priceBdt,
      billingCycle,
    });

    revalidatePath("/platform/tenants");
    return { success: true, tenantId: result.tenant.id };
  } catch (err: any) {
    console.error("[CREATE CLINIC ACTION ERROR]:", err);
    return { error: err?.message || "Failed to create clinic. Please try again." };
  }
}

export async function toggleTenantStatusAction(
  tenantId: string,
  newStatus: "active" | "suspended",
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();

  try {
    const [existing] = await db
      .select({
        id: schema.tenants.id,
        name: schema.tenants.name,
        status: schema.tenants.status,
      })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId))
      .limit(1);

    if (!existing) {
      return { success: false, error: "Tenant clinic not found." };
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      // 1. Update tenant status and suspension metadata
      await tx
        .update(schema.tenants)
        .set({
          status: newStatus,
          suspendedAt: newStatus === "suspended" ? now : null,
          suspendedReason:
            newStatus === "suspended"
              ? reason?.trim() || "Suspended by Super Administrator"
              : null,
          updatedAt: now,
        })
        .where(eq(schema.tenants.id, tenantId));

      // 2. Keep platform subscription status in sync
      await tx
        .update(schema.platformSubscriptions)
        .set({
          status: newStatus === "suspended" ? "suspended" : "active",
          updatedAt: now,
        })
        .where(eq(schema.platformSubscriptions.tenantId, tenantId));
    });

    // Invalidate in-memory session cache so any active staff sessions are instantly revoked
    invalidateSession();

    revalidatePath("/platform/tenants");
    revalidatePath(`/platform/tenants/${tenantId}`);
    revalidatePath("/platform/subscriptions");
    revalidatePath("/platform");

    return { success: true };
  } catch (err: any) {
    console.error("[TOGGLE TENANT STATUS ERROR]:", err);
    return { success: false, error: err?.message || "Failed to update tenant status." };
  }
}
