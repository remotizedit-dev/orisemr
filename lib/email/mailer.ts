import nodemailer from "nodemailer";
import { env } from "@/lib/env";
import { formatBdt } from "@/lib/utils";

let transporter: nodemailer.Transporter | null = null;

if (env.SMTP_HOST && env.SMTP_USER) {
  const isDirectTls = env.SMTP_PORT === 465 || env.SMTP_SECURE === true;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: isDirectTls,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
    pool: true, // Reuse authenticated SMTP connection across background emails
    maxConnections: 3,
    maxMessages: 50,
    connectionTimeout: 40000, // 40 seconds connection buffer
    greetingTimeout: 30000,
    socketTimeout: 60000,
  });
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  if (!transporter) {
    console.log(`\n========================================`);
    console.log(`[ORIS LOCAL EMAIL LOGGER - SMTP NOT CONFIGURED]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${text || html.replace(/<[^>]*>?/gm, "")}`);
    console.log(`========================================\n`);
    return { messageId: `mock_${Date.now()}` };
  }

  const info = await transporter.sendMail({
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>?/gm, ""),
  });

  return info;
}

/**
 * Fires email sending completely in the background without blocking server actions or user requests.
 */
export function sendEmailInBackground(options: SendEmailOptions) {
  setImmediate(async () => {
    try {
      await sendEmail(options);
    } catch (err) {
      console.error("[BACKGROUND EMAIL DISPATCH FAILED]:", err);
    }
  });
}

function renderEmailHeader(clinicName: string, clinicLogoUrl?: string) {
  return `
    <div style="display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #E4E4E7; padding-bottom: 14px; margin-bottom: 18px;">
      ${
        clinicLogoUrl
          ? `<img src="${clinicLogoUrl}" alt="${clinicName}" style="max-height: 48px; max-width: 140px; object-fit: contain; margin-right: 12px; display: inline-block; vertical-align: middle;" />`
          : ""
      }
      <h2 style="color: #2A5CAA; margin: 0; font-size: 20px; font-weight: 800; display: inline-block; vertical-align: middle;">${clinicName}</h2>
    </div>
  `;
}

export function renderPatientWelcomeHtml(data: {
  patientName: string;
  cardNumber: string;
  clinicName: string;
  clinicLogoUrl?: string;
  clinicPhone?: string;
  clinicAddress?: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1C1C1E; line-height: 1.6; border: 1px solid #E4E4E7; border-radius: 12px;">
      ${renderEmailHeader(data.clinicName, data.clinicLogoUrl)}
      <p>Dear <strong>${data.patientName}</strong>,</p>
      <p>Welcome to <strong>${data.clinicName}</strong>! Your patient profile has been successfully registered in our clinical management system.</p>
      
      <div style="background-color: #EBF2FC; border-left: 4px solid #2A5CAA; padding: 16px; margin: 20px 0; border-radius: 6px;">
        <p style="margin: 4px 0; font-size: 13px; color: #4B5563; text-transform: uppercase; font-weight: bold;">Your Clinic Card Number / ID</p>
        <p style="margin: 4px 0; font-family: monospace; font-size: 22px; font-weight: bold; color: #2A5CAA;">${data.cardNumber}</p>
        ${data.clinicAddress ? `<p style="margin: 8px 0 2px 0;"><strong>Chamber Address:</strong> ${data.clinicAddress}</p>` : ""}
        ${data.clinicPhone ? `<p style="margin: 2px 0;"><strong>Appointments & Contact:</strong> ${data.clinicPhone}</p>` : ""}
      </div>

      <p style="font-size: 14px; color: #4B5563;">Please keep this card number handy for quick check-in, prescription tracking, and barcode scanning whenever you visit our clinic.</p>
      
      <p style="margin-top: 30px; font-size: 12px; color: #8E8E93;">Warm regards,<br/>${data.clinicName}<br/>Powered by Oris Dental EMR</p>
    </div>
  `;
}

export function renderDueReminderHtml(data: {
  patientName: string;
  invoiceCode: string;
  dueBdt: number;
  clinicName: string;
  clinicLogoUrl?: string;
  clinicPhone?: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1C1C1E; line-height: 1.6; border: 1px solid #E4E4E7; border-radius: 12px;">
      ${renderEmailHeader(data.clinicName, data.clinicLogoUrl)}
      <p>Dear <strong>${data.patientName}</strong>,</p>
      <p>This is a gentle reminder regarding your outstanding balance for invoice <strong>${data.invoiceCode}</strong>.</p>
      
      <div style="background-color: #F4F4F5; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <span style="font-size: 12px; color: #6B7280; text-transform: uppercase; font-weight: bold; display: block;">Total Due Balance</span>
        <span style="font-size: 24px; font-weight: bold; color: #FF453A;">${formatBdt(data.dueBdt)}</span>
      </div>

      <p>You can settle this payment during your next visit at the clinic or via our reception desk (Cash, bKash, or Card).</p>
      ${data.clinicPhone ? `<p>For inquiries, please contact us at <strong>${data.clinicPhone}</strong>.</p>` : ""}
      
      <p style="margin-top: 30px; font-size: 12px; color: #8E8E93;">Thank you for trusting ${data.clinicName}.<br/>Oris Dental EMR System</p>
    </div>
  `;
}

export function renderAppointmentReminderHtml(data: {
  patientName: string;
  doctorName: string;
  clinicName: string;
  clinicLogoUrl?: string;
  clinicAddress?: string;
  displayTime: string;
  appointmentCode: string;
  is24h: boolean;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1C1C1E; line-height: 1.6; border: 1px solid #E4E4E7; border-radius: 12px;">
      ${renderEmailHeader(data.clinicName, data.clinicLogoUrl)}
      <p>Dear <strong>${data.patientName}</strong>,</p>
      <p>This is a reminder for your upcoming dental appointment ${data.is24h ? "tomorrow" : "today"}:</p>
      
      <div style="background-color: #EBF2FC; border-left: 4px solid #2A5CAA; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 4px 0;"><strong>Date & Time:</strong> ${data.displayTime}</p>
        <p style="margin: 4px 0;"><strong>Doctor:</strong> ${data.doctorName}</p>
        <p style="margin: 4px 0;"><strong>Appointment Code:</strong> ${data.appointmentCode}</p>
        ${data.clinicAddress ? `<p style="margin: 4px 0;"><strong>Location:</strong> ${data.clinicAddress}</p>` : ""}
      </div>

      <p>Please arrive 10 minutes prior to your scheduled time. If you need to reschedule or have questions, please reach out to our clinic.</p>
      
      <p style="margin-top: 30px; font-size: 12px; color: #8E8E93;">Warm regards,<br/>${data.clinicName}</p>
    </div>
  `;
}

export function renderPasswordResetHtml(data: {
  userName: string;
  resetUrl: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1C1C1E; line-height: 1.6; border: 1px solid #E4E4E7; border-radius: 12px;">
      <h2 style="color: #2A5CAA; border-bottom: 2px solid #E4E4E7; padding-bottom: 12px;">Oris Dental EMR</h2>
      <p>Hello <strong>${data.userName}</strong>,</p>
      <p>We received a request to reset your Oris EMR account password. Click the button below to set a new password:</p>
      
      <div style="margin: 24px 0; text-align: center;">
        <a href="${data.resetUrl}" style="background-color: #2A5CAA; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
          Reset Your Password
        </a>
      </div>

      <p style="font-size: 13px; color: #6B7280;">This password reset link is valid for 1 hour. If you did not request this, you can safely ignore this email.</p>
      <p style="font-size: 11px; color: #8E8E93; word-break: break-all; margin-top: 16px;">Direct link: ${data.resetUrl}</p>
    </div>
  `;
}

export function renderAppointmentConfirmationHtml(data: {
  patientName: string;
  doctorName: string;
  clinicName: string;
  clinicLogoUrl?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  displayTime: string;
  appointmentCode: string;
  isConfirmed: boolean;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1C1C1E; line-height: 1.6; border: 1px solid #E4E4E7; border-radius: 12px;">
      ${renderEmailHeader(data.clinicName, data.clinicLogoUrl)}
      <p>Dear <strong>${data.patientName}</strong>,</p>
      <p>${data.isConfirmed ? "Your dental appointment has been <strong>confirmed</strong>!" : "We have received your appointment booking request!"}</p>
      
      <div style="background-color: #EBF2FC; border-left: 4px solid #2A5CAA; padding: 16px; margin: 20px 0; border-radius: 6px;">
        <p style="margin: 4px 0;"><strong>Date & Time:</strong> ${data.displayTime}</p>
        <p style="margin: 4px 0;"><strong>Dentist:</strong> ${data.doctorName}</p>
        <p style="margin: 4px 0;"><strong>Appointment Reference:</strong> <span style="font-family: monospace; font-size: 14px; font-weight: bold; color: #2A5CAA;">${data.appointmentCode}</span></p>
        ${data.clinicAddress ? `<p style="margin: 4px 0;"><strong>Location:</strong> ${data.clinicAddress}</p>` : ""}
        ${data.clinicPhone ? `<p style="margin: 4px 0;"><strong>Chamber Phone:</strong> ${data.clinicPhone}</p>` : ""}
      </div>

      <p>Please arrive 10 minutes prior to your scheduled time with any previous dental records or X-rays.</p>
      
      <p style="margin-top: 30px; font-size: 12px; color: #8E8E93;">Warm regards,<br/>${data.clinicName}<br/>Powered by Oris EMR</p>
    </div>
  `;
}

export function renderPaymentReceiptHtml(data: {
  patientName: string;
  cardNumber: string;
  invoiceCode: string;
  clinicName: string;
  clinicLogoUrl?: string;
  clinicPhone?: string;
  clinicAddress?: string;
  date: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPriceBdt: number;
    totalBdt: number;
  }>;
  subtotalBdt: number;
  discountBdt: number;
  totalBdt: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: string;
  paymentStatus: "PAID" | "PARTIALLY PAID" | "DUE";
}) {
  const isPaidInFull = data.dueAmount <= 0;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 28px; color: #1C1C1E; line-height: 1.6; border: 1px solid #E4E4E7; border-radius: 16px; background-color: #ffffff;">
      ${renderEmailHeader(data.clinicName, data.clinicLogoUrl)}

      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <div>
          <span style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #6B7280; letter-spacing: 0.5px;">Payment Receipt &amp; Invoice</span>
          <h1 style="margin: 2px 0 0 0; font-size: 22px; font-weight: 900; color: #1C1C1E; font-family: monospace;">${data.invoiceCode}</h1>
          <p style="margin: 2px 0 0 0; font-size: 12px; color: #6B7280;">Date: ${data.date}</p>
        </div>
        <div style="text-align: right;">
          <span style="display: inline-block; padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 800; text-transform: uppercase; ${
            isPaidInFull
              ? "background-color: #E8F8EE; color: #16A34A; border: 1px solid #B8E8C7;"
              : "background-color: #FEF3C7; color: #D97706; border: 1px solid #FCD34D;"
          }">
            ${data.paymentStatus}
          </span>
        </div>
      </div>

      <div style="background-color: #F8FAFC; border-radius: 12px; padding: 16px; margin-bottom: 24px; border: 1px solid #E2E8F0;">
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="color: #6B7280; padding: 3px 0;"><strong>Billed To:</strong></td>
            <td style="text-align: right; font-weight: bold; color: #1C1C1E;">${data.patientName}</td>
          </tr>
          <tr>
            <td style="color: #6B7280; padding: 3px 0;"><strong>Card Number:</strong></td>
            <td style="text-align: right; font-family: monospace; font-weight: bold; color: #2A5CAA;">${data.cardNumber}</td>
          </tr>
          <tr>
            <td style="color: #6B7280; padding: 3px 0;"><strong>Payment Method:</strong></td>
            <td style="text-align: right; text-transform: capitalize; font-weight: 600;">${data.paymentMethod}</td>
          </tr>
        </table>
      </div>

      <!-- Line Items Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
        <thead>
          <tr style="border-bottom: 2px solid #E4E4E7; text-align: left;">
            <th style="padding: 8px 4px; color: #4B5563; font-weight: bold;">Treatment / Service</th>
            <th style="padding: 8px 4px; text-align: center; color: #4B5563; font-weight: bold;">Qty</th>
            <th style="padding: 8px 4px; text-align: right; color: #4B5563; font-weight: bold;">Rate</th>
            <th style="padding: 8px 4px; text-align: right; color: #4B5563; font-weight: bold;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${data.items
            .map(
              (item) => `
            <tr style="border-bottom: 1px solid #F4F4F5;">
              <td style="padding: 10px 4px; font-weight: 600; color: #1C1C1E;">${item.description}</td>
              <td style="padding: 10px 4px; text-align: center; color: #6B7280;">${item.quantity}</td>
              <td style="padding: 10px 4px; text-align: right; color: #6B7280;">${formatBdt(item.unitPriceBdt)}</td>
              <td style="padding: 10px 4px; text-align: right; font-weight: bold; color: #1C1C1E;">${formatBdt(item.totalBdt)}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>

      <!-- Totals Breakdown -->
      <div style="background-color: #F8FAFC; border-radius: 12px; padding: 16px; margin-bottom: 24px; border: 1px solid #E2E8F0;">
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #4B5563;">Subtotal:</td>
            <td style="padding: 4px 0; text-align: right; font-weight: bold;">${formatBdt(data.subtotalBdt)}</td>
          </tr>
          ${
            data.discountBdt > 0
              ? `
          <tr>
            <td style="padding: 4px 0; color: #4B5563;">Discount:</td>
            <td style="padding: 4px 0; text-align: right; color: #16A34A; font-weight: bold;">- ${formatBdt(data.discountBdt)}</td>
          </tr>`
              : ""
          }
          <tr style="border-top: 1px solid #E2E8F0;">
            <td style="padding: 8px 0 4px 0; font-weight: 800; font-size: 15px; color: #1C1C1E;">Total Payable:</td>
            <td style="padding: 8px 0 4px 0; text-align: right; font-weight: 900; font-size: 16px; color: #2A5CAA;">${formatBdt(data.totalBdt)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 800; color: #16A34A;">Amount Paid Now:</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 900; font-size: 15px; color: #16A34A;">${formatBdt(data.paidAmount)}</td>
          </tr>
          ${
            data.dueAmount > 0
              ? `
          <tr style="border-top: 1px dashed #CBD5E1;">
            <td style="padding: 8px 0 4px 0; font-weight: 800; color: #DC2626;">Remaining Due Balance:</td>
            <td style="padding: 8px 0 4px 0; text-align: right; font-weight: 900; font-size: 15px; color: #DC2626;">${formatBdt(data.dueAmount)}</td>
          </tr>`
              : `
          <tr>
            <td style="padding: 4px 0; color: #16A34A; font-weight: bold;">Outstanding Balance:</td>
            <td style="padding: 4px 0; text-align: right; color: #16A34A; font-weight: bold;">৳0 (Fully Cleared)</td>
          </tr>`
          }
        </table>
      </div>

      <div style="font-size: 12px; color: #6B7280; text-align: center; border-top: 1px solid #E4E4E7; padding-top: 16px; line-height: 1.5;">
        ${data.clinicAddress ? `<p style="margin: 2px 0;">${data.clinicAddress}</p>` : ""}
        ${data.clinicPhone ? `<p style="margin: 2px 0;">Contact: ${data.clinicPhone}</p>` : ""}
        <p style="margin: 8px 0 0 0; color: #9CA3AF; font-size: 11px;">Thank you for your visit to ${data.clinicName}. Powered by Oris Dental EMR.</p>
      </div>
    </div>
  `;
}

export function renderBroadcastAnnouncementHtml(data: {
  recipientName: string;
  title: string;
  message: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1C1C1E; line-height: 1.6; border: 1px solid #E4E4E7; border-radius: 12px;">
      <h2 style="color: #2A5CAA; border-bottom: 2px solid #E4E4E7; padding-bottom: 12px;">Oris Platform Notification</h2>
      <p>Hello <strong>${data.recipientName}</strong>,</p>
      <div style="background-color: #F4F4F5; border-left: 4px solid #2A5CAA; padding: 16px; margin: 20px 0; border-radius: 6px;">
        <h3 style="margin: 0 0 8px 0; color: #1C1C1E; font-size: 16px;">${data.title}</h3>
        <p style="margin: 0; color: #4B5563; white-space: pre-wrap; font-size: 14px;">${data.message}</p>
      </div>
      <p style="font-size: 13px; color: #6B7280;">This message was broadcast by the Oris System Administration team to your clinic.</p>
      <p style="margin-top: 30px; font-size: 12px; color: #8E8E93;">Warm regards,<br/>Oris Platform Administration</p>
    </div>
  `;
}
