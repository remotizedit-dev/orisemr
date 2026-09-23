import { notFound } from "next/navigation";
import { and, eq, SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

/**
 * Tenant scoping error representing attempt to access cross-tenant or non-existent record.
 * Handlers convert this to a strict 404 Not Found to prevent tenant enumeration.
 */
export class TenantNotFoundError extends Error {
  constructor(message = "Record not found") {
    super(message);
    this.name = "TenantNotFoundError";
  }
}

/**
 * Asserts session belongs to an active tenant.
 */
export function requireTenantId(session: { tenantId?: string | null } | null | undefined): string {
  if (!session || !session.tenantId) {
    throw new TenantNotFoundError("Unauthorized tenant context");
  }
  return session.tenantId;
}

/**
 * Builds a Drizzle SQL condition ensuring the query is constrained to the given tenantId.
 */
export function withTenant<T extends { tenantId: PgColumn }>(
  table: T,
  tenantId: string,
  extraCondition?: SQL | undefined
): SQL {
  if (extraCondition) {
    return and(eq(table.tenantId, tenantId), extraCondition)!;
  }
  return eq(table.tenantId, tenantId);
}

/**
 * Verifies that a fetched record belongs to the active tenant.
 * Throws Next.js notFound() if mismatched or record is null, preventing enumeration.
 */
export function assertTenantRecord<T extends { tenantId?: string | null }>(
  record: T | null | undefined,
  expectedTenantId: string
): asserts record is T {
  if (!record || record.tenantId !== expectedTenantId) {
    notFound();
  }
}
