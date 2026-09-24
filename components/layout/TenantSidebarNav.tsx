"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  CreditCard,
  FileText,
  Layers,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

interface TenantSidebarNavProps {
  userRole: string;
}

export function TenantSidebarNav({ userRole }: TenantSidebarNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/app",
      label: "Dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: "/app/queue",
      label: "Live Queue",
      icon: Layers,
      isLiveQueue: true,
    },
    {
      href: "/app/appointments",
      label: "Appointments",
      icon: Calendar,
    },
    {
      href: "/app/patients",
      label: "Patients",
      icon: Users,
    },
    {
      href: "/app/prescriptions",
      label: "Prescriptions",
      icon: FileText,
    },
    {
      href: "/app/billing",
      label: "Billing & Invoices",
      icon: CreditCard,
    },
    {
      href: "/app/settings",
      label: "Chamber Settings",
      icon: Settings,
      adminOnly: true,
    },
  ];

  return (
    <nav className="p-3.5 space-y-1.5">
      {navItems.map((item) => {
        if (item.adminOnly && userRole !== "TENANT_ADMIN") return null;

        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition ${
              isActive
                ? "bg-[#2A5CAA] text-white shadow-sm"
                : "text-[#4B5563] hover:text-[#1C1C1E] hover:bg-[#F4F4F5]"
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? "text-white" : "text-[#6B7280]"
                }`}
              />
              <span className="truncate">{item.label}</span>
            </div>

            {item.isLiveQueue && (
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  isActive ? "bg-white animate-pulse" : "bg-[#30D158] animate-pulse"
                }`}
                title="Live Queue Active"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
