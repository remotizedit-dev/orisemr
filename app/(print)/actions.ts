"use server";

import { requireClinicStaff } from "@/lib/session";
import { generateSignedPrintUrl } from "@/lib/signed-urls";

export async function getSignedPrintUrlAction(path: string, expiresInDays: number = 7) {
  await requireClinicStaff();
  const signedUrl = generateSignedPrintUrl(path, expiresInDays * 24 * 3600);
  return { signedUrl };
}
