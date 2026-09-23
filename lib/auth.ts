import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";

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
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
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
