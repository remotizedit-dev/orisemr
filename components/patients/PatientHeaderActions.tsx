"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Calendar,
  CreditCard,
  Printer,
  Pencil,
  Trash2,
} from "lucide-react";
import { EditPatientModal, type EditablePatientData } from "./EditPatientModal";
import { DeletePatientModal } from "./DeletePatientModal";

interface PatientHeaderActionsProps {
  patient: EditablePatientData;
  canPrescribe: boolean;
}

export function PatientHeaderActions({
  patient,
  canPrescribe,
}: PatientHeaderActionsProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {canPrescribe && (
          <Link
            href={`/app/prescriptions/new?patientId=${patient.id}`}
            className="px-3.5 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>New Prescription</span>
          </Link>
        )}

        <Link
          href={`/app/appointments/new?patientId=${patient.id}`}
          className="px-3 py-2 rounded-xl bg-white border border-[#E4E4E7] text-[#1C1C1E] hover:bg-[#F4F4F5] font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition"
        >
          <Calendar className="w-3.5 h-3.5 text-[#2A5CAA]" />
          <span>Book Visit</span>
        </Link>

        <Link
          href={`/app/billing/new?patientId=${patient.id}`}
          className="px-3 py-2 rounded-xl bg-white border border-[#E4E4E7] text-[#1C1C1E] hover:bg-[#F4F4F5] font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition"
        >
          <CreditCard className="w-3.5 h-3.5 text-[#FF9F0A]" />
          <span>New Invoice</span>
        </Link>

        <Link
          href={`/print/card/${patient.id}`}
          target="_blank"
          className="px-3 py-2 rounded-xl bg-white border border-[#E4E4E7] text-[#1C1C1E] hover:bg-[#F4F4F5] font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition"
        >
          <Printer className="w-3.5 h-3.5 text-[#6B7280]" />
          <span>Print Card</span>
        </Link>

        {/* Edit Patient Button */}
        <button
          type="button"
          onClick={() => setIsEditOpen(true)}
          className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E4E4E7] text-[#2A5CAA] hover:bg-[#E8EEF7] font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          title="Edit patient demographic and medical details"
        >
          <Pencil className="w-3.5 h-3.5 text-[#2A5CAA]" />
          <span>Edit Patient</span>
        </button>

        {/* Delete Patient Button */}
        <button
          type="button"
          onClick={() => setIsDeleteOpen(true)}
          className="px-2.5 py-2 rounded-xl bg-white border border-[#E4E4E7] text-red-600 hover:bg-red-50 hover:border-red-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          title="Delete/archive this patient record"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
          <span>Delete</span>
        </button>
      </div>

      {/* Edit Patient Modal */}
      <EditPatientModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        patientId={patient.id}
        initialData={patient}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {/* Delete Patient Modal */}
      <DeletePatientModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        patientId={patient.id}
        patientName={patient.name}
        cardNumber={patient.cardNumber}
        onDeleted={() => {
          router.push("/app/patients");
        }}
      />
    </>
  );
}
