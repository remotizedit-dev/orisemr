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
} from "lucide-react";

export default function SettingsTabs() {
  const pathname = usePathname();

  const tabs = [
    { href: "/app/settings", label: "General & Booking", icon: Building2, exact: true },
    { href: "/app/settings/doctors", label: "Doctors & Rosters", icon: UserCheck },
    { href: "/app/settings/staff", label: "Staff & Front-Desk", icon: Users },
    { href: "/app/settings/hours", label: "Working Hours & Shifts", icon: Clock },
    { href: "/app/settings/chairs", label: "Chairs & Operatories", icon: Armchair },
    { href: "/app/settings/services", label: "Procedures & Pricing", icon: Stethoscope },
    { href: "/app/settings/prescriptions", label: "Prescription Catalog", icon: Pill },
    { href: "/app/settings/card", label: "Patient Card Mode", icon: CreditCard },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E4E4E7]">
      {tabs.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              isActive
                ? "bg-[#2A5CAA] text-white shadow-xs"
                : "text-[#6B7280] hover:text-[#1C1C1E] hover:bg-white"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
