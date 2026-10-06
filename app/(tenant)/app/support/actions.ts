"use server";

import { requireClinicStaff } from "@/lib/session";
import { sendEmail } from "@/lib/email/mailer";
import { formatDhakaDate } from "@/lib/utils";
import { env } from "@/lib/env";

export interface SupportRequestInput {
  category: "bug" | "question" | "feature" | "billing" | "urgent";
  subject?: string;
  message: string;
  currentPath?: string;
  screenshotBase64?: string | null;
  screenshotFileName?: string | null;
}

export interface SupportRequestResult {
  success: boolean;
  message: string;
}

const CATEGORY_LABELS: Record<SupportRequestInput["category"], { label: string; color: string; bg: string }> = {
  bug: { label: "Bug / Issue", color: "#DC2626", bg: "#FEE2E2" },
  urgent: { label: "Urgent Clinic Emergency", color: "#991B1B", bg: "#FEE2E2" },
  question: { label: "Help / How-to Question", color: "#2563EB", bg: "#DBEAFE" },
  feature: { label: "Feature Suggestion", color: "#7C3AED", bg: "#EDE9FE" },
  billing: { label: "Billing & Subscription", color: "#059669", bg: "#D1FAE5" },
};

export async function sendSupportRequestAction(
  input: SupportRequestInput
): Promise<SupportRequestResult> {
  const { tenant, user } = await requireClinicStaff();

  const rawMessage = (input.message || "").trim();
  if (rawMessage.length < 5) {
    return {
      success: false,
      message: "Please provide a detailed description of your issue or request (at least 5 characters).",
    };
  }

  const category = input.category || "question";
  const catConfig = CATEGORY_LABELS[category] || CATEGORY_LABELS.question;
  const userSubject = (input.subject || "").trim();
  const emailSubject = userSubject
    ? `[${catConfig.label}] ${userSubject} · ${tenant.name}`
    : `[${catConfig.label}] Support Request from ${tenant.name}`;

  const currentPath = input.currentPath || "/app";
  const nowDhaka = formatDhakaDate(new Date(), "dd MMM yyyy, hh:mm a");

  // Parse attached screenshot if provided
  const attachments: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }> = [];

  let hasScreenshot = false;
  if (input.screenshotBase64 && typeof input.screenshotBase64 === "string") {
    try {
      const match = input.screenshotBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, "base64");

        // 8MB limit for email attachments
        if (buffer.length <= 8 * 1024 * 1024) {
          const extension = mimeType.split("/")[1] || "png";
          const fileName = input.screenshotFileName?.trim() || `screenshot_${Date.now()}.${extension}`;
          attachments.push({
            filename: fileName,
            content: buffer,
            contentType: mimeType,
          });
          hasScreenshot = true;
        }
      }
    } catch (err) {
      console.error("[SUPPORT SCREENSHOT PARSE FAILED]:", err);
    }
  }

  // Construct styled HTML email for Oris Support Team
  const escapedMessage = rawMessage
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F4F5; margin: 0; padding: 24px; color: #1C1C1E; }
        .card { background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E4E4E7; max-width: 650px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #1E4282, #2A5CAA); padding: 24px 28px; color: #FFFFFF; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
        .header p { margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
        .body { padding: 28px; }
        .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #6B7280; letter-spacing: 0.05em; margin-bottom: 8px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
        .meta-item { font-size: 13px; }
        .meta-label { color: #64748B; font-size: 11px; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 2px; }
        .meta-val { font-weight: 700; color: #0F172A; }
        .message-box { background: #FFFFFF; border: 1px solid #E4E4E7; border-left: 4px solid #2A5CAA; border-radius: 8px; padding: 18px; font-size: 14px; line-height: 1.6; color: #1C1C1E; margin-bottom: 24px; }
        .attachment-tag { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: #EBF2FC; color: #2A5CAA; border-radius: 8px; font-size: 12px; font-weight: 700; border: 1px solid #BFDBFE; }
        .footer { padding: 16px 28px; background: #F4F4F5; border-top: 1px solid #E4E4E7; font-size: 12px; color: #71717A; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div style="margin-bottom: 12px;">
            <span class="badge" style="background-color: ${catConfig.bg}; color: ${catConfig.color};">
              ${catConfig.label}
            </span>
          </div>
          <h1>${userSubject ? userSubject : `New Support Ticket from ${user.name}`}</h1>
          <p>${tenant.name} (${tenant.shortCode}) · ${nowDhaka}</p>
        </div>

        <div class="body">
          <div class="section-title">Clinic & User Context</div>
          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Submitted By</span>
              <span class="meta-val">${user.name} (${user.role})</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">User Email</span>
              <span class="meta-val"><a href="mailto:${user.email}" style="color: #2A5CAA;">${user.email}</a></span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Clinic Name</span>
              <span class="meta-val">${tenant.name}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Clinic ID / Slug</span>
              <span class="meta-val">${tenant.slug} (${tenant.id.slice(0, 8)}...)</span>
            </div>
            <div class="meta-item" style="grid-column: span 2;">
              <span class="meta-label">Active Page / Path</span>
              <span class="meta-val" style="font-family: monospace; font-size: 12px; color: #2A5CAA;">${currentPath}</span>
            </div>
          </div>

          <div class="section-title">Message / Problem Description</div>
          <div class="message-box">
            ${escapedMessage}
          </div>

          ${
            hasScreenshot
              ? `
                <div class="section-title">Attached Screenshot</div>
                <div style="margin-bottom: 16px;">
                  <span class="attachment-tag">
                    📎 ${attachments[0]?.filename || "screenshot.png"} (${(attachments[0]?.content.length / 1024).toFixed(1)} KB attached)
                  </span>
                </div>
              `
              : ""
          }
        </div>

        <div class="footer">
          Replying directly to this email will reply to <strong>${user.email}</strong>.
          <br/>
          Oris EMR Platform Automated Help Desk
        </div>
      </div>
    </body>
    </html>
  `;

  const targetSupportEmail = env.SUPPORT_EMAIL || "support@orisemr.com";

  try {
    await sendEmail({
      to: targetSupportEmail,
      replyTo: user.email,
      subject: emailSubject,
      html: emailHtml,
      text: `Support request from ${user.name} (${user.email}) at ${tenant.name}:\n\nCategory: ${catConfig.label}\nSubject: ${userSubject || "N/A"}\nPage: ${currentPath}\n\nMessage:\n${rawMessage}\n\nScreenshot Attached: ${hasScreenshot ? "Yes" : "No"}`,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    return {
      success: true,
      message: `Your support request and screenshot have been sent to ${targetSupportEmail}. Our support team will assist you shortly.`,
    };
  } catch (err: any) {
    console.error("[SUPPORT EMAIL DISPATCH ERROR]:", err);
    return {
      success: false,
      message: err?.message || "Failed to deliver support request. Please try again or email support@orisemr.com directly.",
    };
  }
}
