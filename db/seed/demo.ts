import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import { createClinicWithMasterCatalog } from "@/lib/clinic/create-clinic";
import { generateRecordCode } from "@/lib/barcode/codes";

async function runDemoSeed() {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ Refusing to seed demo data in production environment!");
    process.exit(1);
  }

  console.log("🚀 Starting Demo Dental Care (DDC) seeder...");

  // Check if Demo Dental Care already exists
  const [existingTenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, "demo"))
    .limit(1);

  let tenantId: string;
  let adminUserId: string | null = null;

  if (!existingTenant) {
    console.log("Creating clinic 'Demo Dental Care'...");
    const clinicResult = await createClinicWithMasterCatalog({
      name: "Demo Dental Care",
      slug: "demo",
      shortCode: "DDC",
      phone: "01712-345678",
      email: "care@demodental.com",
      address: "House 12, Road 4, Dhanmondi, Dhaka 1205",
      brandColor: "#2A5CAA",
      patientIdMode: "PRE_PRINTED",
      adminName: "Dr. Anisur Rahman",
      adminEmail: "admin@demo.test",
      adminPassword: "Demo@12345",
      adminIsDoctor: true,
      adminDoctorTitle: "Dr.",
      adminDoctorSpecialty: "Orthodontics & Dental Surgery",
      adminDoctorRegNo: "BMDC-A-45892",
      planName: "Professional",
      priceBdt: 3500,
      billingCycle: "monthly",
    });

    tenantId = clinicResult.tenant.id;
    adminUserId = clinicResult.adminUserId;
  } else {
    tenantId = existingTenant.id;
    console.log("Demo Dental Care already exists.");
  }

  // Ensure working hours: Saturday to Thursday (0..4, 6) 17:00-23:00; Friday (5) closed
  const existingHours = await db
    .select()
    .from(schema.tenantWorkingHours)
    .where(eq(schema.tenantWorkingHours.tenantId, tenantId));

  if (existingHours.length === 0) {
    console.log("Seeding working hours (Sat-Thu 17:00-23:00)...");
    const openWeekdays = [6, 0, 1, 2, 3, 4]; // Sat, Sun, Mon, Tue, Wed, Thu
    for (const wd of openWeekdays) {
      await db.insert(schema.tenantWorkingHours).values({
        tenantId,
        weekday: wd,
        startTime: "17:00",
        endTime: "23:00",
      });
    }
  }

  // Create additional staff: Doctor & Receptionist
  console.log("Seeding demo staff users...");
  try {
    const docRes = await auth.api.signUpEmail({
      body: {
        name: "Dr. Farhana Yasmin",
        email: "doctor@demo.test",
        password: "Demo@12345",
      },
    });
    if (docRes?.user) {
      await db
        .update(schema.users)
        .set({
          tenantId,
          role: "DOCTOR",
          isDoctor: true,
          doctorTitle: "Dr.",
          doctorSpecialty: "Conservative Dentistry & Endodontics",
          doctorRegNo: "BMDC-A-51204",
          status: "active",
          emailVerified: true,
        })
        .where(eq(schema.users.id, docRes.user.id));
    }
  } catch {}

  try {
    const recRes = await auth.api.signUpEmail({
      body: {
        name: "Nusrat Jahan",
        email: "reception@demo.test",
        password: "Demo@12345",
      },
    });
    if (recRes?.user) {
      await db
        .update(schema.users)
        .set({
          tenantId,
          role: "RECEPTIONIST",
          isDoctor: false,
          status: "active",
          emailVerified: true,
        })
        .where(eq(schema.users.id, recRes.user.id));
    }
  } catch {}

  // Get users for assigning
  const staff = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.tenantId, tenantId));

  const doctorUsers = staff.filter((u) => u.isDoctor);
  const primaryDoc = doctorUsers[0] || staff[0];
  const secondDoc = doctorUsers[1] || primaryDoc;

  // Update sample prices on services
  await db
    .update(schema.services)
    .set({ priceBdt: 500 })
    .where(eq(schema.services.tenantId, tenantId));

  // Seed 20 Patients
  console.log("Seeding 20 demo patients with cards 1000000001 to 1000000020...");
  const samplePatients = [
    { name: "Rafiqul Islam", phone: "01711223344", gender: "male" as const, bloodGroup: "B+", allergies: ["Penicillin"], conditions: ["Hypertension"] },
    { name: "Nasima Begum", phone: "01711223344", gender: "female" as const, bloodGroup: "A+", allergies: [], conditions: ["Diabetes"] }, // Shared family phone
    { name: "Tanvir Ahmed", phone: "01819556677", gender: "male" as const, bloodGroup: "O+", allergies: ["NSAIDs / Aspirin"], conditions: [] },
    { name: "Shireen Akhter", phone: "01912889900", gender: "female" as const, bloodGroup: "AB+", allergies: ["Chlorhexidine"], conditions: ["Asthma"] },
    { name: "Mahmud Hasan", phone: "01552334455", gender: "male" as const, bloodGroup: "B+", allergies: [], conditions: [] },
    { name: "Farzana Haque", phone: "01713445566", gender: "female" as const, bloodGroup: "O-", allergies: ["Cephalosporin"], conditions: ["Pregnancy"] },
    { name: "Kazi Nazrul", phone: "01817667788", gender: "male" as const, bloodGroup: "A-", allergies: [], conditions: [] },
    { name: "Rokeya Sultana", phone: "01915778899", gender: "female" as const, bloodGroup: "B+", allergies: [], conditions: ["Epilepsy"] },
    { name: "Imtiaz Hossain", phone: "01611889900", gender: "male" as const, bloodGroup: "O+", allergies: ["Metronidazole"], conditions: [] },
    { name: "Salma Khatun", phone: "01718990011", gender: "female" as const, bloodGroup: "A+", allergies: [], conditions: ["Thyroid disorder"] },
  ];

  const createdPatientIds: string[] = [];
  for (let i = 0; i < 20; i++) {
    const cardNum = (1000000001 + i).toString();
    const pInfo = samplePatients[i % samplePatients.length];

    const [patient] = await db
      .insert(schema.patients)
      .values({
        tenantId,
        cardNumber: cardNum,
        name: i >= samplePatients.length ? `${pInfo.name} (${i + 1})` : pInfo.name,
        phone: pInfo.phone,
        gender: pInfo.gender,
        bloodGroup: pInfo.bloodGroup,
        approxAge: 25 + (i * 3) % 40,
        allergyFlags: pInfo.allergies,
        medicalConditions: pInfo.conditions,
        createdBy: primaryDoc.id,
      })
      .onConflictDoNothing()
      .returning({ id: schema.patients.id });

    if (patient) {
      createdPatientIds.push(patient.id);
    }
  }

  // Seed Today's Queue & Appointments
  console.log("Seeding today's queue and appointments...");
  const todayDhakaStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const queueStatuses: (typeof schema.queueStatusEnum.enumValues)[number][] = [
    "booked",
    "waiting",
    "waiting",
    "in_chair",
    "billing",
    "done",
    "done",
    "no_show",
  ];

  for (let i = 0; i < Math.min(8, createdPatientIds.length); i++) {
    const pid = createdPatientIds[i];
    const doc = i % 2 === 0 ? primaryDoc : secondDoc;
    const startHour = 17 + Math.floor(i / 2);
    const startMin = (i % 2) * 30;

    const startTime = new Date(`${todayDhakaStr}T${startHour.toString().padStart(2, "0")}:${startMin.toString().padStart(2, "0")}:00+06:00`);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    const [apt] = await db
      .insert(schema.appointments)
      .values({
        tenantId,
        appointmentCode: generateRecordCode("APT", "DDC", 100 + i),
        patientId: pid,
        doctorId: doc.id,
        startTime,
        endTime,
        status: i === 7 ? "no_show" : "confirmed",
        source: "staff",
        createdBy: primaryDoc.id,
      })
      .onConflictDoNothing()
      .returning();

    if (apt) {
      const qStatus = queueStatuses[i];
      await db.insert(schema.queueEntries).values({
        tenantId,
        appointmentId: apt.id,
        patientId: pid,
        doctorId: doc.id,
        date: todayDhakaStr,
        status: qStatus,
        serialNo: qStatus === "booked" ? null : i + 1,
        queuePosition: i + 1,
        checkedInAt: qStatus !== "booked" ? startTime : null,
        inChairAt: ["in_chair", "billing", "done"].includes(qStatus) ? startTime : null,
        billingAt: ["billing", "done"].includes(qStatus) ? endTime : null,
        doneAt: qStatus === "done" ? endTime : null,
      });
    }
  }

  // Seed One Pending Public Booking
  console.log("Seeding one pending public online booking...");
  const tomorrowDhaka = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tomorrowStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(tomorrowDhaka);

  await db.insert(schema.appointments).values({
    tenantId,
    appointmentCode: generateRecordCode("APT", "DDC", 999),
    patientId: null, // New patient
    pendingPatientName: "Zubair Rahman (Online)",
    pendingPatientPhone: "01799887766",
    pendingPatientEmail: "zubair@example.com",
    doctorId: primaryDoc.id,
    startTime: new Date(`${tomorrowStr}T18:00:00+06:00`),
    endTime: new Date(`${tomorrowStr}T18:30:00+06:00`),
    status: "pending",
    source: "public_booking",
    notes: "Severe lower molar ache since yesterday",
  });

  console.log("🎉 Demo Dental Care (DDC) seeding complete!");
}

runDemoSeed()
  .catch((e) => {
    console.error("❌ Demo seed error:", e);
    process.exit(1);
  })
  .then(() => process.exit(0));
