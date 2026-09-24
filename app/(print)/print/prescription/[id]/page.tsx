import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { BarcodeSvg } from "@/components/barcode/BarcodeSvg";
import { AutoPrintTrigger } from "@/components/print/AutoPrintTrigger";
import { formatDhakaDate } from "@/lib/utils";

export default async function PrintPrescriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [prescription] = await db
    .select()
    .from(schema.prescriptions)
    .where(eq(schema.prescriptions.id, id))
    .limit(1);

  if (!prescription) {
    notFound();
  }

  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, prescription.tenantId))
    .limit(1);

  const [patient] = await db
    .select()
    .from(schema.patients)
    .where(eq(schema.patients.id, prescription.patientId))
    .limit(1);

  const [doctor] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, prescription.doctorId))
    .limit(1);

  const items = await db
    .select()
    .from(schema.prescriptionItems)
    .where(eq(schema.prescriptionItems.prescriptionId, prescription.id))
    .orderBy(schema.prescriptionItems.sortOrder);

  const adviceList = await db
    .select()
    .from(schema.prescriptionAdvice)
    .where(eq(schema.prescriptionAdvice.prescriptionId, prescription.id))
    .orderBy(schema.prescriptionAdvice.sortOrder);

  return (
    <div className="bg-white text-black min-h-screen p-8 max-w-4xl mx-auto font-sans leading-normal">
      <AutoPrintTrigger patientId={patient?.id} />

      {/* Clinic Header / Letterhead */}
      {tenant.rxPrintLetterhead && (
        <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black tracking-tight">{tenant.name}</h1>
            <p className="text-xs text-gray-700">{tenant.address}</p>
            <p className="text-xs text-gray-700">Phone: {tenant.phone || "—"}</p>
          </div>
          <div className="text-right">
            <h2 className="text-base font-bold">
              {doctor?.doctorTitle} {doctor?.name}
            </h2>
            <p className="text-xs">{doctor?.doctorDegrees}</p>
            <p className="text-xs">{doctor?.doctorSpecialty}</p>
            <p className="text-xs font-mono font-semibold">
              Reg No: {doctor?.doctorRegNo || "BMDC Reg"}
            </p>
          </div>
        </div>
      )}

      {/* Patient Information Bar */}
      <div className="border border-black p-3 rounded-sm mb-6 flex items-center justify-between text-xs bg-gray-50/50">
        <div className="space-y-0.5">
          <div>
            <span className="font-bold">Patient Name:</span> {patient?.name}
          </div>
          <div>
            <span className="font-bold">Age/Gender:</span>{" "}
            {patient?.approxAge ? `${patient.approxAge} yrs` : "—"} / {patient?.gender}
          </div>
        </div>

        <div className="space-y-0.5">
          <div>
            <span className="font-bold">Card No:</span>{" "}
            <span className="font-mono font-bold">{patient?.cardNumber}</span>
          </div>
          <div>
            <span className="font-bold">Date:</span>{" "}
            {formatDhakaDate(prescription.createdAt, "dd MMM yyyy")}
          </div>
        </div>

        <div className="text-right">
          <BarcodeSvg
            value={prescription.rxCode}
            width={1.2}
            height={28}
            fontSize={10}
            className="inline-block"
          />
        </div>
      </div>

      {/* Clinical Notes & Rx Layout (Split) */}
      <div className="grid grid-cols-12 gap-6 min-h-[500px]">
        {/* Left Column (4 cols): Clinical Findings */}
        <div className="col-span-4 border-r border-gray-300 pr-4 space-y-4 text-xs">
          {prescription.chiefComplaint && (
            <div>
              <span className="font-bold uppercase tracking-wider block text-[10px] text-gray-500">
                Chief Complaint
              </span>
              <p className="mt-0.5">{prescription.chiefComplaint}</p>
            </div>
          )}

          {prescription.examination && (
            <div>
              <span className="font-bold uppercase tracking-wider block text-[10px] text-gray-500">
                On Examination
              </span>
              <p className="mt-0.5">{prescription.examination}</p>
            </div>
          )}

          {prescription.diagnosis && (
            <div>
              <span className="font-bold uppercase tracking-wider block text-[10px] text-gray-500">
                Diagnosis
              </span>
              <p className="mt-0.5 font-semibold">{prescription.diagnosis}</p>
            </div>
          )}

          {prescription.toothCodes && prescription.toothCodes.length > 0 && (
            <div>
              <span className="font-bold uppercase tracking-wider block text-[10px] text-gray-500">
                Teeth (FDI)
              </span>
              <p className="mt-0.5 font-mono font-bold">
                {prescription.toothCodes.join(", ")}
              </p>
            </div>
          )}

          {prescription.investigations && (
            <div>
              <span className="font-bold uppercase tracking-wider block text-[10px] text-gray-500">
                Investigations Advised
              </span>
              <p className="mt-0.5">{prescription.investigations}</p>
            </div>
          )}
        </div>

        {/* Right Column (8 cols): Prescribed Medicines & Instructions */}
        <div className="col-span-8 space-y-6">
          <div className="text-lg font-serif italic font-bold">℞</div>

          {/* Medicines List */}
          <div className="space-y-4 text-sm">
            {items.map((item, idx) => {
              const instructionParts = [
                item.dosageTextBn,
                item.mealTimingTextBn,
                item.durationTextBn,
              ].filter(Boolean);

              return (
                <div key={item.id} className="space-y-1">
                  <div className="font-bold text-black">
                    {idx + 1}. {item.medicineLineSnapshot}
                  </div>
                  {instructionParts.length > 0 && (
                    <div className="pl-5 text-gray-900 font-medium" lang="bn">
                      {instructionParts.join(" — ")}
                    </div>
                  )}
                  {item.customInstruction && (
                    <div className="pl-5 text-xs text-gray-700 italic">
                      {item.customInstruction}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Advice Bullets */}
          {adviceList.length > 0 && (
            <div className="pt-6 border-t border-gray-200 space-y-2">
              <span className="font-bold text-xs uppercase tracking-wider block" lang="bn">
                উপদেশ (Advice):
              </span>
              <ul className="list-disc list-inside text-xs space-y-1" lang="bn">
                {adviceList.map((adv) => (
                  <li key={adv.id}>{adv.textBn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Visit Date */}
          {prescription.nextVisitDate && (
            <div className="pt-4 text-xs font-semibold">
              পরবর্তী সাক্ষাৎ (Next Follow-up):{" "}
              {formatDhakaDate(prescription.nextVisitDate, "dd MMM yyyy")}
            </div>
          )}
        </div>
      </div>

      {/* Doctor Signature Block */}
      <div className="mt-16 pt-4 border-t border-gray-300 flex justify-between items-end text-xs">
        <div className="text-[10px] text-gray-500 font-mono">
          Generated via Oris EMR • {prescription.rxCode}
        </div>
        <div className="text-right">
          <div className="w-40 border-b border-black mb-1" />
          <span className="font-bold block">
            {doctor?.doctorTitle} {doctor?.name}
          </span>
          <span className="text-[11px] block text-gray-600">
            {doctor?.doctorRegNo || "BMDC Registration"}
          </span>
        </div>
      </div>
    </div>
  );
}
