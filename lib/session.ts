import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "@/db";
import { tenants, users } from "@/db/schema";

export interface SessionContext {
  user: typeof users.$inferSelect;
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
  };
  tenant: typeof tenants.$inferSelect | null;
}

/**
 * Retrieves the current session and user from headers. Returns null if unauthenticated.
 * Wrapped in React cache() to deduplicate execution across layout and page within the same request.
 */
export const getSession = cache(async (): Promise<SessionContext | null> => {
  const reqHeaders = await headers();
  const sessionResult = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (!sessionResult || !sessionResult.user) {
    return null;
  }

  // Fetch user profile and tenant in a single joined query to eliminate sequential network round trips
  const [row] = await db
    .select({
      user: users,
      tenant: tenants,
    })
    .from(users)
    .leftJoin(tenants, eq(users.tenantId, tenants.id))
    .where(eq(users.id, sessionResult.user.id))
    .limit(1);

  if (!row || !row.user || row.user.status !== "active") {
    return null;
  }

  if (row.user.tenantId && (!row.tenant || row.tenant.status !== "active")) {
    return null;
  }

  return {
    user: row.user,
    session: sessionResult.session,
    tenant: row.tenant,
  };
});

/**
 * Enforces authenticated session; redirects to /login if unauthenticated or disabled.
 */
export async function requireSession(): Promise<SessionContext> {
  const context = await getSession();
  if (!context) {
    redirect("/login");
  }
  return context;
}

/**
 * Enforces Super Admin role; redirects or throws 404/login if unauthorized.
 */
export async function requireSuperAdmin(): Promise<SessionContext> {
  const context = await requireSession();
  if (context.user.role !== "SUPER_ADMIN" || context.user.tenantId !== null) {
    redirect("/login");
  }
  return context;
}

/**
 * Enforces clinic staff session (Tenant Admin, Doctor, or Receptionist).
 */
export async function requireClinicStaff(): Promise<SessionContext & { tenant: typeof tenants.$inferSelect }> {
  const context = await requireSession();
  if (!context.tenant || context.user.role === "SUPER_ADMIN") {
    redirect("/login");
  }
  return context as SessionContext & { tenant: typeof tenants.$inferSelect };
}
