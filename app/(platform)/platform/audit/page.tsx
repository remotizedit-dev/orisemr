import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireSuperAdmin } from "@/lib/session";
import AuditClient from "@/components/platform/AuditClient";

export default async function PlatformAuditPage() {
  await requireSuperAdmin();

  const auditRows = await db
    .select({
      id: schema.auditLogs.id,
      action: schema.auditLogs.action,
      entityType: schema.auditLogs.entityType,
      entityId: schema.auditLogs.entityId,
      actorId: schema.auditLogs.actorId,
      actorName: schema.users.name,
      actorEmail: schema.users.email,
      tenantId: schema.auditLogs.tenantId,
      tenantName: schema.tenants.name,
      ip: schema.auditLogs.ip,
      before: schema.auditLogs.before,
      after: schema.auditLogs.after,
      createdAt: schema.auditLogs.createdAt,
    })
    .from(schema.auditLogs)
    .leftJoin(schema.users, eq(schema.auditLogs.actorId, schema.users.id))
    .leftJoin(schema.tenants, eq(schema.auditLogs.tenantId, schema.tenants.id))
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(100);

  const entityTypes = Array.from(
    new Set(auditRows.map((r) => r.entityType))
  ).filter(Boolean);

  const formattedLogs = auditRows.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
  }));

  return <AuditClient logs={formattedLogs} entityTypes={entityTypes} />;
}
