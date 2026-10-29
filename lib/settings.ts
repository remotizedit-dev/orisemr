import { eq } from "drizzle-orm";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";

/**
 * Retrieve a system-wide configuration setting by key.
 * Returns defaultValue if setting does not exist or if database query fails.
 */
export async function getSystemSetting(key: string, defaultValue: string = ""): Promise<string> {
  try {
    const [row] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1);
    return row?.value ?? defaultValue;
  } catch (error) {
    console.warn(`[getSystemSetting] Failed to fetch setting '${key}':`, error);
    return defaultValue;
  }
}

/**
 * Upsert a system-wide configuration setting by key.
 */
export async function setSystemSetting(key: string, value: string): Promise<void> {
  await db
    .insert(systemSettings)
    .values({
      key,
      value,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: {
        value,
        updatedAt: new Date(),
      },
    });
}
