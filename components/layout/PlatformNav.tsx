"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CreditCard,
  Layers,
  LayoutDashboard,
  Radio,
  ScrollText,
} from "lucide-react";

export function PlatformNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/platform",
      label: "Dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: "/platform/tenants",
      label: "Clinics",
      icon: Building2,
    },
    {
      href: "/platform/subscriptions",
      label: "Subscriptions",
      icon: CreditCard,
    },
    {
      href: "/platform/broadcasts",
      label: "Broadcasts",
      icon: Radio,
    },
    {
      href: "/platform/catalog",
      label: "Master Catalog",
      icon: Layers,
    },
    {
      href: "/platform/audit",
      label: "Audit",
      icon: ScrollText,
    },
  ];

  return (
    <nav className="hidden md:flex items-center gap-1.5 pl-4 border-l border-[#E4E4E7]">
      {navItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              isActive
                ? "bg-[#2A5CAA] text-white shadow-xs"
                : "text-[#6B7280] hover:text-[#1C1C1E] hover:bg-white"
            }`}
          >
            <Icon
              className={`w-3.5 h-3.5 ${
                isActive ? "text-white" : "text-[#6B7280]"
              }`}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
