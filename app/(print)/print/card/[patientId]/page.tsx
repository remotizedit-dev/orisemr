import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { BarcodeSvg } from "@/components/barcode/BarcodeSvg";
import { AutoPrintTrigger } from "@/components/print/AutoPrintTrigger";
import { getFileUrl } from "@/lib/s3";
import { getSession } from "@/lib/session";
import { verifySignedPrintUrl } from "@/lib/signed-urls";
import { ExpiredLinkScreen } from "@/components/print/ExpiredLinkScreen";

interface Props {
  params: Promise<{ patientId: string }>;
  searchParams: Promise<{ expires?: string; sig?: string }>;
}

export default async function PrintCardPage({ params, searchParams }: Props) {
  const { patientId } = await params;
  const query = await searchParams;

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

  // Require clinic sign-in on /print pages or a valid expiring signed link for patient sharing
  const session = await getSession();
  const isAuthorizedStaff =
    session?.tenant &&
    session.tenant.id === patient.tenantId &&
    (session.user.role === "TENANT_ADMIN" ||
      session.user.role === "DOCTOR" ||
      session.user.role === "RECEPTIONIST" ||
      session.user.role === "SUPER_ADMIN");

  if (!isAuthorizedStaff) {
    const check = verifySignedPrintUrl(`/print/card/${patientId}`, query);
    if (!check.valid) {
      if (check.reason === "expired") {
        return <ExpiredLinkScreen clinicName={tenant?.name} phone={tenant?.phone} />;
      }
      redirect(`/login?callbackUrl=${encodeURIComponent(`/print/card/${patientId}`)}`);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <AutoPrintTrigger patientId={patient.id} />

      {/* CR80 Card Dimensions: 85.6mm x 54mm (approx 324px x 204px at 96dpi, or exact in print) */}
      <div className="w-[325px] h-[204px] bg-white border border-gray-300 rounded-xl p-4 shadow-lg flex flex-col justify-between text-black select-none print:shadow-none print:border-black">
        {/* Card Header */}
        <div className="border-b border-gray-200 pb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {tenant.logoKey && (
              <img
                src={getFileUrl(tenant.logoKey)}
                alt={tenant.name}
                className="w-8 h-8 object-contain shrink-0"
              />
            )}
            <div className="min-w-0">
              <h1 className="font-extrabold text-sm tracking-tight text-[#1C1C1E] truncate">
                {tenant.name}
              </h1>
              <span className="text-[10px] text-gray-500 block">
                Patient Identification Card
              </span>
            </div>
          </div>
          <span className="font-mono text-[10px] uppercase font-bold text-[#2A5CAA] bg-[#E8EEF7] px-1.5 py-0.5 rounded shrink-0">
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
