import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/session";
import { Shield, Stethoscope } from "lucide-react";
import SignOutButton from "@/components/auth/SignOutButton";
import { PlatformNav } from "@/components/layout/PlatformNav";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSuperAdmin();

  return (
    <div className="min-h-screen bg-[#F4F4F5] flex flex-col">
      {/* Super Admin Top Navigation Bar */}
      <header className="sticky top-0 z-40 glass-panel border-b border-[#E4E4E7] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/platform" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1C1C1E] flex items-center justify-center text-white shadow">
              <Shield className="w-5 h-5 text-[#FF9F0A]" />
            </div>
            <div>
              <span className="text-base font-bold text-[#1C1C1E] tracking-tight">
                Oris Platform
              </span>
              <span className="block text-[9px] uppercase font-bold text-[#FF9F0A] tracking-wider">
                Super Admin
              </span>
            </div>
          </Link>

          <PlatformNav />
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-[#6B7280] hidden sm:inline">
            {session.user.name} ({session.user.email})
          </span>
          <SignOutButton
            className="p-2 rounded-lg text-[#6B7280] hover:text-[#FF453A] hover:bg-white transition cursor-pointer"
            title="Sign Out"
          />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</main>
    </div>
  );
}
