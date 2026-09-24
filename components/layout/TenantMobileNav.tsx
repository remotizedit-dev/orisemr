"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Calendar,
  CreditCard,
  FileText,
  Layers,
  LayoutDashboard,
  Settings,
  Users,
  Stethoscope,
  ExternalLink,
} from "lucide-react";
import SignOutButton from "@/components/auth/SignOutButton";

interface TenantMobileNavProps {
  userRole: string;
  userName: string;
  userEmail?: string;
  isDoctor?: boolean;
  tenantName: string;
  tenantShortCode: string;
  brandColor?: string;
  tenantSlug: string;
}

export function TenantMobileNav({
  userRole,
  userName,
  isDoctor,
  tenantName,
  tenantShortCode,
  brandColor = "#2A5CAA",
  tenantSlug,
}: TenantMobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer whenever route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

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
    <>
      {/* Mobile Hamburger Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="p-2 -ml-1 text-[#4B5563] hover:text-[#1C1C1E] hover:bg-[#F4F4F5] rounded-xl transition md:hidden cursor-pointer flex items-center justify-center shrink-0"
        aria-label="Open mobile navigation menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Slide-over Drawer Backdrop & Content */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-2xl z-50 flex flex-col justify-between animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div>
              <div className="p-4 border-b border-[#E4E4E7] flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm shrink-0"
                    style={{ backgroundColor: brandColor }}
                  >
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <span className="text-base font-extrabold text-[#1C1C1E] tracking-tight block truncate">
                      {tenantName}
                    </span>
                    <span className="font-mono text-xs uppercase font-bold text-[#2A5CAA] bg-[#E8EEF7] px-2 py-0.5 rounded-md inline-block mt-0.5">
                      {tenantShortCode}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-[#6B7280] hover:text-[#1C1C1E] hover:bg-[#F4F4F5] rounded-xl transition cursor-pointer"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="p-3.5 space-y-1">
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
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition ${
                        isActive
                          ? "bg-[#2A5CAA] text-white shadow-xs"
                          : "text-[#4B5563] hover:text-[#1C1C1E] hover:bg-[#F4F4F5]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
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
                        />
                      )}
                    </Link>
                  );
                })}

                {/* Public Booking Link */}
                <div className="pt-2 border-t border-[#E4E4E7] mt-3">
                  <Link
                    href={`/book/${tenantSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold text-[#2A5CAA] bg-[#E8EEF7] hover:bg-[#2A5CAA] hover:text-white transition"
                  >
                    <span>Public Booking Page</span>
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </nav>
            </div>

            {/* User Profile & Prominent Log Out */}
            <div className="p-4 border-t border-[#E4E4E7] bg-[#FAFAFA] space-y-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-[#EBF2FC] text-[#2A5CAA] font-bold text-sm flex items-center justify-center shrink-0 border border-[#2A5CAA]/20">
                  {userName ? userName.slice(0, 1).toUpperCase() : "U"}
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-[#1C1C1E] block truncate">
                    {userName}
                  </span>
                  <span className="text-xs text-[#4B5563] uppercase font-semibold block truncate">
                    {userRole === "TENANT_ADMIN" ? "Admin" : userRole}{" "}
                    {isDoctor && "• Dentist"}
                  </span>
                </div>
              </div>

              {/* Full Width High-Visibility Log Out Button */}
              <SignOutButton
                showText={true}
                text="Log Out"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#FEE2E2] hover:bg-[#DC2626] text-[#DC2626] hover:text-white border border-[#FCA5A5]/80 hover:border-[#DC2626] rounded-xl font-bold text-sm transition cursor-pointer shadow-xs active:scale-98"
                title="Log Out of EMR"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
