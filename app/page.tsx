import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
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

  return <LandingPageClient />;
}
