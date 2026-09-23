"use server";

import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/session";
import { createClinicWithMasterCatalog } from "@/lib/clinic/create-clinic";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export async function createClinicAction(formData: FormData) {
  await requireSuperAdmin();

  const name = formData.get("name") as string;
  const slug = (formData.get("slug") as string).toLowerCase().trim();
  const shortCode = (formData.get("shortCode") as string).toUpperCase().trim();
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const address = formData.get("address") as string;

  const adminName = formData.get("adminName") as string;
  const adminEmail = formData.get("adminEmail") as string;
  const adminPassword = formData.get("adminPassword") as string;
  const adminIsDoctor = formData.get("adminIsDoctor") === "on";
  const adminDoctorTitle = formData.get("adminDoctorTitle") as string;
  const adminDoctorSpecialty = formData.get("adminDoctorSpecialty") as string;
  const adminDoctorRegNo = formData.get("adminDoctorRegNo") as string;

  const planName = (formData.get("planName") as string) || "Standard";
  const priceBdt = parseInt(formData.get("priceBdt") as string, 10) || 2000;
  const billingCycle = (formData.get("billingCycle") as "monthly" | "yearly") || "monthly";

  if (!name || !slug || !shortCode || !adminName || !adminEmail) {
    throw new Error("Missing required clinic or admin fields");
  }

  // Check unique slug and shortCode
  const existingSlug = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, slug))
    .limit(1);
  if (existingSlug.length > 0) {
    throw new Error(`The slug "${slug}" is already taken by another clinic.`);
  }

  const existingShortCode = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.shortCode, shortCode))
    .limit(1);
  if (existingShortCode.length > 0) {
    throw new Error(`The short code "${shortCode}" is already taken.`);
  }

  await createClinicWithMasterCatalog({
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

  redirect("/platform/tenants");
}
