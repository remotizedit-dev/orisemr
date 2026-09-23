import { NextRequest, NextResponse } from "next/server";
import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";
import {
  sendEmail,
  renderDueReminderHtml,
  renderAppointmentReminderHtml,
} from "@/lib/email/mailer";

export async function GET(req: NextRequest) {
  // Verify Cron Secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Fetch pending emails eligible for processing
  const pendingEmails = await db
    .select()
    .from(schema.emailQueue)
    .where(
      and(
        eq(schema.emailQueue.status, "pending"),
        lte(schema.emailQueue.nextAttemptAt, now)
      )
    )
    .limit(25);

  let successCount = 0;
  let failCount = 0;

  for (const item of pendingEmails) {
    try {
      const payload = item.payload as any;
      let htmlContent = "";

      if (item.templateKey === "due_reminder") {
        htmlContent = renderDueReminderHtml(payload);
      } else if (item.templateKey === "appointment_reminder") {
        htmlContent = renderAppointmentReminderHtml(payload);
      } else {
        htmlContent = `<p>${payload?.message || "Notification from Oris Dental EMR"}</p>`;
      }

      await sendEmail({
        to: item.toEmail,
        subject: item.subject,
        html: htmlContent,
      });

      // Mark as sent
      await db
        .update(schema.emailQueue)
        .set({
          status: "sent",
          sentAt: new Date(),
        })
        .where(eq(schema.emailQueue.id, item.id));

      successCount++;
    } catch (err: any) {
      failCount++;
      const nextAttempts = item.attempts + 1;
      const isPermanentFail = nextAttempts >= 5;

      // Exponential backoff: 5m, 10m, 20m, 40m
      const backoffMinutes = Math.pow(2, nextAttempts) * 2.5;
      const nextAttemptAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

      await db
        .update(schema.emailQueue)
        .set({
          status: isPermanentFail ? "failed" : "pending",
          attempts: nextAttempts,
          lastError: err.message || "Failed to deliver email",
          nextAttemptAt,
        })
        .where(eq(schema.emailQueue.id, item.id));
    }
  }

  return NextResponse.json({
    success: true,
    processed: pendingEmails.length,
    sent: successCount,
    failed: failCount,
  });
}
