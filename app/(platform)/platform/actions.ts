"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/session";
import { setSystemSetting, getSystemSetting } from "@/lib/settings";

export async function updateLandingVideoUrl(videoUrl: string) {
  await requireSuperAdmin();
  const trimmed = videoUrl.trim();
  await setSystemSetting("landing_youtube_url", trimmed);
  revalidatePath("/");
  revalidatePath("/platform");
  return { success: true, videoUrl: trimmed };
}

export async function fetchLandingVideoUrl() {
  return await getSystemSetting(
    "landing_youtube_url",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  );
}
