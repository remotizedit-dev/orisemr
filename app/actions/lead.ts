"use server";

import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface LeadSubmissionPayload {
  name: string;
  phone: string;
  chamberArea?: string;
  source?: string;
  utmSource?: string;
  utmCampaign?: string;
  utmMedium?: string;
}

export interface LeadSubmissionResult {
  success: boolean;
  message: string;
}

/**
 * Capture public landing page leads (Doctors / Chambers requesting a demo).
 * Stores leads safely in system_settings under "lead_requests" JSON array.
 */
export async function submitDemoLead(
  payload: LeadSubmissionPayload
): Promise<LeadSubmissionResult> {
  try {
    const trimmedName = (payload.name || "").trim();
    const trimmedPhone = (payload.phone || "").trim();
    const trimmedArea = (payload.chamberArea || "").trim();

    if (!trimmedPhone || trimmedPhone.length < 8) {
      return {
        success: false,
        message: "অনুগ্রহ করে একটি সঠিক মোবাইল নম্বর লিখুন।",
      };
    }

    const timestamp = new Date().toISOString();
    const newLead = {
      id: crypto.randomUUID(),
      name: trimmedName || "Doctor",
      phone: trimmedPhone,
      chamberArea: trimmedArea || "N/A",
      source: payload.source || "landing_lead_form",
      utmSource: payload.utmSource || null,
      utmCampaign: payload.utmCampaign || null,
      utmMedium: payload.utmMedium || null,
      createdAt: timestamp,
      status: "NEW",
    };

    // Retrieve existing leads list
    const [existingRow] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, "demo_lead_requests"))
      .limit(1);

    let leadsList: Array<typeof newLead> = [];
    if (existingRow?.value) {
      try {
        leadsList = JSON.parse(existingRow.value);
        if (!Array.isArray(leadsList)) leadsList = [];
      } catch {
        leadsList = [];
      }
    }

    leadsList.unshift(newLead);

    // Keep the most recent 1000 leads
    if (leadsList.length > 1000) {
      leadsList = leadsList.slice(0, 1000);
    }

    await db
      .insert(systemSettings)
      .values({
        key: "demo_lead_requests",
        value: JSON.stringify(leadsList),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: {
          value: JSON.stringify(leadsList),
          updatedAt: new Date(),
        },
      });

    console.log(`[submitDemoLead] Received new demo request from ${trimmedPhone} (${trimmedName})`);

    return {
      success: true,
      message: "ধন্যবাদ! আমাদের টিম দ্রুত আপনার সাথে যোগাযোগ করবে।",
    };
  } catch (error) {
    console.error("[submitDemoLead] Error saving lead:", error);
    return {
      success: false,
      message: "দুঃখিত, তথ্যটি পাঠানো যায়নি। অনুগ্রহ করে সরাসরি WhatsApp-এ মেসেজ দিন।",
    };
  }
}

