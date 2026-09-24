import Link from "next/link";
import { requireClinicStaff } from "@/lib/session";
import { ScanListener } from "@/components/scan/ScanListener";
import { ScanModal } from "@/components/scan/ScanModal";
import { CommandPalette } from "@/components/palette/CommandPalette";
import { Stethoscope } from "lucide-react";
import SignOutButton from "@/components/auth/SignOutButton";
import { SearchTrigger } from "@/components/palette/SearchTrigger";
import { TenantSidebarNav } from "@/components/layout/TenantSidebarNav";
import { TenantMobileNav } from "@/components/layout/TenantMobileNav";
import { FirstLoginPasswordModal } from "@/components/auth/FirstLoginPasswordModal";

export default async function TenantAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, tenant } = await requireClinicStaff();
  const mustChangePassword = Boolean((user.preferences as Record<string, unknown>)?.mustChangePassword);

  return (
    <div className="min-h-screen bg-[#F4F4F5] flex">
      {/* First-login mandatory password change modal */}
      <FirstLoginPasswordModal mustChange={mustChangePassword} userName={user.name} />

      {/* Global Barcode Hardware Scanner Listener */}
      <ScanListener tenantId={tenant.id} tenantShortCode={tenant.shortCode} />
      <CommandPalette tenantId={tenant.id} tenantShortCode={tenant.shortCode} />

      {/* Collapsible Left Sidebar */}
      <aside className="w-68 border-r border-[#E4E4E7] bg-white flex flex-col justify-between hidden md:flex shrink-0">
        <div>
          {/* Clinic Brand Header */}
          <div className="p-5 border-b border-[#E4E4E7]">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm shrink-0"
                style={{ backgroundColor: tenant.brandColor || "#2A5CAA" }}
              >
                <Stethoscope className="w-6 h-6" />
              </div>
              <div className="overflow-hidden min-w-0">
                <span className="text-base font-extrabold text-[#1C1C1E] tracking-tight block truncate">
                  {tenant.name}
                </span>
                <span className="font-mono text-xs uppercase font-bold text-[#2A5CAA] bg-[#E8EEF7] px-2 py-0.5 rounded-md inline-block mt-0.5">
                  {tenant.shortCode}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <TenantSidebarNav userRole={user.role} />
        </div>

        {/* User Card at bottom of sidebar */}
        <div className="p-4 border-t border-[#E4E4E7] bg-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-[#EBF2FC] text-[#2A5CAA] font-bold text-sm flex items-center justify-center shrink-0 border border-[#2A5CAA]/20">
                {user.name ? user.name.slice(0, 1).toUpperCase() : "U"}
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-[#1C1C1E] block truncate">
                  {user.name}
                </span>
                <span className="text-xs text-[#4B5563] uppercase font-semibold block truncate">
                  {user.role} {user.isDoctor && "• Dentist"}
                </span>
              </div>
            </div>
            <SignOutButton
              showText={true}
              text="Log Out"
              className="px-2.5 py-1.5 text-xs font-bold text-[#DC2626] bg-[#FEE2E2]/60 hover:bg-[#DC2626] hover:text-white border border-[#FCA5A5]/60 hover:border-[#DC2626] rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Log Out of EMR"
            />
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Liquid Glass Header */}
        <header className="sticky top-0 z-30 glass-panel border-b border-[#E4E4E7] px-4 sm:px-6 py-3 flex items-center justify-between gap-3 sm:gap-4">
          {/* Mobile Drawer Trigger & Quick Palette Trigger Search Bar */}
          <div className="flex items-center gap-2.5 flex-1 max-w-lg min-w-0">
            <TenantMobileNav
              userRole={user.role}
              userName={user.name}
              userEmail={user.email}
              isDoctor={Boolean(user.isDoctor)}
              tenantName={tenant.name}
              tenantShortCode={tenant.shortCode}
              brandColor={tenant.brandColor || "#2A5CAA"}
              tenantSlug={tenant.slug}
            />
            <div className="flex-1 min-w-0">
              <SearchTrigger />
            </div>
          </div>

          {/* Right Header: Scan Modal, Public Link, User Pill & Prominent Log Out */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <ScanModal
              tenantId={tenant.id}
              tenantShortCode={tenant.shortCode}
              triggerButton={true}
            />
            <Link
              href={`/book/${tenant.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-bold text-[#2A5CAA] bg-[#E8EEF7] hover:bg-[#2A5CAA] hover:text-white px-3.5 py-2 rounded-xl transition shadow-2xs hidden lg:inline-flex items-center gap-1.5"
            >
              <span>Public Booking Page</span>
              <span>↗</span>
            </Link>

            {/* User Profile Pill & Prominent Header Log Out Button */}
            <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-[#E4E4E7]">
              {/* User Avatar & Name (visible on sm+) */}
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#EBF2FC] text-[#2A5CAA] font-bold text-xs flex items-center justify-center shrink-0 border border-[#2A5CAA]/20">
                  {user.name ? user.name.slice(0, 1).toUpperCase() : "U"}
                </div>
                <div className="hidden xl:flex flex-col text-left leading-tight">
                  <span className="text-xs font-bold text-[#1C1C1E] truncate max-w-[130px]">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-[#4B5563] uppercase font-semibold">
                    {user.role === "TENANT_ADMIN" ? "Admin" : user.role} {user.isDoctor && "• Dentist"}
                  </span>
                </div>
              </div>

              {/* Dedicated, Prominent Log Out Button */}
              <SignOutButton
                showText={true}
                text="Log Out"
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-[#DC2626] bg-[#FEE2E2]/60 hover:bg-[#DC2626] hover:text-white border border-[#FCA5A5]/70 hover:border-[#DC2626] rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                title="Log Out of Clinic EMR"
              />
            </div>
          </div>
        </header>

        {/* Workspace Canvas */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
