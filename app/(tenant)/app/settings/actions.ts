"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { can } from "@/lib/permissions";

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
