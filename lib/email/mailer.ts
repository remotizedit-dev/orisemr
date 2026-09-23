import nodemailer from "nodemailer";
import { env } from "@/lib/env";
import { formatBdt } from "@/lib/utils";

let transporter: nodemailer.Transporter | null = null;

if (env.SMTP_HOST && env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
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

export function renderDueReminderHtml(data: {
  patientName: string;
  invoiceCode: string;
  dueBdt: number;
  clinicName: string;
  clinicPhone?: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1C1C1E; line-height: 1.6;">
      <h2 style="color: #2A5CAA; border-bottom: 2px solid #E4E4E7; padding-bottom: 10px;">${data.clinicName}</h2>
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
  clinicAddress?: string;
  displayTime: string;
  appointmentCode: string;
  is24h: boolean;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1C1C1E; line-height: 1.6;">
      <h2 style="color: #2A5CAA; border-bottom: 2px solid #E4E4E7; padding-bottom: 10px;">${data.clinicName}</h2>
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
