import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, inArray, sql, lte, gte } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  // Verify Cron Secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let reminders24hQueued = 0;
  let reminders2hQueued = 0;
  let autoCancelledCount = 0;

  // 1. Process 24-Hour Reminders (23h to 25h window)
  const window24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const window24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const eligible24h = await db
    .select({
      appointmentId: schema.appointments.id,
      code: schema.appointments.appointmentCode,
      startTime: schema.appointments.startTime,
      patientName: schema.patients.name,
      patientEmail: schema.patients.email,
      doctorName: schema.users.name,
      tenantId: schema.tenants.id,
      tenantName: schema.tenants.name,
      tenantAddress: schema.tenants.address,
    })
    .from(schema.appointments)
    .innerJoin(schema.tenants, eq(schema.appointments.tenantId, schema.tenants.id))
    .innerJoin(schema.patients, eq(schema.appointments.patientId, schema.patients.id))
    .innerJoin(schema.users, eq(schema.appointments.doctorId, schema.users.id))
    .where(
      and(
        inArray(schema.appointments.status, ["pending", "confirmed"]),
        isNull(schema.appointments.reminder24hSentAt),
        eq(schema.tenants.reminder24hEnabled, true),
        sql`${schema.patients.email} IS NOT NULL`,
        gte(schema.appointments.startTime, window24hStart),
        lte(schema.appointments.startTime, window24hEnd)
      )
    );

  for (const apt of eligible24h) {
    if (!apt.patientEmail) continue;

    await db.transaction(async (tx) => {
      await tx.insert(schema.emailQueue).values({
        tenantId: apt.tenantId,
        toEmail: apt.patientEmail!,
        subject: `[${apt.tenantName}] Appointment Reminder for Tomorrow (${apt.code})`,
        templateKey: "appointment_reminder",
        payload: {
          patientName: apt.patientName,
          doctorName: apt.doctorName,
          clinicName: apt.tenantName,
          clinicAddress: apt.tenantAddress || "",
          displayTime: new Date(apt.startTime).toLocaleString("en-US", {
            timeZone: "Asia/Dhaka",
            dateStyle: "medium",
            timeStyle: "short",
          }),
          appointmentCode: apt.code,
          is24h: true,
        },
        dedupeKey: `apt_remind_24h_${apt.appointmentId}`,
      });

      await tx
        .update(schema.appointments)
        .set({
          reminder24hSentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.appointments.id, apt.appointmentId));
    });

    reminders24hQueued++;
  }

  // 2. Process 2-Hour Reminders (90m to 150m window)
  const window2hStart = new Date(now.getTime() + 90 * 60 * 1000);
  const window2hEnd = new Date(now.getTime() + 150 * 60 * 1000);

  const eligible2h = await db
    .select({
      appointmentId: schema.appointments.id,
      code: schema.appointments.appointmentCode,
      startTime: schema.appointments.startTime,
      patientName: schema.patients.name,
      patientEmail: schema.patients.email,
      doctorName: schema.users.name,
      tenantId: schema.tenants.id,
      tenantName: schema.tenants.name,
      tenantAddress: schema.tenants.address,
    })
    .from(schema.appointments)
    .innerJoin(schema.tenants, eq(schema.appointments.tenantId, schema.tenants.id))
    .innerJoin(schema.patients, eq(schema.appointments.patientId, schema.patients.id))
    .innerJoin(schema.users, eq(schema.appointments.doctorId, schema.users.id))
    .where(
      and(
        inArray(schema.appointments.status, ["pending", "confirmed"]),
        isNull(schema.appointments.reminder2hSentAt),
        eq(schema.tenants.reminder2hEnabled, true),
        sql`${schema.patients.email} IS NOT NULL`,
        gte(schema.appointments.startTime, window2hStart),
        lte(schema.appointments.startTime, window2hEnd)
      )
    );

  for (const apt of eligible2h) {
    if (!apt.patientEmail) continue;

    await db.transaction(async (tx) => {
      await tx.insert(schema.emailQueue).values({
        tenantId: apt.tenantId,
        toEmail: apt.patientEmail!,
        subject: `[${apt.tenantName}] Appointment Starting Soon (${apt.code})`,
        templateKey: "appointment_reminder",
        payload: {
          patientName: apt.patientName,
          doctorName: apt.doctorName,
          clinicName: apt.tenantName,
          clinicAddress: apt.tenantAddress || "",
          displayTime: new Date(apt.startTime).toLocaleString("en-US", {
            timeZone: "Asia/Dhaka",
            dateStyle: "medium",
            timeStyle: "short",
          }),
          appointmentCode: apt.code,
          is24h: false,
        },
        dedupeKey: `apt_remind_2h_${apt.appointmentId}`,
      });

      await tx
        .update(schema.appointments)
        .set({
          reminder2hSentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.appointments.id, apt.appointmentId));
    });

    reminders2hQueued++;
  }

  // 3. Auto-cancel expired unconfirmed public bookings within 2 hours of start time
  const autoCancelThreshold = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const expiredBookings = await db
    .select({ id: schema.appointments.id })
    .from(schema.appointments)
    .where(
      and(
        eq(schema.appointments.source, "public_booking"),
        eq(schema.appointments.status, "pending"),
        lte(schema.appointments.startTime, autoCancelThreshold)
      )
    );

  for (const exp of expiredBookings) {
    await db
      .update(schema.appointments)
      .set({
        status: "cancelled",
        cancelReason: "Auto-cancelled: unconfirmed public booking window expired",
        updatedAt: new Date(),
      })
      .where(eq(schema.appointments.id, exp.id));

    autoCancelledCount++;
  }

  return NextResponse.json({
    success: true,
    reminders24hQueued,
    reminders2hQueued,
    autoCancelledCount,
  });
}
