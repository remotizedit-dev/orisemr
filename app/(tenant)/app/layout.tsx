import Link from "next/link";
import { requireClinicStaff } from "@/lib/session";
import { ScanListener } from "@/components/scan/ScanListener";
import { ScanModal } from "@/components/scan/ScanModal";
import { CommandPalette } from "@/components/palette/CommandPalette";
import SignOutButton from "@/components/auth/SignOutButton";
import { SearchTrigger } from "@/components/palette/SearchTrigger";
import { TenantDesktopSidebar } from "@/components/layout/TenantDesktopSidebar";
import { TenantMobileNav } from "@/components/layout/TenantMobileNav";
import { SidebarHeaderTrigger } from "@/components/layout/SidebarHeaderTrigger";
import { GlobalActionDock } from "@/components/layout/GlobalActionDock";
import { FirstLoginPasswordModal } from "@/components/auth/FirstLoginPasswordModal";
import { NotificationBell } from "@/components/notifications/NotificationBell";

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

      {/* Interactive Auto-Hide & Hover Desktop Sidebar */}
      <TenantDesktopSidebar user={user} tenant={tenant} />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Liquid Glass Header */}
        <header className="sticky top-0 z-30 glass-panel border-b border-[#E4E4E7] px-4 sm:px-6 py-3 flex items-center justify-between gap-3 sm:gap-4">
          {/* Mobile Drawer Trigger & Desktop Sidebar Trigger & Search Bar */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-1 max-w-lg min-w-0">
            <SidebarHeaderTrigger />
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

          {/* Right Header: Scan Modal, Notifications, Public Link, User Pill & Prominent Log Out */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <ScanModal
              tenantId={tenant.id}
              tenantShortCode={tenant.shortCode}
              triggerButton={true}
            />
            <NotificationBell />
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

        {/* Workspace Canvas (Full width without artificial 1280px constraint) */}
        <main className="flex-1 px-3 sm:px-5 lg:px-6 py-4 w-full">{children}</main>
      </div>

      {/* Global Floating Action Docker (New Patient & Book Appointment) */}
      <GlobalActionDock />
    </div>
  );
}
