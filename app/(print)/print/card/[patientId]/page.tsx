import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { BarcodeSvg } from "@/components/barcode/BarcodeSvg";
import { AutoPrintTrigger } from "@/components/print/AutoPrintTrigger";

export default async function PrintCardPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;

  const [patient] = await db
    .select()
    .from(schema.patients)
    .where(eq(schema.patients.id, patientId))
    .limit(1);

  if (!patient) {
    notFound();
  }

  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, patient.tenantId))
    .limit(1);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <AutoPrintTrigger patientId={patient.id} />

      {/* CR80 Card Dimensions: 85.6mm x 54mm (approx 324px x 204px at 96dpi, or exact in print) */}
      <div className="w-[325px] h-[204px] bg-white border border-gray-300 rounded-xl p-4 shadow-lg flex flex-col justify-between text-black select-none print:shadow-none print:border-black">
        {/* Card Header */}
        <div className="border-b border-gray-200 pb-2 flex items-center justify-between">
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-[#1C1C1E]">
              {tenant.name}
            </h1>
            <span className="text-[10px] text-gray-500 block">
              Patient Identification Card
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase font-bold text-[#2A5CAA] bg-[#E8EEF7] px-1.5 py-0.5 rounded">
            {tenant.shortCode}
          </span>
        </div>

        {/* Patient Name & Details */}
        <div className="py-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider block">
            Patient Name
          </span>
          <h2 className="font-bold text-sm text-[#1C1C1E] truncate">
            {patient.name}
          </h2>
          <span className="text-[11px] text-gray-700">
            Phone: {patient.phone}
          </span>
        </div>

        {/* Barcode Footer */}
        <div className="pt-2 border-t border-gray-200 flex flex-col items-center">
          <BarcodeSvg
            value={patient.cardNumber}
            width={1.4}
            height={28}
            fontSize={10}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
