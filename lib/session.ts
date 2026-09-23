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
 */
export async function getSession(): Promise<SessionContext | null> {
  const reqHeaders = await headers();
  const sessionResult = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (!sessionResult || !sessionResult.user) {
    return null;
  }

  // Fetch complete user profile from database
  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, sessionResult.user.id))
    .limit(1);

  if (!dbUser || dbUser.status !== "active") {
    return null;
  }

  // If user belongs to a tenant, check tenant status
  let tenant: typeof tenants.$inferSelect | null = null;
  if (dbUser.tenantId) {
    const [dbTenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, dbUser.tenantId))
      .limit(1);

    if (!dbTenant || dbTenant.status !== "active") {
      return null;
    }
    tenant = dbTenant;
  }

  return {
    user: dbUser,
    session: sessionResult.session,
    tenant,
  };
}

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
