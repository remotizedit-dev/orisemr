import { getSystemSetting } from "@/lib/settings";
import LandingPageClient from "@/components/landing/LandingPageClient";

export const metadata = {
  title: "Oris EMR — ফ্রি ডেমো ও অফার | Dental Chamber Software",
  description:
    "রোগী বসে আছে, আর আপনি প্রেসক্রিপশন লিখছেন? বাংলায় ডেন্টাল প্রেসক্রিপশন, ১ ক্লিকে ফলো-আপ ও টিভি সিরিয়াল কলিং। ৪ মাস মাত্র ২,০০০ টাকা।",
};

export default async function DemoPage() {
  const landingVideoUrl = await getSystemSetting(
    "landing_youtube_url",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  );

  return <LandingPageClient initialVideoUrl={landingVideoUrl} />;
}

