"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/session";
import { setSystemSetting, getSystemSetting } from "@/lib/settings";
import { extractYouTubeVideoId } from "@/lib/youtube";

export async function updateLandingVideoUrl(videoUrl: string) {
  await requireSuperAdmin();
  const videoId = extractYouTubeVideoId(videoUrl);
  if (!videoId) {
    throw new Error("Invalid YouTube video URL or ID");
  }
  const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;
  await setSystemSetting("landing_youtube_url", normalizedUrl);
  revalidatePath("/");
  revalidatePath("/platform");
  return { success: true, videoUrl: normalizedUrl };
}

export async function fetchLandingVideoUrl() {
  return await getSystemSetting(
    "landing_youtube_url",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  );
}
