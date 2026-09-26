import { requireClinicStaff } from "@/lib/session";
import SettingsSidebarNav from "@/components/settings/SettingsSidebarNav";
import { Sliders } from "lucide-react";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { tenant } = await requireClinicStaff();

  return (
    <div className="w-full space-y-5">
      {/* Top Banner Header */}
      <div className="glass-panel p-5 rounded-3xl border border-[#E4E4E7] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#EBF2FC] text-[#2A5CAA] flex items-center justify-center font-bold shrink-0 border border-[#2A5CAA]/20">
            <Sliders className="w-5 h-5 text-[#2A5CAA]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-[#1C1C1E] tracking-tight">
                Chamber Settings
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EBF2FC] text-[#2A5CAA] uppercase tracking-wider border border-[#2A5CAA]/20">
                {tenant.name}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-[#4B5563] mt-0.5">
              Manage clinic configurations, doctors, working shifts, dental chairs, and clinical workflows.
            </p>
          </div>
        </div>
      </div>

      {/* 2-Column Layout: Left Navigation + Right Full-Width Content */}
      <div className="flex flex-col lg:flex-row items-start gap-6 w-full">
        {/* Left Side Navigation Sidebar */}
        <aside className="w-full lg:w-64 xl:w-72 shrink-0 lg:sticky lg:top-20 z-10">
          <SettingsSidebarNav />
        </aside>

        {/* Right Side Content Canvas (Full Width, No Gaps) */}
        <div className="flex-1 w-full min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
