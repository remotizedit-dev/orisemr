import { headers } from "next/headers";
import { db } from "@/db";
import * as schema from "@/db/schema";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toValidUuid(val?: string | null): string | null {
  if (!val) return null;
  return UUID_REGEX.test(val) ? val : null;
}

export interface LogAuditOptions {
  action: string;
  entityType: string;
  entityId?: string | null;
  actorId?: string | null;
  tenantId?: string | null;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  ip?: string | null;
  tx?: any;
}

/**
 * Centrally records an immutable security and compliance audit log entry.
 * Designed defensively: failures in logging will log an error without throwing
 * to prevent interrupting the primary user action.
 */
export async function logAudit(options: LogAuditOptions): Promise<void> {
  try {
    let clientIp = options.ip || null;

    if (!clientIp) {
      try {
        const reqHeaders = await headers();
        clientIp =
          reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          reqHeaders.get("x-real-ip") ||
          null;
      } catch {
        // Outside Next.js request context (e.g. script / cron)
      }
    }

    const runner = options.tx || db;

    await runner.insert(schema.auditLogs).values({
      action: options.action,
      entityType: options.entityType,
      entityId: toValidUuid(options.entityId),
      actorId: options.actorId || null,
      tenantId: toValidUuid(options.tenantId),
      before: options.before || null,
      after: options.after || null,
      ip: clientIp,
    });
  } catch (err) {
    console.error("[AUDIT LOGGING FAILED]:", err);
  }
}
