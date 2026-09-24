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

interface CachedSessionEntry {
  context: SessionContext;
  cachedAt: number;
}

const globalForSession = globalThis as unknown as {
  sessionMemoryCache: Map<string, CachedSessionEntry> | undefined;
};

const sessionMemoryCache =
  globalForSession.sessionMemoryCache ?? new Map<string, CachedSessionEntry>();
globalForSession.sessionMemoryCache = sessionMemoryCache;

const SESSION_CACHE_TTL_MS = 45 * 1000; // 45 seconds in-memory TTL

function extractSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
  return match ? decodeURIComponent(match[1].trim()) : null;
}

export function invalidateSession(token?: string) {
  if (token) {
    sessionMemoryCache.delete(token);
  } else {
    sessionMemoryCache.clear();
  }
}

/**
 * Retrieves the current session and user from headers. Returns null if unauthenticated.
 * Uses an in-memory session cache (45s TTL) to eliminate redundant round-trips to the remote database
 * on every page navigation, wrapped in React cache() for request-level deduplication.
 */
export const getSession = cache(async (): Promise<SessionContext | null> => {
  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie");
  const token = extractSessionToken(cookieHeader);

  // 1. Fast-path: Return cached session if still valid (0ms database time)
  if (token && sessionMemoryCache.has(token)) {
    const cached = sessionMemoryCache.get(token)!;
    const now = Date.now();
    if (
      now - cached.cachedAt < SESSION_CACHE_TTL_MS &&
      new Date(cached.context.session.expiresAt).getTime() > now
    ) {
      return cached.context;
    }
    sessionMemoryCache.delete(token);
  }

  // 2. Query better-auth for session validation
  const sessionResult = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (!sessionResult || !sessionResult.user) {
    if (token) sessionMemoryCache.delete(token);
    return null;
  }

  // 3. Fetch user profile and tenant in a single joined query to eliminate sequential network round trips
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
    if (token) sessionMemoryCache.delete(token);
    return null;
  }

  if (row.user.tenantId && (!row.tenant || row.tenant.status !== "active")) {
    if (token) sessionMemoryCache.delete(token);
    return null;
  }

  const context: SessionContext = {
    user: row.user,
    session: sessionResult.session,
    tenant: row.tenant,
  };

  // 4. Save to in-memory cache for subsequent instant page transitions
  if (token) {
    sessionMemoryCache.set(token, {
      context,
      cachedAt: Date.now(),
    });

    if (sessionMemoryCache.size > 2000) {
      const now = Date.now();
      for (const [k, v] of sessionMemoryCache.entries()) {
        if (now - v.cachedAt > SESSION_CACHE_TTL_MS) {
          sessionMemoryCache.delete(k);
        }
      }
    }
  }

  return context;
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
