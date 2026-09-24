"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  CreditCard,
  User,
  Search,
  Loader2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { formatBdt } from "@/lib/utils";
import { createInvoiceAction } from "@/app/(tenant)/app/billing/actions";
import { searchPatientsForBookingAction } from "@/app/(tenant)/app/appointments/actions";

interface ServiceOption {
  id: string;
  name: string;
  priceBdt: number;
}

interface Props {
  services: ServiceOption[];
  preselectedPatient?: {
    id: string;
    name: string;
    cardNumber: string;
    phone: string;
  } | null;
  appointmentId?: string;
}

interface InvoiceLine {
  id: string;
  serviceId?: string;
  description: string;
  toothCodes: string[];
  quantity: number;
  unitPriceBdt: number;
}

export default function NewInvoiceClient({
  services,
  preselectedPatient,
  appointmentId,
}: Props) {
  const router = useRouter();

  // Patient state
  const [patientQuery, setPatientQuery] = useState(preselectedPatient?.name || "");
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(preselectedPatient || null);

  // Line items state
  const [items, setItems] = useState<InvoiceLine[]>([
    {
      id: "line-1",
      description: "",
      toothCodes: [],
      quantity: 1,
      unitPriceBdt: 0,
    },
  ]);

  // Discount
  const [discountBdt, setDiscountBdt] = useState<number>(0);

  // Advance Payment
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [advanceMethod, setAdvanceMethod] = useState<"cash" | "bkash" | "nagad" | "card">("cash");
  const [advanceRef, setAdvanceRef] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Subtotal
  const subtotalBdt = items.reduce(
    (acc, it) => acc + (it.quantity || 0) * (it.unitPriceBdt || 0),
    0
  );
  const totalBdt = Math.max(0, subtotalBdt - (discountBdt || 0));

  async function handlePatientSearch(q: string) {
    setPatientQuery(q);
    if (!q || q.trim().length < 1) {
      setPatientResults([]);
      return;
    }

    setIsSearchingPatient(true);
    try {
      const results = await searchPatientsForBookingAction(q);
      setPatientResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingPatient(false);
    }
  }

  function addLineItem() {
    setItems((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}`,
        description: "",
        toothCodes: [],
        quantity: 1,
        unitPriceBdt: 0,
      },
    ]);
  }

  function removeLineItem(index: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  function updateLine(index: number, patch: Partial<InvoiceLine>) {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  }

  function handleSelectCatalogService(index: number, serviceId: string) {
    const s = services.find((srv) => srv.id === serviceId);
    if (s) {
      updateLine(index, {
        serviceId: s.id,
        description: s.name,
        unitPriceBdt: s.priceBdt,
      });
    }
  }

  async function handleSubmit() {
    if (!selectedPatient) {
      toast.error("Please select a patient.");
      return;
    }

    const validItems = items.filter(
      (it) => it.description.trim().length > 0 && it.quantity > 0
    );

    if (validItems.length === 0) {
      toast.error("Please add at least one line item with a description.");
      return;
    }

    if (advanceAmount > totalBdt) {
      toast.error(`Advance payment cannot exceed invoice total (৳${totalBdt})`);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createInvoiceAction({
        patientId: selectedPatient.id,
        appointmentId,
        discountBdt,
        items: validItems.map((v) => ({
          serviceId: v.serviceId,
          description: v.description,
          toothCodes: v.toothCodes,
          quantity: v.quantity,
          unitPriceBdt: v.unitPriceBdt,
        })),
        advancePayment:
          advanceAmount > 0
            ? {
                amountBdt: advanceAmount,
                method: advanceMethod,
                transactionRef: advanceRef,
              }
            : undefined,
      });

      toast.success("Invoice generated successfully!");
      router.push(`/print/invoice/${res.invoiceId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/app/billing"
            className="p-2 rounded-xl bg-white border border-[#E4E4E7] text-[#6B7280] hover:text-[#1C1C1E] transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-[#1C1C1E] tracking-tight">
              Create New Invoice
            </h1>
            <p className="text-xs text-[#6B7280]">
              Itemized billing with procedure catalog lookup, discounts &amp; immediate settlement.
            </p>
          </div>
        </div>
      </div>

      {/* Select Patient */}
      <div className="glass-panel p-5 rounded-2xl border border-[#E4E4E7] space-y-3">
        <span className="text-xs font-bold text-[#1C1C1E] uppercase tracking-wider flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-[#2A5CAA]" />
          <span>Patient Information</span>
        </span>

        {selectedPatient ? (
          <div className="p-4 rounded-2xl bg-[#EBF2FC] border border-[#2A5CAA]/20 flex items-center justify-between shadow-2xs">
            <div>
              <span className="font-black text-base text-[#1C1C1E] block">
                {selectedPatient.name}
              </span>
              <div className="flex items-center gap-2 text-sm text-[#4B5563] mt-0.5">
                <span className="font-mono font-bold">{selectedPatient.cardNumber}</span>
                {selectedPatient.phone && <span>• {selectedPatient.phone}</span>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPatient(null);
                setPatientQuery("");
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-[#FF453A] hover:bg-white rounded-xl transition cursor-pointer border border-rose-200"
            >
              Change Patient
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-[#A1A1AA]" />
            <input
              type="text"
              placeholder="Search patient by name, phone, or card number..."
              value={patientQuery}
              onChange={(e) => handlePatientSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 text-sm sm:text-base bg-white border border-[#E4E4E7] rounded-2xl outline-none focus:border-[#2A5CAA] shadow-2xs font-medium"
            />
            {isSearchingPatient && (
              <Loader2 className="w-4 h-4 animate-spin absolute right-3.5 top-3.5 text-[#6B7280]" />
            )}

            {patientResults.length > 0 && (
              <div className="absolute left-0 right-0 top-14 bg-white rounded-2xl shadow-xl border border-[#E4E4E7] z-20 max-h-56 overflow-y-auto divide-y divide-[#E4E4E7]">
                {patientResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPatient(p);
                      setPatientQuery(p.name);
                      setPatientResults([]);
                    }}
                    className="w-full p-3 text-left hover:bg-[#F4F4F5] transition flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-sm text-[#1C1C1E] block">
                        {p.name}
                      </span>
                      <span className="text-xs text-[#6B7280]">{p.phone}</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#2A5CAA] bg-[#EBF2FC] px-2.5 py-1 rounded-lg">
                      {p.cardNumber}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Line Items */}
      <div className="glass-panel p-5 rounded-3xl border border-[#E4E4E7] space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-[#E4E4E7]">
          <span className="text-sm font-extrabold text-[#1C1C1E] uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#2A5CAA]" />
            <span>Billable Items &amp; Procedures</span>
          </span>
          <button
            type="button"
            onClick={addLineItem}
            className="text-xs font-bold text-[#2A5CAA] hover:underline flex items-center gap-1.5 cursor-pointer bg-[#EBF2FC] px-3 py-1.5 rounded-xl transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Row</span>
          </button>
        </div>

        <div className="space-y-3">
          {items.map((line, idx) => (
            <div
              key={line.id}
              className="p-3.5 bg-white rounded-2xl border border-[#E4E4E7] grid grid-cols-12 gap-3 items-center shadow-2xs"
            >
              {/* Preset selector */}
              <div className="col-span-12 md:col-span-5 space-y-1.5">
                <select
                  onChange={(e) =>
                    handleSelectCatalogService(idx, e.target.value)
                  }
                  defaultValue=""
                  className="w-full px-3 py-2 text-sm border border-[#E4E4E7] rounded-xl outline-none text-[#4B5563] bg-[#F4F4F5] font-medium"
                >
                  <option value="" disabled>
                    -- Pick from Procedure Catalog --
                  </option>
                  {services.map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      {srv.name} ({formatBdt(srv.priceBdt)})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Procedure or item description..."
                  value={line.description}
                  onChange={(e) =>
                    updateLine(idx, { description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                />
              </div>

              {/* Tooth code */}
              <div className="col-span-4 md:col-span-2">
                <input
                  type="text"
                  placeholder="Tooth (e.g. 16, 21)"
                  value={line.toothCodes.join(", ")}
                  onChange={(e) =>
                    updateLine(idx, {
                      toothCodes: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#E4E4E7] rounded-xl outline-none font-mono"
                />
              </div>

              {/* Quantity */}
              <div className="col-span-3 md:col-span-2">
                <input
                  type="number"
                  min={1}
                  value={line.quantity || 1}
                  onChange={(e) =>
                    updateLine(idx, { quantity: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#E4E4E7] rounded-xl outline-none text-center font-bold font-mono"
                />
              </div>

              {/* Unit Price */}
              <div className="col-span-3 md:col-span-2">
                <input
                  type="number"
                  min={0}
                  placeholder="Price (৳)"
                  value={line.unitPriceBdt || ""}
                  onChange={(e) =>
                    updateLine(idx, { unitPriceBdt: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#E4E4E7] rounded-xl outline-none font-black font-mono"
                />
              </div>

              {/* Delete button */}
              <div className="col-span-2 md:col-span-1 text-right">
                <button
                  type="button"
                  onClick={() => removeLineItem(idx)}
                  disabled={items.length <= 1}
                  className="p-2 text-[#6B7280] hover:text-[#FF453A] disabled:opacity-30 transition rounded-lg hover:bg-rose-50 cursor-pointer"
                  title="Remove row"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calculations & Settlement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Advance Payment Collection */}
        <div className="glass-panel p-5 rounded-3xl border border-[#E4E4E7] space-y-3.5 shadow-2xs">
          <span className="text-sm font-extrabold text-[#1C1C1E] uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#2A5CAA]" />
            <span>Immediate Settlement (Optional)</span>
          </span>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-[#4B5563] block mb-1">
                Advance Paid Now (৳)
              </label>
              <input
                type="number"
                min={0}
                max={totalBdt}
                value={advanceAmount || ""}
                onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                placeholder="0"
                className="w-full px-3.5 py-2.5 text-base font-black border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] bg-white font-mono"
              />
            </div>

            {advanceAmount > 0 && (
              <>
                <div>
                  <label className="text-xs font-bold text-[#4B5563] block mb-1">
                    Payment Method
                  </label>
                  <select
                    value={advanceMethod}
                    onChange={(e) => setAdvanceMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-sm font-semibold border border-[#E4E4E7] rounded-xl outline-none bg-white"
                  >
                    <option value="cash">Cash</option>
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="card">Bank Card</option>
                  </select>
                </div>

                {advanceMethod !== "cash" && (
                  <div>
                    <label className="text-xs font-bold text-[#4B5563] block mb-1">
                      Transaction ID
                    </label>
                    <input
                      type="text"
                      value={advanceRef}
                      onChange={(e) => setAdvanceRef(e.target.value)}
                      placeholder="e.g. 8G7231KL"
                      className="w-full px-3.5 py-2.5 text-sm border border-[#E4E4E7] rounded-xl outline-none bg-white font-mono"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Totals Summary */}
        <div className="glass-panel p-5 rounded-3xl border border-[#E4E4E7] space-y-3 flex flex-col justify-between shadow-2xs">
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-[#4B5563]">
              <span>Subtotal:</span>
              <span className="font-bold text-[#1C1C1E]">
                {formatBdt(subtotalBdt)}
              </span>
            </div>

            <div className="flex justify-between items-center text-[#4B5563]">
              <span>Discount (৳):</span>
              <input
                type="number"
                min={0}
                value={discountBdt || ""}
                onChange={(e) => setDiscountBdt(Number(e.target.value))}
                placeholder="0"
                className="w-28 px-3 py-1.5 text-sm border border-[#E4E4E7] rounded-xl outline-none text-right font-bold font-mono"
              />
            </div>

            <div className="flex justify-between text-base font-extrabold text-[#1C1C1E] pt-3 border-t border-[#E4E4E7]">
              <span>Total Payable:</span>
              <span className="text-[#2A5CAA] text-xl font-black">
                {formatBdt(totalBdt)}
              </span>
            </div>

            {advanceAmount > 0 && (
              <div className="flex justify-between text-sm font-bold text-[#30D158]">
                <span>Paid Now:</span>
                <span>- {formatBdt(advanceAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-extrabold text-[#FF453A] pt-1.5 border-t border-[#E4E4E7]">
              <span>Remaining Due:</span>
              <span>{formatBdt(Math.max(0, totalBdt - advanceAmount))}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedPatient || subtotalBdt <= 0}
            className="w-full py-4 rounded-2xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white font-black text-sm sm:text-base shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5 stroke-[2.5]" />
            )}
            <span>Generate &amp; Print Invoice</span>
          </button>
        </div>
      </div>
    </div>
  );
}
