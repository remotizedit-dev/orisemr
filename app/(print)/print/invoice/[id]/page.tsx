import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { BarcodeSvg } from "@/components/barcode/BarcodeSvg";
import { AutoPrintTrigger } from "@/components/print/AutoPrintTrigger";
import { formatBdt, formatDhakaDate } from "@/lib/utils";
import { getFileUrl } from "@/lib/s3";

export default async function PrintInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [invoice] = await db
    .select()
    .from(schema.invoices)
    .where(eq(schema.invoices.id, id))
    .limit(1);

  if (!invoice) {
    notFound();
  }

  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, invoice.tenantId))
    .limit(1);

  const [patient] = await db
    .select()
    .from(schema.patients)
    .where(eq(schema.patients.id, invoice.patientId))
    .limit(1);

  const items = await db
    .select()
    .from(schema.invoiceItems)
    .where(eq(schema.invoiceItems.invoiceId, invoice.id))
    .orderBy(schema.invoiceItems.sortOrder);

  const payments = await db
    .select({
      id: schema.payments.id,
      amountBdt: schema.payments.amountBdt,
      method: schema.payments.method,
      transactionRef: schema.payments.transactionRef,
      paidAt: schema.payments.paidAt,
      receivedByName: schema.users.name,
    })
    .from(schema.payments)
    .leftJoin(
      schema.users,
      eq(schema.payments.receivedBy, schema.users.id)
    )
    .where(eq(schema.payments.invoiceId, invoice.id));

  const dueBalance = invoice.totalBdt - invoice.paidBdt;

  return (
    <div className="bg-white text-black min-h-screen p-8 max-w-3xl mx-auto font-sans text-xs">
      <AutoPrintTrigger patientId={patient?.id} />

      {/* Header */}
      <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-start">
        <div className="flex items-center gap-3.5">
          {tenant.logoKey && (
            <img
              src={getFileUrl(tenant.logoKey)}
              alt={tenant.name}
              className="w-14 h-14 object-contain shrink-0"
            />
          )}
          <div>
            <h1 className="text-2xl font-black tracking-tight">{tenant.name}</h1>
            <p className="text-gray-700">{tenant.address}</p>
            <p className="text-gray-700">Phone: {tenant.phone || "—"}</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-sm font-bold uppercase tracking-wider block">
            Money Receipt / Invoice
          </span>
          <BarcodeSvg
            value={invoice.invoiceCode || "DRAFT-INV"}
            width={1.2}
            height={26}
            fontSize={10}
            className="inline-block mt-1"
          />
        </div>
      </div>

      {/* Patient & Invoice Metadata */}
      <div className="border border-black p-3 rounded-sm mb-6 grid grid-cols-2 gap-4 bg-gray-50/50">
        <div>
          <span className="font-bold text-gray-500 block uppercase text-[10px]">
            Billed To:
          </span>
          <div className="font-bold text-sm text-black">{patient?.name}</div>
          <div>Card No: <span className="font-mono font-bold">{patient?.cardNumber}</span></div>
          <div>Phone: {patient?.phone}</div>
        </div>

        <div className="text-right space-y-0.5">
          <div>
            <span className="font-bold">Invoice Date:</span>{" "}
            {formatDhakaDate(invoice.createdAt, "dd MMM yyyy")}
          </div>
          <div>
            <span className="font-bold">Status:</span>{" "}
            <span className="uppercase font-bold">{invoice.status}</span>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <table className="w-full text-left border-collapse mb-6">
        <thead>
          <tr className="border-b-2 border-black font-bold">
            <th className="py-2">Item / Service</th>
            <th className="py-2">Teeth</th>
            <th className="py-2 text-center">Qty</th>
            <th className="py-2 text-right">Unit Price</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {items.map((it) => (
            <tr key={it.id}>
              <td className="py-2 font-medium">{it.description}</td>
              <td className="py-2 font-mono">{it.toothCodes?.join(", ") || "—"}</td>
              <td className="py-2 text-center">{it.quantity}</td>
              <td className="py-2 text-right">{formatBdt(it.unitPriceBdt)}</td>
              <td className="py-2 text-right font-bold">{formatBdt(it.totalBdt)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Financial Calculations */}
      <div className="flex justify-end mb-8">
        <div className="w-64 space-y-1.5 border-t border-black pt-2">
          <div className="flex justify-between">
            <span className="text-gray-700">Subtotal:</span>
            <span>{formatBdt(invoice.subtotalBdt)}</span>
          </div>
          {invoice.discountBdt > 0 && (
            <div className="flex justify-between text-gray-700">
              <span>Discount:</span>
              <span>-{formatBdt(invoice.discountBdt)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm border-t border-black pt-1">
            <span>Total Payable:</span>
            <span>{formatBdt(invoice.totalBdt)}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Paid Amount:</span>
            <span>{formatBdt(invoice.paidBdt)}</span>
          </div>
          <div className="flex justify-between font-extrabold text-sm border-t-2 border-black pt-1">
            <span>Balance Due:</span>
            <span>{formatBdt(dueBalance)}</span>
          </div>
        </div>
      </div>

      {/* Payments History */}
      {payments.length > 0 && (
        <div className="mb-8">
          <span className="font-bold uppercase tracking-wider block text-[10px] text-gray-600 mb-1">
            Payment Receipts Received:
          </span>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-300 text-gray-600 font-semibold text-[10px] text-left">
                <th className="py-1">Date</th>
                <th className="py-1">Method</th>
                <th className="py-1">Transaction Ref</th>
                <th className="py-1">Received By</th>
                <th className="py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="py-1">{formatDhakaDate(p.paidAt, "dd MMM yyyy, hh:mm a")}</td>
                  <td className="py-1 uppercase font-semibold">{p.method}</td>
                  <td className="py-1 font-mono">{p.transactionRef || "—"}</td>
                  <td className="py-1">{p.receivedByName || "Staff"}</td>
                  <td className="py-1 text-right font-bold">{formatBdt(p.amountBdt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="pt-8 border-t border-gray-300 text-center text-gray-500 text-[10px]">
        Thank you for choosing {tenant.name}. Generated with Oris EMR.
      </div>
    </div>
  );
}
