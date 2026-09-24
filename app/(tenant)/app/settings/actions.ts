"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { can } from "@/lib/permissions";
import { auth } from "@/lib/auth";

export interface UpdateGeneralSettingsInput {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  brandColor?: string;
  slotGranularityMinutes: number;
  bookingBufferMinutes: number;
  publicBookingDaysAhead: number;
  publicBookingMinLeadMinutes: number;
  autoConfirmExistingPatientBookings: boolean;
  reminder24hEnabled: boolean;
  reminder2hEnabled: boolean;
  rxPaperSize: (typeof schema.paperSizeEnum.enumValues)[number];
  rxPrintLetterhead: boolean;
  rxTopMarginMm: number;
  invoicePaperSize: (typeof schema.paperSizeEnum.enumValues)[number];
}

export async function updateGeneralSettingsAction(input: UpdateGeneralSettingsInput) {
  const { tenant, user } = await requireClinicStaff();

  if (!can({ role: user.role as any, isDoctor: user.isDoctor }, "clinic_settings")) {
    throw new Error("Only Chamber Admins may modify clinic configuration");
  }

  await db
    .update(schema.tenants)
    .set({
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      brandColor: input.brandColor || null,
      slotGranularityMinutes: input.slotGranularityMinutes,
      bookingBufferMinutes: input.bookingBufferMinutes,
      publicBookingDaysAhead: input.publicBookingDaysAhead,
      publicBookingMinLeadMinutes: input.publicBookingMinLeadMinutes,
      autoConfirmExistingPatientBookings: input.autoConfirmExistingPatientBookings,
      reminder24hEnabled: input.reminder24hEnabled,
      reminder2hEnabled: input.reminder2hEnabled,
      rxPaperSize: input.rxPaperSize,
      rxPrintLetterhead: input.rxPrintLetterhead,
      rxTopMarginMm: input.rxTopMarginMm,
      invoicePaperSize: input.invoicePaperSize,
      updatedAt: new Date(),
    })
    .where(eq(schema.tenants.id, tenant.id));

  revalidatePath("/app/settings");
  revalidatePath("/app");
  return { success: true };
}

export interface WorkingShiftInput {
  weekday: number; // 0..6
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

export async function updateWorkingHoursAction(shifts: WorkingShiftInput[]) {
  const { tenant, user } = await requireClinicStaff();

  if (!can({ role: user.role as any, isDoctor: user.isDoctor }, "clinic_settings")) {
    throw new Error("Only Chamber Admins may modify working hours");
  }

  await db.transaction(async (tx) => {
    // Delete existing hours for this tenant
    await tx
      .delete(schema.tenantWorkingHours)
      .where(eq(schema.tenantWorkingHours.tenantId, tenant.id));

    // Insert new shifts
    for (const s of shifts) {
      if (!s.startTime || !s.endTime) continue;
      await tx.insert(schema.tenantWorkingHours).values({
        tenantId: tenant.id,
        weekday: s.weekday,
        startTime: s.startTime,
        endTime: s.endTime,
      });
    }
  });

  revalidatePath("/app/settings/hours");
  revalidatePath("/app/appointments/new");
  revalidatePath("/app/queue");
  return { success: true };
}

export async function createChairAction(name: string) {
  const { tenant, user } = await requireClinicStaff();

  if (!can({ role: user.role as any, isDoctor: user.isDoctor }, "clinic_settings")) {
    throw new Error("Only Chamber Admins may manage dental chairs");
  }

  if (!name.trim()) {
    throw new Error("Chair name cannot be empty");
  }

  await db.insert(schema.chairs).values({
    tenantId: tenant.id,
    name: name.trim(),
    isActive: true,
  });

  revalidatePath("/app/settings/chairs");
  return { success: true };
}

export async function toggleChairAction(id: string, isActive: boolean) {
  const { tenant, user } = await requireClinicStaff();

  if (!can({ role: user.role as any, isDoctor: user.isDoctor }, "clinic_settings")) {
    throw new Error("Only Chamber Admins may manage dental chairs");
  }

  await db
    .update(schema.chairs)
    .set({ isActive })
    .where(
      and(
        eq(schema.chairs.tenantId, tenant.id),
        eq(schema.chairs.id, id)
      )
    );

  revalidatePath("/app/settings/chairs");
  return { success: true };
}

export async function updateServiceItemAction(
  id: string,
  priceBdt: number,
  durationMinutes: number,
  isActive: boolean
) {
  const { tenant, user } = await requireClinicStaff();

  if (!can({ role: user.role as any, isDoctor: user.isDoctor }, "clinic_settings")) {
    throw new Error("Only Chamber Admins may modify service pricing");
  }

  await db
    .update(schema.services)
    .set({
      priceBdt,
      durationMinutes,
      isActive,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.services.tenantId, tenant.id),
        eq(schema.services.id, id)
      )
    );

  revalidatePath("/app/settings/services");
  return { success: true };
}

export async function updatePatientCardModeAction(
  mode: (typeof schema.patientIdModeEnum.enumValues)[number],
  minLen: number = 10,
  maxLen: number = 16
) {
  const { tenant, user } = await requireClinicStaff();

  if (!can({ role: user.role as any, isDoctor: user.isDoctor }, "clinic_settings")) {
    throw new Error("Only Chamber Admins may update patient card mode");
  }

  await db
    .update(schema.tenants)
    .set({
      patientIdMode: mode,
      patientIdMinLen: minLen,
      patientIdMaxLen: maxLen,
      updatedAt: new Date(),
    })
    .where(eq(schema.tenants.id, tenant.id));

  revalidatePath("/app/settings/card");
  revalidatePath("/app/patients/new");
  return { success: true };
}

// -----------------------------------------------------------------------------
// Doctor & Roster Schedule Management
// -----------------------------------------------------------------------------
export interface AddDoctorInput {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  doctorTitle?: string;
  doctorDegrees?: string;
  doctorSpecialty?: string;
  doctorRegNo?: string;
  calendarColor?: string;
}

export async function addDoctorAction(input: AddDoctorInput) {
  const { tenant, user } = await requireClinicStaff();

  if (!can({ role: user.role as any, isDoctor: user.isDoctor }, "manage_staff")) {
    throw new Error("Only Chamber Admins may add doctors");
  }

  const cleanEmail = input.email.trim().toLowerCase();
  if (!cleanEmail || !input.name.trim()) {
    throw new Error("Doctor name and valid email are required");
  }

  // Check if user already exists
  const [existingUser] = await db
    .select({ id: schema.users.id, tenantId: schema.users.tenantId })
    .from(schema.users)
    .where(eq(schema.users.email, cleanEmail))
    .limit(1);

  if (existingUser) {
    if (existingUser.tenantId === tenant.id) {
      await db
        .update(schema.users)
        .set({
          name: input.name.trim(),
          role: "DOCTOR",
          isDoctor: true,
          status: "active",
          doctorTitle: input.doctorTitle?.trim() || "Dr.",
          doctorDegrees: input.doctorDegrees?.trim() || null,
          doctorSpecialty: input.doctorSpecialty?.trim() || "Dental Surgeon",
          doctorRegNo: input.doctorRegNo?.trim() || null,
          phone: input.phone?.trim() || null,
          calendarColor: input.calendarColor || "#2A5CAA",
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, existingUser.id));

      revalidatePath("/app/settings/doctors");
      revalidatePath("/app/appointments/new");
      revalidatePath(`/book/${tenant.slug}`);
      return { success: true, doctorId: existingUser.id };
    }
    throw new Error("A user with this email already exists on the platform");
  }

  const authRes = await auth.api.signUpEmail({
    body: {
      name: input.name.trim(),
      email: cleanEmail,
      password: input.password || "Doctor12345!",
    },
  });

  if (!authRes?.user) {
    throw new Error("Failed to create doctor account");
  }

  await db
    .update(schema.users)
    .set({
      tenantId: tenant.id,
      role: "DOCTOR",
      isDoctor: true,
      status: "active",
      doctorTitle: input.doctorTitle?.trim() || "Dr.",
      doctorDegrees: input.doctorDegrees?.trim() || null,
      doctorSpecialty: input.doctorSpecialty?.trim() || "Dental Surgeon",
      doctorRegNo: input.doctorRegNo?.trim() || null,
      phone: input.phone?.trim() || null,
      calendarColor: input.calendarColor || "#2A5CAA",
      emailVerified: true,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, authRes.user.id));

  revalidatePath("/app/settings/doctors");
  revalidatePath("/app/appointments/new");
  revalidatePath(`/book/${tenant.slug}`);
  return { success: true, doctorId: authRes.user.id };
}

export interface UpdateDoctorInput {
  id: string;
  name: string;
  phone?: string;
  doctorTitle?: string;
  doctorDegrees?: string;
  doctorSpecialty?: string;
  doctorRegNo?: string;
  calendarColor?: string;
  status?: "active" | "disabled";
}

export async function updateDoctorAction(input: UpdateDoctorInput) {
  const { tenant, user } = await requireClinicStaff();

  if (!can({ role: user.role as any, isDoctor: user.isDoctor }, "manage_staff")) {
    throw new Error("Only Chamber Admins may modify doctor details");
  }

  await db
    .update(schema.users)
    .set({
      name: input.name.trim(),
      doctorTitle: input.doctorTitle?.trim() || "Dr.",
      doctorDegrees: input.doctorDegrees?.trim() || null,
      doctorSpecialty: input.doctorSpecialty?.trim() || "Dental Surgeon",
      doctorRegNo: input.doctorRegNo?.trim() || null,
      phone: input.phone?.trim() || null,
      calendarColor: input.calendarColor || "#2A5CAA",
      status: input.status || "active",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.users.tenantId, tenant.id),
        eq(schema.users.id, input.id)
      )
    );

  revalidatePath("/app/settings/doctors");
  revalidatePath("/app/appointments/new");
  revalidatePath(`/book/${tenant.slug}`);
  return { success: true };
}

export async function updateDoctorSchedulesAction(
  doctorId: string,
  shifts: { weekday: number; startTime: string; endTime: string }[]
) {
  const { tenant, user } = await requireClinicStaff();

  if (!can({ role: user.role as any, isDoctor: user.isDoctor }, "clinic_settings")) {
    throw new Error("Only Chamber Admins may configure doctor schedules");
  }

  const [doc] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.tenantId, tenant.id),
        eq(schema.users.id, doctorId)
      )
    )
    .limit(1);

  if (!doc) {
    throw new Error("Doctor not found in this chamber");
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(schema.doctorSchedules)
      .where(
        and(
          eq(schema.doctorSchedules.tenantId, tenant.id),
          eq(schema.doctorSchedules.doctorId, doctorId)
        )
      );

    for (const shift of shifts) {
      if (!shift.startTime || !shift.endTime) continue;
      await tx.insert(schema.doctorSchedules).values({
        tenantId: tenant.id,
        doctorId: doctorId,
        weekday: shift.weekday,
        startTime: shift.startTime,
        endTime: shift.endTime,
      });
    }
  });

  revalidatePath("/app/settings/doctors");
  revalidatePath("/app/appointments/new");
  revalidatePath(`/book/${tenant.slug}`);
  return { success: true };
}

export async function deleteDoctorAction(doctorId: string) {
  const { tenant, user } = await requireClinicStaff();

  if (!can({ role: user.role as any, isDoctor: user.isDoctor }, "manage_staff")) {
    throw new Error("Only Chamber Admins may remove doctors");
  }

  if (doctorId === user.id) {
    throw new Error("You cannot remove your own account");
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(schema.doctorSchedules)
      .where(
        and(
          eq(schema.doctorSchedules.tenantId, tenant.id),
          eq(schema.doctorSchedules.doctorId, doctorId)
        )
      );

    await tx
      .update(schema.users)
      .set({
        status: "disabled",
        isDoctor: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.users.tenantId, tenant.id),
          eq(schema.users.id, doctorId)
        )
      );
  });

  revalidatePath("/app/settings/doctors");
  revalidatePath("/app/appointments/new");
  revalidatePath(`/book/${tenant.slug}`);
  return { success: true };
}

// -----------------------------------------------------------------------------
// Staff & Receptionists Management
// -----------------------------------------------------------------------------

export interface AddStaffInput {
  name: string;
  email: string;
  password?: string;
  phone?: string;
}

export async function addStaffAction(input: AddStaffInput) {
  const { tenant, user } = await requireClinicStaff();

  if (!can({ role: user.role as any, isDoctor: user.isDoctor }, "manage_staff")) {
    throw new Error("Only Chamber Admins may add staff");
  }

  const cleanEmail = input.email.trim().toLowerCase();
  if (!cleanEmail || !input.name.trim()) {
    throw new Error("Staff name and valid email are required");
  }

  const [existingUser] = await db
    .select({ id: schema.users.id, tenantId: schema.users.tenantId })
    .from(schema.users)
    .where(eq(schema.users.email, cleanEmail))
    .limit(1);

  if (existingUser) {
    if (existingUser.tenantId === tenant.id) {
      await db
        .update(schema.users)
        .set({
          name: input.name.trim(),
          role: "RECEPTIONIST",
          isDoctor: false,
          status: "active",
          phone: input.phone?.trim() || null,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, existingUser.id));

      revalidatePath("/app/settings/staff");
      return { success: true, staffId: existingUser.id };
    }
    throw new Error("A user with this email already exists on the platform");
  }

  const authRes = await auth.api.signUpEmail({
    body: {
      name: input.name.trim(),
      email: cleanEmail,
      password: input.password || "Staff12345!",
    },
  });

  if (!authRes?.user) {
    throw new Error("Failed to create staff account");
  }

  await db
    .update(schema.users)
    .set({
      tenantId: tenant.id,
      role: "RECEPTIONIST",
      isDoctor: false,
      status: "active",
      phone: input.phone?.trim() || null,
      emailVerified: true,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, authRes.user.id));

  revalidatePath("/app/settings/staff");
  return { success: true, staffId: authRes.user.id };
}

export interface UpdateStaffInput {
  id: string;
  name: string;
  phone?: string;
  status?: "active" | "disabled";
}

export async function updateStaffAction(input: UpdateStaffInput) {
  const { tenant, user } = await requireClinicStaff();

  if (!can({ role: user.role as any, isDoctor: user.isDoctor }, "manage_staff")) {
    throw new Error("Only Chamber Admins may modify staff details");
  }

  await db
    .update(schema.users)
    .set({
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      status: input.status || "active",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.users.tenantId, tenant.id),
        eq(schema.users.id, input.id)
      )
    );

  revalidatePath("/app/settings/staff");
  return { success: true };
}

export async function deleteStaffAction(staffId: string) {
  const { tenant, user } = await requireClinicStaff();

  if (!can({ role: user.role as any, isDoctor: user.isDoctor }, "manage_staff")) {
    throw new Error("Only Chamber Admins may remove staff");
  }

  if (staffId === user.id) {
    throw new Error("You cannot remove your own account");
  }

  await db
    .update(schema.users)
    .set({
      status: "disabled",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.users.tenantId, tenant.id),
        eq(schema.users.id, staffId)
      )
    );

  revalidatePath("/app/settings/staff");
  return { success: true };
}

// -----------------------------------------------------------------------------
// Procedures & Services Catalog
// -----------------------------------------------------------------------------
export async function createServiceItemAction(input: {
  name: string;
  categoryName?: string;
  categoryId?: string;
  priceBdt: number;
  durationMinutes: number;
  bookableOnline?: boolean;
}) {
  const { tenant, user } = await requireClinicStaff();

  if (!can({ role: user.role as any, isDoctor: user.isDoctor }, "clinic_settings")) {
    throw new Error("Only Chamber Admins may add services");
  }

  if (!input.name.trim()) {
    throw new Error("Procedure name cannot be empty");
  }

  let finalCategoryId = input.categoryId;

  if (!finalCategoryId) {
    const catName = input.categoryName?.trim() || "General Dentistry";
    const [existingCat] = await db
      .select({ id: schema.serviceCategories.id })
      .from(schema.serviceCategories)
      .where(
        and(
          eq(schema.serviceCategories.tenantId, tenant.id),
          eq(schema.serviceCategories.name, catName)
        )
      )
      .limit(1);

    if (existingCat) {
      finalCategoryId = existingCat.id;
    } else {
      const [newCat] = await db
        .insert(schema.serviceCategories)
        .values({
          tenantId: tenant.id,
          name: catName,
          source: "custom",
          isActive: true,
        })
        .returning();
      finalCategoryId = newCat.id;
    }
  }

  await db.insert(schema.services).values({
    tenantId: tenant.id,
    categoryId: finalCategoryId,
    name: input.name.trim(),
    priceBdt: Math.round(input.priceBdt || 0),
    durationMinutes: input.durationMinutes || 30,
    bookableOnline: input.bookableOnline ?? true,
    isActive: true,
    source: "custom",
  });

  revalidatePath("/app/settings/services");
  revalidatePath("/app/billing/invoices/new");
  revalidatePath(`/book/${tenant.slug}`);
  return { success: true };
}

export async function deleteServiceItemAction(id: string) {
  const { tenant, user } = await requireClinicStaff();

  if (!can({ role: user.role as any, isDoctor: user.isDoctor }, "clinic_settings")) {
    throw new Error("Only Chamber Admins may delete services");
  }

  await db
    .delete(schema.services)
    .where(
      and(
        eq(schema.services.tenantId, tenant.id),
        eq(schema.services.id, id)
      )
    );

  revalidatePath("/app/settings/services");
  revalidatePath("/app/billing/invoices/new");
  revalidatePath(`/book/${tenant.slug}`);
  return { success: true };
}

// -----------------------------------------------------------------------------
// Medicines Catalog
// -----------------------------------------------------------------------------
export async function createMedicineAction(input: {
  brandName?: string;
  genericName: string;
  strength?: string;
  form: (typeof schema.medicineFormEnum.enumValues)[number];
  drugClass?: string;
}) {
  const { tenant, user } = await requireClinicStaff();

  if (!can({ role: user.role as any, isDoctor: user.isDoctor }, "clinic_settings")) {
    throw new Error("Only Chamber Admins may add medicines");
  }

  if (!input.genericName?.trim()) {
    throw new Error("Generic name is required");
  }

  await db.insert(schema.medicines).values({
    tenantId: tenant.id,
    brandName: input.brandName?.trim() || null,
    genericName: input.genericName.trim(),
    strength: input.strength?.trim() || null,
    form: input.form || "tablet",
    drugClass: input.drugClass?.trim() || null,
    source: "custom",
    isActive: true,
  });

  revalidatePath("/app/settings/prescriptions");
  revalidatePath("/app/prescriptions/new");
  return { success: true };
}

export async function updateMedicineAction(input: {
  id: string;
  brandName?: string;
  genericName: string;
  strength?: string;
  form: (typeof schema.medicineFormEnum.enumValues)[number];
  drugClass?: string;
  isActive?: boolean;
}) {
  const { tenant, user } = await requireClinicStaff();

  if (!can({ role: user.role as any, isDoctor: user.isDoctor }, "clinic_settings")) {
    throw new Error("Only Chamber Admins may modify medicines");
  }

  await db
    .update(schema.medicines)
    .set({
      brandName: input.brandName?.trim() || null,
      genericName: input.genericName.trim(),
      strength: input.strength?.trim() || null,
      form: input.form || "tablet",
      drugClass: input.drugClass?.trim() || null,
      isActive: input.isActive ?? true,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.medicines.tenantId, tenant.id),
        eq(schema.medicines.id, input.id)
      )
    );

  revalidatePath("/app/settings/prescriptions");
  revalidatePath("/app/prescriptions/new");
  return { success: true };
}

export async function deleteMedicineAction(id: string) {
  const { tenant, user } = await requireClinicStaff();

  if (!can({ role: user.role as any, isDoctor: user.isDoctor }, "clinic_settings")) {
    throw new Error("Only Chamber Admins may delete medicines");
  }

  await db
    .delete(schema.medicines)
    .where(
      and(
        eq(schema.medicines.tenantId, tenant.id),
        eq(schema.medicines.id, id)
      )
    );

  revalidatePath("/app/settings/prescriptions");
  revalidatePath("/app/prescriptions/new");
  return { success: true };
}

// -----------------------------------------------------------------------------
// Pre-Advice & Advice Templates Catalog
// -----------------------------------------------------------------------------
export async function createAdviceTemplateAction(input: {
  groupName: string;
  textBn: string;
}) {
  const { tenant, user } = await requireClinicStaff();

  if (!can({ role: user.role as any, isDoctor: user.isDoctor }, "clinic_settings")) {
    throw new Error("Only Chamber Admins may add advice templates");
  }

  if (!input.textBn?.trim()) {
    throw new Error("Advice text is required");
  }

  await db.insert(schema.adviceTemplates).values({
    tenantId: tenant.id,
    groupName: input.groupName.trim() || "General Dental Care",
    textBn: input.textBn.trim(),
    source: "custom",
    isActive: true,
  });

  revalidatePath("/app/settings/prescriptions");
  revalidatePath("/app/prescriptions/new");
  return { success: true };
}

export async function updateAdviceTemplateAction(input: {
  id: string;
  groupName: string;
  textBn: string;
  isActive?: boolean;
}) {
  const { tenant, user } = await requireClinicStaff();

  if (!can({ role: user.role as any, isDoctor: user.isDoctor }, "clinic_settings")) {
    throw new Error("Only Chamber Admins may modify advice templates");
  }

  await db
    .update(schema.adviceTemplates)
    .set({
      groupName: input.groupName.trim() || "General Dental Care",
      textBn: input.textBn.trim(),
      isActive: input.isActive ?? true,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.adviceTemplates.tenantId, tenant.id),
        eq(schema.adviceTemplates.id, input.id)
      )
    );

  revalidatePath("/app/settings/prescriptions");
  revalidatePath("/app/prescriptions/new");
  return { success: true };
}

export async function deleteAdviceTemplateAction(id: string) {
  const { tenant, user } = await requireClinicStaff();

  if (!can({ role: user.role as any, isDoctor: user.isDoctor }, "clinic_settings")) {
    throw new Error("Only Chamber Admins may delete advice templates");
  }

  await db
    .delete(schema.adviceTemplates)
    .where(
      and(
        eq(schema.adviceTemplates.tenantId, tenant.id),
        eq(schema.adviceTemplates.id, id)
      )
    );

  revalidatePath("/app/settings/prescriptions");
  revalidatePath("/app/prescriptions/new");
  return { success: true };
}
