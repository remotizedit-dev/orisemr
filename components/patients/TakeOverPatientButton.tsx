"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { reassignPatientDoctorAction } from "@/app/(tenant)/app/patients/actions";

interface TakeOverPatientButtonProps {
  patientId: string;
  patientName: string;
  targetDoctorId: string;
  targetDoctorName: string;
}

export function TakeOverPatientButton({
  patientId,
  patientName,
  targetDoctorId,
  targetDoctorName,
}: TakeOverPatientButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleTakeOver = async () => {
    setIsLoading(true);
    try {
      await reassignPatientDoctorAction(
        patientId,
        targetDoctorId,
        `Attending doctor taken over by Dr. ${targetDoctorName}`
      );
      toast.success(
        `Dr. ${targetDoctorName} is now the attending dentist for ${patientName}!`
      );
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to take over patient");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleTakeOver}
      disabled={isLoading}
      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition disabled:opacity-50 shrink-0 cursor-pointer"
      title="Reassign today's queue, visits, and patient record to your chamber"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Taking Over...</span>
        </>
      ) : (
        <>
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Take Over Patient</span>
        </>
      )}
    </button>
  );
}
