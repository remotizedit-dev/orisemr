"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Printer, Trash2 } from "lucide-react";
import { formatDhakaDate } from "@/lib/utils";
import { PrescriptionViewModal } from "@/components/prescription/PrescriptionViewModal";
import { DeletePrescriptionModal } from "@/components/prescription/DeletePrescriptionModal";

interface PrescriptionItem {
  id: string;
  rxCode: string;
  diagnosis: string | null;
  createdAt: Date;
  doctorName: string;
}

interface PatientPrescriptionsListProps {
  prescriptions: PrescriptionItem[];
  patientName?: string;
  canEdit?: boolean;
  isAdmin?: boolean;
}

export function PatientPrescriptionsList({
  prescriptions,
  patientName = "Patient",
  canEdit = false,
  isAdmin = false,
}: PatientPrescriptionsListProps) {
  const router = useRouter();
  const [viewingRxId, setViewingRxId] = useState<string | null>(null);
  const [deletingRx, setDeletingRx] = useState<PrescriptionItem | null>(null);

  if (prescriptions.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-[#6B7280]">
        No prescriptions recorded yet.
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-[#E4E4E7]">
        {prescriptions.map((rx) => (
          <div
            key={rx.id}
            className="p-4 hover:bg-white/80 transition flex items-center justify-between text-xs group"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[#2A5CAA]">
                  {rx.rxCode}
                </span>
                <span className="text-[#6B7280]">
                  • {formatDhakaDate(rx.createdAt, "dd MMM yyyy")}
                </span>
              </div>
              <p className="mt-1 text-[#1C1C1E] font-medium">
                Diagnosis: {rx.diagnosis || "Routine Dental Care"}
              </p>
              <span className="text-[11px] text-[#6B7280]">
                Prescribed by {rx.doctorName}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewingRxId(rx.id)}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#E4E4E7] text-[#1C1C1E] hover:bg-[#F4F4F5] font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Eye className="w-3.5 h-3.5 text-[#2A5CAA]" />
                <span>View</span>
              </button>

              <Link
                href={`/print/prescription/${rx.id}`}
                prefetch={false}
                target="_blank"
                className="px-3 py-1.5 rounded-lg bg-[#EBF2FC] hover:bg-[#2A5CAA] text-[#2A5CAA] hover:text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </Link>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setDeletingRx(rx)}
                  className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
                  title="Delete prescription (Admin only)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Prescription View & Quick Edit Modal */}
      <PrescriptionViewModal
        prescriptionId={viewingRxId}
        isOpen={!!viewingRxId}
        onClose={() => setViewingRxId(null)}
        onUpdated={() => router.refresh()}
        canEdit={canEdit}
        isAdmin={isAdmin}
      />

      {deletingRx && (
        <DeletePrescriptionModal
          isOpen={!!deletingRx}
          onClose={() => setDeletingRx(null)}
          prescriptionId={deletingRx.id}
          rxCode={deletingRx.rxCode}
          patientName={patientName}
          doctorName={deletingRx.doctorName}
          onDeleted={() => {
            setDeletingRx(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
