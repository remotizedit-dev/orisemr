"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Clock,
  Armchair,
  Stethoscope,
  CreditCard,
  UserCheck,
  Users,
  Pill,
  ChevronRight,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/app/settings",
    label: "General & Booking",
    description: "Clinic profile, reminders, buffers",
    icon: Building2,
    exact: true,
  },
  {
    href: "/app/settings/doctors",
    label: "Doctors & Rosters",
    description: "Surgeons, schedules & slots",
    icon: UserCheck,
  },
  {
    href: "/app/settings/staff",
    label: "Staff & Front-Desk",
    description: "Receptionists & permissions",
    icon: Users,
  },
  {
    href: "/app/settings/hours",
    label: "Working Hours & Shifts",
    description: "Clinic opening & weekly shifts",
    icon: Clock,
  },
  {
    href: "/app/settings/chairs",
    label: "Chairs & Operatories",
    description: "Active dental chairs setup",
    icon: Armchair,
  },
  {
    href: "/app/settings/services",
    label: "Procedures & Pricing",
    description: "Treatment fees & categories",
    icon: Stethoscope,
  },
  {
    href: "/app/settings/prescriptions",
    label: "Prescription Catalog",
    description: "Medicines & advice templates",
    icon: Pill,
  },
  {
    href: "/app/settings/card",
    label: "Patient Card Mode",
    description: "Numbering format & barcode",
    icon: CreditCard,
  },
];

export default function SettingsSidebarNav() {
  const pathname = usePathname();

  return (
    <div className="w-full">
      {/* Mobile / Tablet Horizontal Scrollable Strip (< lg) */}
      <div className="flex lg:hidden items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                isActive
                  ? "bg-[#2A5CAA] text-white shadow-xs"
                  : "bg-white text-[#4B5563] hover:text-[#1C1C1E] hover:bg-[#F4F4F5] border border-[#E4E4E7]"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Desktop Vertical Left Navigation Panel (>= lg) */}
      <div className="hidden lg:flex flex-col glass-panel p-3 rounded-3xl border border-[#E4E4E7] shadow-xs space-y-1.5 bg-white/80 backdrop-blur-md">
        <div className="px-3 pt-2 pb-2">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9CA3AF]">
            Clinic Settings
          </p>
        </div>

        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center justify-between p-2.5 rounded-2xl text-left transition-all ${
                isActive
                  ? "bg-[#2A5CAA] text-white shadow-sm shadow-[#2A5CAA]/20"
                  : "hover:bg-[#F4F4F5] text-[#1C1C1E]"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[#EBF2FC] text-[#2A5CAA] group-hover:bg-[#2A5CAA] group-hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-xs font-bold truncate ${
                      isActive ? "text-white" : "text-[#1C1C1E]"
                    }`}
                  >
                    {item.label}
                  </div>
                  <div
                    className={`text-[10px] truncate ${
                      isActive ? "text-white/80" : "text-[#6B7280]"
                    }`}
                  >
                    {item.description}
                  </div>
                </div>
              </div>
              <ChevronRight
                className={`w-4 h-4 shrink-0 transition-transform ${
                  isActive
                    ? "text-white/90 translate-x-0.5"
                    : "text-[#9CA3AF] group-hover:text-[#1C1C1E]"
                }`}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
