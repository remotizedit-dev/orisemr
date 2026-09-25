"use client";

import { useState, useEffect } from "react";
import { UserPlus, Calendar, Plus, Sparkles, X } from "lucide-react";
import { QuickRegisterPatientModal } from "@/components/patients/QuickRegisterPatientModal";
import { QuickAppointmentModal } from "@/components/appointments/QuickAppointmentModal";
import { toast } from "sonner";

export function GlobalActionDock() {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isAppointmentOpen, setIsAppointmentOpen] = useState(false);
  const [activePatient, setActivePatient] = useState<{
    id: string;
    name: string;
    phone: string;
    cardNumber: string;
    email?: string | null;
  } | null>(null);

  // Global Keyboard Shortcuts (Alt+P for Patient, Alt+A for Appointment)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is actively typing in an input or textarea
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (e.altKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        setIsRegisterOpen(true);
      } else if (e.altKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        setIsAppointmentOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handlePatientRegistered = (newPatient: {
    id: string;
    name: string;
    phone: string;
    cardNumber: string;
    email?: string | null;
  }) => {
    setActivePatient(newPatient);
    setIsRegisterOpen(false);

    // Offer immediate appointment booking for this newly registered patient
    toast.success(`Patient ${newPatient.name} registered!`, {
      action: {
        label: "Book Appointment Now",
        onClick: () => {
          setIsAppointmentOpen(true);
        },
      },
    });
  };

  return (
    <>
      {/* Floating Action Docker Bar */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 transition-all duration-300">
        <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-2xl rounded-full ring-1 ring-black/10 hover:shadow-3xl transition-all">
          {/* 1. New Patient Button */}
          <button
            type="button"
            onClick={() => {
              setActivePatient(null);
              setIsRegisterOpen(true);
            }}
            className="px-3.5 sm:px-4 py-2 rounded-full text-xs font-black text-white bg-gradient-to-r from-[#2A5CAA] to-[#1E4282] hover:from-[#1E4282] hover:to-[#173366] shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 group"
            title="Register a new patient instantly (Shortcut: Alt+P)"
          >
            <UserPlus className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span className="whitespace-nowrap">New Patient</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 rounded text-white/90">
              Alt+P
            </kbd>
          </button>

          {/* Divider */}
          <div className="w-[1px] h-5 bg-[#E4E4E7] dark:bg-white/20 mx-0.5" />

          {/* 2. New Appointment Button */}
          <button
            type="button"
            onClick={() => {
              setActivePatient(null);
              setIsAppointmentOpen(true);
            }}
            className="px-3.5 sm:px-4 py-2 rounded-full text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 group"
            title="Book an appointment instantly (Shortcut: Alt+A)"
          >
            <Calendar className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span className="whitespace-nowrap">New Appointment</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 rounded text-white/90">
              Alt+A
            </kbd>
          </button>
        </div>
      </div>

      {/* Quick Register Patient Modal */}
      <QuickRegisterPatientModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={handlePatientRegistered}
      />

      {/* Quick Appointment Booking Modal */}
      <QuickAppointmentModal
        isOpen={isAppointmentOpen}
        onClose={() => {
          setIsAppointmentOpen(false);
          setActivePatient(null);
        }}
        preselectedPatient={activePatient}
      />
    </>
  );
}
