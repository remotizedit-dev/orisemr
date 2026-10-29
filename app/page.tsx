import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getSystemSetting } from "@/lib/settings";
import LandingPageClient from "@/components/landing/LandingPageClient";

export default async function HomePage() {
  const session = await getSession();

  if (session) {
    if (session.user.role === "SUPER_ADMIN") {
      redirect("/platform");
    } else {
      redirect("/app");
    }
  }

  const landingVideoUrl = await getSystemSetting(
    "landing_youtube_url",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  );

  return <LandingPageClient initialVideoUrl={landingVideoUrl} />;
}

