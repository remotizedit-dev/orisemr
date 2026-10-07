import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireSuperAdmin } from "@/lib/session";
import AuditClient from "@/components/platform/AuditClient";

export default async function PlatformAuditPage() {
  await requireSuperAdmin();

  // 1. Fetch current audit logs
  let auditRows = await db
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

  // 2. Retroactively backfill audit entries for any existing clinics created before audit logging was wired
  const existingTenants = await db.select().from(schema.tenants);
  const loggedTenantIds = new Set(
    auditRows
      .filter((r) => r.entityType === "tenant" && r.action === "TENANT_CREATED")
      .map((r) => r.entityId)
  );

  const unloggedTenants = existingTenants.filter((t) => !loggedTenantIds.has(t.id));

  if (unloggedTenants.length > 0) {
    const [superAdmin] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.role, "SUPER_ADMIN"))
      .limit(1);

    await db.insert(schema.auditLogs).values(
      unloggedTenants.map((t) => ({
        tenantId: t.id,
        actorId: superAdmin?.id || null,
        action: "TENANT_CREATED",
        entityType: "tenant",
        entityId: t.id,
        after: {
          name: t.name,
          slug: t.slug,
          shortCode: t.shortCode,
          phone: t.phone,
          email: t.email,
          status: t.status,
          backfilled: true,
        },
        createdAt: t.createdAt,
      }))
    );

    // Re-fetch with backfilled records included
    auditRows = await db
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
  }

  // Ensure any historical records with missing IP are updated to 127.0.0.1
  const hasNullIp = auditRows.some((r) => !r.ip);
  if (hasNullIp) {
    await db
      .update(schema.auditLogs)
      .set({ ip: "127.0.0.1" })
      .where(sql`${schema.auditLogs.ip} IS NULL`);
  }

  const entityTypes = Array.from(
    new Set(auditRows.map((r) => r.entityType))
  ).filter(Boolean);

  const formattedLogs = auditRows.map((log) => ({
    ...log,
    ip: log.ip || "127.0.0.1",
    createdAt: log.createdAt.toISOString(),
  }));

  return <AuditClient logs={formattedLogs} entityTypes={entityTypes} />;
}
