import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";

import { sendEmail, renderPasswordResetHtml } from "@/lib/email/mailer";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [
    "https://orisemr.com",
    "https://www.orisemr.com",
    "https://*.orisemr.com",
    "https://*.vercel.app",
    "http://localhost:3000",
    ...(env.BETTER_AUTH_URL ? [env.BETTER_AUTH_URL] : []),
    ...(env.NEXT_PUBLIC_APP_URL ? [env.NEXT_PUBLIC_APP_URL] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
      : []),
  ],
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    crossSubDomainCookies: {
      enabled: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    sendResetPassword: async ({ user, url, token }) => {
      // Determine the canonical base URL for the client reset page
      const baseUrl = (env.NEXT_PUBLIC_APP_URL || env.BETTER_AUTH_URL || "https://orisemr.com").replace(/\/+$/, "");
      // Direct token-based reset link matching /reset-password?token=...
      const resetUrl = token
        ? `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`
        : url;

      try {
        await sendEmail({
          to: user.email,
          subject: "Reset Your Oris EMR Password",
          html: renderPasswordResetHtml({
            userName: user.name,
            resetUrl,
          }),
        });
      } catch (err) {
        console.error("[BETTER-AUTH] Password reset email dispatch failed:", err);
      }
    },
  },
  user: {
    additionalFields: {
      tenantId: {
        type: "string",
        required: false,
        input: false, // Set only server-side
      },
      role: {
        type: "string",
        required: true,
        defaultValue: "RECEPTIONIST",
        input: false,
      },
      isDoctor: {
        type: "boolean",
        required: true,
        defaultValue: false,
        input: false,
      },
      status: {
        type: "string",
        required: true,
        defaultValue: "active",
        input: false,
      },
      phone: {
        type: "string",
        required: false,
      },
      doctorTitle: {
        type: "string",
        required: false,
      },
      doctorDegrees: {
        type: "string",
        required: false,
      },
      doctorSpecialty: {
        type: "string",
        required: false,
      },
      doctorRegNo: {
        type: "string",
        required: false,
      },
      signatureKey: {
        type: "string",
        required: false,
      },
      calendarColor: {
        type: "string",
        required: false,
      },
      sortOrder: {
        type: "number",
        required: false,
        defaultValue: 0,
      },
    },
  },
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
