import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import AppointmentsClient from "@/components/appointments/AppointmentsClient";

interface Props {
  searchParams: Promise<{ date?: string }>;
}

export default async function AppointmentsPage({ searchParams }: Props) {
  const { tenant } = await requireClinicStaff();
  const params = await searchParams;

  const todayDhakaStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const targetDateStr = params.date || todayDhakaStr;

  // Range in Asia/Dhaka (+06:00) for target calendar date
  const dayStart = new Date(`${targetDateStr}T00:00:00+06:00`);
  const dayEnd = new Date(`${targetDateStr}T23:59:59.999+06:00`);

  // Fetch doctors and appointments concurrently
  const [doctors, aptRows] = await Promise.all([
    // Active doctors in tenant
    db
      .select({
        id: schema.users.id,
        name: schema.users.name,
      })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.tenantId, tenant.id),
          eq(schema.users.isDoctor, true),
          eq(schema.users.status, "active")
        )
      ),

    // Appointments for target date
    db
      .select({
        id: schema.appointments.id,
        appointmentCode: schema.appointments.appointmentCode,
        startTime: schema.appointments.startTime,
        endTime: schema.appointments.endTime,
        status: schema.appointments.status,
        isOverbooked: schema.appointments.isOverbooked,
        notes: schema.appointments.notes,
        patientId: schema.appointments.patientId,
        patientName: schema.patients.name,
        patientPhone: schema.patients.phone,
        patientCard: schema.patients.cardNumber,
        patientAllergies: schema.patients.allergyFlags,
        patientConditions: schema.patients.medicalConditions,
        doctorId: schema.appointments.doctorId,
        doctorName: schema.users.name,
        chairName: schema.chairs.name,
        queueStatus: schema.queueEntries.status,
      })
      .from(schema.appointments)
      .leftJoin(
        schema.patients,
        eq(schema.appointments.patientId, schema.patients.id)
      )
      .leftJoin(schema.users, eq(schema.appointments.doctorId, schema.users.id))
      .leftJoin(schema.chairs, eq(schema.appointments.chairId, schema.chairs.id))
      .leftJoin(
        schema.queueEntries,
        eq(schema.appointments.id, schema.queueEntries.appointmentId)
      )
      .where(
        and(
          eq(schema.appointments.tenantId, tenant.id),
          sql`${schema.appointments.startTime} >= ${dayStart.toISOString()}`,
          sql`${schema.appointments.startTime} <= ${dayEnd.toISOString()}`
        )
      )
      .orderBy(schema.appointments.startTime),
  ]);

  // Fetch appointment services for these appointments
  const appointmentIds = aptRows.map((a) => a.id);
  const aptServicesMap: Record<
    string,
    { serviceName: string; durationMinutes: number; priceBdt: number }[]
  > = {};

  if (appointmentIds.length > 0) {
    const servicesRows = await db
      .select({
        appointmentId: schema.appointmentServices.appointmentId,
        serviceName: schema.appointmentServices.serviceNameSnapshot,
        durationMinutes: schema.appointmentServices.durationMinutesSnapshot,
        priceBdt: schema.appointmentServices.priceBdtSnapshot,
      })
      .from(schema.appointmentServices)
      .where(
        and(
          eq(schema.appointmentServices.tenantId, tenant.id),
          inArray(schema.appointmentServices.appointmentId, appointmentIds)
        )
      )
      .orderBy(schema.appointmentServices.sortOrder);

    for (const s of servicesRows) {
      if (!aptServicesMap[s.appointmentId]) {
        aptServicesMap[s.appointmentId] = [];
      }
      aptServicesMap[s.appointmentId].push({
        serviceName: s.serviceName,
        durationMinutes: s.durationMinutes,
        priceBdt: s.priceBdt,
      });
    }
  }

  const formattedAppointments = aptRows.map((apt) => ({
    id: apt.id,
    appointmentCode: apt.appointmentCode,
    startTime: apt.startTime.toISOString(),
    endTime: apt.endTime.toISOString(),
    status: apt.status as any,
    queueStatus: apt.queueStatus as any,
    isOverbooked: apt.isOverbooked,
    notes: apt.notes,
    patientId: apt.patientId || "",
    patientName: apt.patientName || "Walk-in Guest",
    patientPhone: apt.patientPhone || "",
    patientCard: apt.patientCard || "N/A",
    patientAllergies: apt.patientAllergies || [],
    patientConditions: apt.patientConditions || [],
    doctorId: apt.doctorId,
    doctorName: apt.doctorName || "Staff Dentist",
    chairName: apt.chairName,
    services: aptServicesMap[apt.id] || [],
  }));

  return (
    <AppointmentsClient
      initialDate={targetDateStr}
      doctors={doctors}
      appointments={formattedAppointments}
    />
  );
}
