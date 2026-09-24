"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireSession } from "@/lib/session";

export async function changeFirstLoginPasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}) {
  const context = await requireSession();
  const userId = context.user.id;

  if (!input.newPassword || input.newPassword.length < 8) {
    return { success: false, error: "New password must be at least 8 characters long." };
  }

  const reqHeaders = await headers();

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        revokeOtherSessions: false,
      },
      headers: reqHeaders,
    });
  } catch (err: any) {
    return {
      success: false,
      error:
        err?.message ||
        "Incorrect current temporary password or update failed. Please check and try again.",
    };
  }

  // Update user preferences to clear mustChangePassword
  const currentPreferences = (context.user.preferences as Record<string, unknown>) || {};
  await db
    .update(schema.users)
    .set({
      preferences: {
        ...currentPreferences,
        mustChangePassword: false,
      },
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId));

  revalidatePath("/app");
  return { success: true };
}
