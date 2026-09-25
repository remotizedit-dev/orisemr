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
  AlertTriangle,
  Printer,
  Armchair,
  CheckCircle2,
  Clock,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatBdt } from "@/lib/utils";
import {
  createInvoiceAction,
  recordPaymentAction,
} from "@/app/(tenant)/app/billing/actions";
import { searchPatientsForBookingAction } from "@/app/(tenant)/app/appointments/actions";
import { QuickRegisterPatientModal } from "@/components/patients/QuickRegisterPatientModal";

export interface ServiceOption {
  id: string;
  name: string;
  priceBdt: number;
}

export interface InvoiceLine {
  id: string;
  serviceId?: string;
  description: string;
  toothCodes: string[];
  quantity: number;
  unitPriceBdt: number;
}

export interface UnpaidInvoice {
  id: string;
  invoiceCode: string;
  totalBdt: number;
  paidBdt: number;
  dueBdt: number;
  createdAt: string;
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
  initialItems?: InvoiceLine[];
  patientDues?: {
    totalDueBdt: number;
    unpaidInvoices: UnpaidInvoice[];
  };
  prescriptionInfo?: {
    rxCode: string;
    diagnosis?: string | null;
    toothCodes?: string[];
  } | null;
}

export default function NewInvoiceClient({
  services,
  preselectedPatient,
  appointmentId,
  initialItems,
  patientDues,
  prescriptionInfo,
}: Props) {
  const router = useRouter();

  // Patient state
  const [patientQuery, setPatientQuery] = useState(preselectedPatient?.name || "");
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(preselectedPatient || null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Line items state
  const [items, setItems] = useState<InvoiceLine[]>(
    initialItems && initialItems.length > 0
      ? initialItems
      : [
          {
            id: "line-1",
            description: "",
            toothCodes: [],
            quantity: 1,
            unitPriceBdt: 0,
          },
        ]
  );

  // Discount
  const [discountBdt, setDiscountBdt] = useState<number>(0);

  // Subtotal & Total
  const subtotalBdt = items.reduce(
    (acc, it) => acc + (it.quantity || 0) * (it.unitPriceBdt || 0),
    0
  );
  const totalBdt = Math.max(0, subtotalBdt - (discountBdt || 0));

  // Settlement Options: "full" | "due" | "partial"
  const [settlementMode, setSettlementMode] = useState<"full" | "due" | "partial">("full");
  const [customAdvance, setCustomAdvance] = useState<number>(0);
  const [advanceMethod, setAdvanceMethod] = useState<"cash" | "bkash" | "nagad" | "card">("cash");
  const [advanceRef, setAdvanceRef] = useState<string>("");

  const advanceAmount =
    settlementMode === "full"
      ? totalBdt
      : settlementMode === "due"
      ? 0
      : Math.min(totalBdt, Math.max(0, customAdvance));

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Modal
  const [savedInvoice, setSavedInvoice] = useState<{
    id: string;
    totalBdt: number;
    paidBdt: number;
    dueBdt: number;
  } | null>(null);

  // Settle Past Due Modal
  const [dueModalInvoice, setDueModalInvoice] = useState<UnpaidInvoice | null>(null);
  const [duePayAmount, setDuePayAmount] = useState<number>(0);
  const [duePayMethod, setDuePayMethod] = useState<"cash" | "bkash" | "nagad" | "card">("cash");
  const [duePayRef, setDuePayRef] = useState<string>("");
  const [isPayingDue, setIsPayingDue] = useState(false);

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

  function handleQuickAddCatalogService(srv: ServiceOption) {
    setItems((prev) => {
      // If only 1 empty line item exists, replace it
      if (prev.length === 1 && !prev[0].description) {
        return [
          {
            id: `line-${Date.now()}`,
            serviceId: srv.id,
            description: srv.name,
            toothCodes: [],
            quantity: 1,
            unitPriceBdt: srv.priceBdt,
          },
        ];
      }
      return [
        ...prev,
        {
          id: `line-${Date.now()}`,
          serviceId: srv.id,
          description: srv.name,
          toothCodes: [],
          quantity: 1,
          unitPriceBdt: srv.priceBdt,
        },
      ];
    });
    toast.success(`Added ${srv.name} to bill`);
  }

  async function handleSettlePastDue() {
    if (!dueModalInvoice || duePayAmount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    try {
      setIsPayingDue(true);
      await recordPaymentAction({
        invoiceId: dueModalInvoice.id,
        amountBdt: duePayAmount,
        method: duePayMethod,
        transactionRef: duePayRef,
      });

      toast.success(`Recorded payment of ${formatBdt(duePayAmount)} for ${dueModalInvoice.invoiceCode}`);
      setDueModalInvoice(null);
      setDuePayAmount(0);
      setDuePayRef("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to record due payment");
    } finally {
      setIsPayingDue(false);
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
      toast.error("Please add at least one billable item with a description.");
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
      setSavedInvoice({
        id: res.invoiceId,
        totalBdt,
        paidBdt: advanceAmount,
        dueBdt: Math.max(0, totalBdt - advanceAmount),
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Settle Past Due Modal */}
      {dueModalInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#E4E4E7] shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E7]">
              <div>
                <h3 className="text-lg font-black text-[#1C1C1E]">
                  Settle Previous Due
                </h3>
                <span className="text-xs text-[#6B7280]">
                  Invoice: <strong className="font-mono text-[#2A5CAA]">{dueModalInvoice.invoiceCode}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDueModalInvoice(null)}
                className="p-1 rounded-lg text-[#6B7280] hover:text-[#1C1C1E] hover:bg-[#F4F4F5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FFF7EB] border border-[#FF9F0A]/30 flex justify-between items-center text-sm">
              <span className="text-[#B45309] font-bold">Total Remaining Due:</span>
              <span className="font-black text-lg text-[#B45309]">
                {formatBdt(dueModalInvoice.dueBdt)}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#4B5563] block mb-1">
                  Payment Amount (৳)
                </label>
                <input
                  type="number"
                  min={1}
                  max={dueModalInvoice.dueBdt}
                  value={duePayAmount || ""}
                  onChange={(e) => setDuePayAmount(Number(e.target.value))}
                  placeholder={`Max ${dueModalInvoice.dueBdt}`}
                  className="w-full px-3.5 py-2.5 text-base font-black border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] bg-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => setDuePayAmount(dueModalInvoice.dueBdt)}
                  className="text-xs font-bold text-[#2A5CAA] hover:underline mt-1 inline-block"
                >
                  Pay full remaining due ({formatBdt(dueModalInvoice.dueBdt)})
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-[#4B5563] block mb-1">
                  Payment Method
                </label>
                <select
                  value={duePayMethod}
                  onChange={(e) => setDuePayMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 text-sm font-semibold border border-[#E4E4E7] rounded-xl outline-none bg-white"
                >
                  <option value="cash">Cash</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="card">Bank Card</option>
                </select>
              </div>

              {duePayMethod !== "cash" && (
                <div>
                  <label className="text-xs font-bold text-[#4B5563] block mb-1">
                    Transaction / TrxID
                  </label>
                  <input
                    type="text"
                    value={duePayRef}
                    onChange={(e) => setDuePayRef(e.target.value)}
                    placeholder="e.g. 9J283LA1"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#E4E4E7] rounded-xl outline-none bg-white font-mono"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E4E4E7]">
              <button
                type="button"
                onClick={() => setDueModalInvoice(null)}
                className="px-4 py-2.5 rounded-xl bg-[#F4F4F5] text-xs font-bold text-[#4B5563] hover:bg-[#E4E4E7]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSettlePastDue}
                disabled={isPayingDue || duePayAmount <= 0}
                className="px-5 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-black shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isPayingDue ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Record Due Payment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Created Success Modal */}
      {savedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 border border-[#E4E4E7] shadow-2xl space-y-6 animate-in zoom-in-95 text-center">
            <div className="w-16 h-16 rounded-full bg-[#30D158]/15 text-[#30D158] flex items-center justify-center mx-auto mb-1">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>

            <div>
              <h3 className="text-xl font-black text-[#1C1C1E]">
                Invoice Generated Successfully!
              </h3>
              <p className="text-sm text-[#4B5563] mt-1">
                Settlement for <strong>{selectedPatient?.name}</strong> has been finalized.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F4F4F5] space-y-2 text-sm">
              <div className="flex justify-between text-[#4B5563]">
                <span>Total Amount:</span>
                <span className="font-bold text-[#1C1C1E]">{formatBdt(savedInvoice.totalBdt)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Paid Amount:</span>
                <span>{formatBdt(savedInvoice.paidBdt)}</span>
              </div>
              {savedInvoice.dueBdt > 0 ? (
                <div className="flex justify-between text-rose-600 font-black pt-1 border-t border-[#E4E4E7]">
                  <span>Due Balance:</span>
                  <span>{formatBdt(savedInvoice.dueBdt)}</span>
                </div>
              ) : (
                <div className="text-center pt-1 border-t border-[#E4E4E7] text-xs font-bold text-emerald-600">
                  ✓ Paid in Full
                </div>
              )}
            </div>

            <div className="space-y-3 pt-1">
              <Link
                href={`/print/invoice/${savedInvoice.id}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 px-4 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white font-black text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                <Printer className="w-4.5 h-4.5" />
                <span>Open &amp; Print Invoice Receipt ↗</span>
              </Link>

              <Link
                href="/app/queue"
                className="w-full py-3 px-4 rounded-xl bg-[#F4F4F5] hover:bg-[#E8EEF7] text-[#1C1C1E] hover:text-[#2A5CAA] font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Armchair className="w-4.5 h-4.5 text-[#2A5CAA]" />
                <span>Return to Live Queue</span>
              </Link>

              {selectedPatient && (
                <Link
                  href={`/app/patients/${selectedPatient.id}`}
                  className="w-full py-3 px-4 rounded-xl bg-[#F4F4F5] hover:bg-[#E8EEF7] text-[#1C1C1E] hover:text-[#2A5CAA] font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <User className="w-4.5 h-4.5 text-[#2A5CAA]" />
                  <span>View Patient Profile</span>
                </Link>
              )}

              <Link
                href="/app/billing"
                className="w-full py-2.5 px-4 rounded-xl text-center text-[#4B5563] hover:text-[#1C1C1E] font-bold text-sm block transition cursor-pointer"
              >
                ← Return to Billing List
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/app/billing"
            className="p-2.5 rounded-2xl bg-white border border-[#E4E4E7] text-[#6B7280] hover:text-[#1C1C1E] transition cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-[#1C1C1E] tracking-tight">
              Create New Invoice &amp; Settlement
            </h1>
            <p className="text-sm text-[#6B7280]">
              Itemized billing for dental procedures, prescriptions, full payment or remaining due.
            </p>
          </div>
        </div>
      </div>

      {/* Previous Outstanding Dues Alert */}
      {patientDues && patientDues.totalDueBdt > 0 && (
        <div className="p-5 rounded-3xl bg-[#FFF7EB] border-2 border-[#FF9F0A]/40 space-y-3 animate-in fade-in shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-[#B45309] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#92400E]">
                  Patient Has Previous Outstanding Due: {formatBdt(patientDues.totalDueBdt)}
                </h3>
                <p className="text-xs text-[#B45309]">
                  {patientDues.unpaidInvoices.length} unpaid / partial invoice(s) on record for this patient.
                </p>
              </div>
            </div>

            <Link
              href="/app/billing/dues"
              className="px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-xs hover:bg-amber-100 transition self-start sm:self-center shadow-xs"
            >
              Review All Chamber Dues →
            </Link>
          </div>

          <div className="divide-y divide-amber-200/60 pt-1">
            {patientDues.unpaidInvoices.slice(0, 3).map((dueInv) => (
              <div key={dueInv.id} className="py-2 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono font-bold text-[#1C1C1E] mr-2">
                    {dueInv.invoiceCode}
                  </span>
                  <span className="text-amber-800">
                    Total: {formatBdt(dueInv.totalBdt)} (Paid: {formatBdt(dueInv.paidBdt)})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-rose-600">
                    Due: {formatBdt(dueInv.dueBdt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDueModalInvoice(dueInv);
                      setDuePayAmount(dueInv.dueBdt);
                    }}
                    className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                  >
                    Settle Due
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prescription / Appointment Source Badge */}
      {prescriptionInfo && (
        <div className="p-4 rounded-2xl bg-[#EBF2FC] border border-[#2A5CAA]/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2A5CAA]" />
            <span className="text-[#2A5CAA] font-bold">
              Linked to Prescription <strong className="font-mono font-black">{prescriptionInfo.rxCode}</strong>
              {prescriptionInfo.diagnosis && ` • Diagnosis: ${prescriptionInfo.diagnosis}`}
              {prescriptionInfo.toothCodes && prescriptionInfo.toothCodes.length > 0 && ` • Teeth: ${prescriptionInfo.toothCodes.join(", ")}`}
            </span>
          </div>
          <span className="text-[#2A5CAA] bg-white px-2.5 py-0.5 rounded-md font-bold text-[11px] shadow-2xs">
            Auto-populated
          </span>
        </div>
      )}

      {/* Select Patient */}
      <div className="glass-panel p-5 rounded-3xl border border-[#E4E4E7] space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-[#1C1C1E] uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-[#2A5CAA]" />
            <span>Patient Information</span>
          </span>
          {!selectedPatient && (
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(true)}
              className="text-xs font-bold text-[#2A5CAA] hover:text-[#1E4282] flex items-center gap-1 hover:underline cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Quick Register New</span>
            </button>
          )}
        </div>

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

            {patientQuery.trim().length >= 2 && patientResults.length === 0 && !isSearchingPatient && (
              <div className="absolute left-0 right-0 top-14 bg-white rounded-2xl shadow-xl border border-[#E4E4E7] z-20 p-4 text-center space-y-2">
                <p className="text-xs text-[#6B7280]">
                  No existing patient found matching &ldquo;<span className="font-semibold text-[#1C1C1E]">{patientQuery}</span>&rdquo;
                </p>
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register &ldquo;{patientQuery}&rdquo; as New Patient</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* In-page Quick Patient Registration Modal */}
        <QuickRegisterPatientModal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          onSuccess={(newPatient) => {
            setSelectedPatient(newPatient);
            setPatientQuery(newPatient.name);
            setPatientResults([]);
            setIsRegisterModalOpen(false);
          }}
          initialName={patientQuery}
        />
      </div>

      {/* Quick Catalog Procedure Chips */}
      {services.length > 0 && (
        <div className="glass-panel p-4 rounded-3xl border border-[#E4E4E7] space-y-2 shadow-2xs">
          <span className="text-xs font-black uppercase text-[#4B5563] tracking-wide block">
            Quick Add Chamber Procedure:
          </span>
          <div className="flex flex-wrap gap-2">
            {services.map((srv) => (
              <button
                key={srv.id}
                type="button"
                onClick={() => handleQuickAddCatalogService(srv)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#E8EEF7] border border-[#E4E4E7] hover:border-[#2A5CAA] text-xs font-bold text-[#1C1C1E] hover:text-[#2A5CAA] transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <span>+ {srv.name}</span>
                <span className="text-xs text-[#2A5CAA] font-mono">({formatBdt(srv.priceBdt)})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Billable Line Items */}
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
              {/* Preset selector + description */}
              <div className="col-span-12 md:col-span-5 space-y-1.5">
                <select
                  onChange={(e) =>
                    handleSelectCatalogService(idx, e.target.value)
                  }
                  value={line.serviceId || ""}
                  className="w-full px-3 py-2 text-sm border border-[#E4E4E7] rounded-xl outline-none text-[#4B5563] bg-[#F4F4F5] font-medium"
                >
                  <option value="">-- Pick from Procedure Catalog --</option>
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
                <label className="text-[10px] font-bold uppercase text-[#6B7280] block mb-0.5">
                  Tooth No(s)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 16, 21"
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
                <label className="text-[10px] font-bold uppercase text-[#6B7280] block mb-0.5 text-center">
                  Qty
                </label>
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
                <label className="text-[10px] font-bold uppercase text-[#6B7280] block mb-0.5">
                  Price (৳)
                </label>
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
              <div className="col-span-2 md:col-span-1 text-right pt-3">
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
        {/* Settlement Mode & Payment Details */}
        <div className="glass-panel p-5 rounded-3xl border border-[#E4E4E7] space-y-4 shadow-2xs">
          <span className="text-sm font-extrabold text-[#1C1C1E] uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#2A5CAA]" />
            <span>Settlement / Payment Status</span>
          </span>

          {/* 3 Quick Settlement Options */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setSettlementMode("full")}
              className={`p-3 rounded-2xl text-center border-2 transition cursor-pointer ${
                settlementMode === "full"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs"
                  : "bg-white border-[#E4E4E7] text-[#4B5563] hover:bg-[#F4F4F5]"
              }`}
            >
              <span className="block font-black text-sm">Full Paid</span>
              <span className="text-xs font-mono font-bold mt-0.5 block">{formatBdt(totalBdt)}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSettlementMode("partial");
                if (customAdvance === 0) setCustomAdvance(Math.round(totalBdt / 2));
              }}
              className={`p-3 rounded-2xl text-center border-2 transition cursor-pointer ${
                settlementMode === "partial"
                  ? "bg-amber-50 border-amber-500 text-amber-800 shadow-xs"
                  : "bg-white border-[#E4E4E7] text-[#4B5563] hover:bg-[#F4F4F5]"
              }`}
            >
              <span className="block font-black text-sm">Partial</span>
              <span className="text-xs font-bold mt-0.5 block">Part Due</span>
            </button>

            <button
              type="button"
              onClick={() => setSettlementMode("due")}
              className={`p-3 rounded-2xl text-center border-2 transition cursor-pointer ${
                settlementMode === "due"
                  ? "bg-rose-50 border-rose-500 text-rose-800 shadow-xs"
                  : "bg-white border-[#E4E4E7] text-[#4B5563] hover:bg-[#F4F4F5]"
              }`}
            >
              <span className="block font-black text-sm">Full Due</span>
              <span className="text-xs font-bold mt-0.5 block">৳0 Now</span>
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {settlementMode === "partial" && (
              <div>
                <label className="text-xs font-bold text-[#4B5563] block mb-1">
                  Custom Advance Paid Now (৳)
                </label>
                <input
                  type="number"
                  min={1}
                  max={totalBdt}
                  value={customAdvance || ""}
                  onChange={(e) => setCustomAdvance(Number(e.target.value))}
                  placeholder="Enter amount paid today"
                  className="w-full px-3.5 py-2.5 text-base font-black border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] bg-white font-mono"
                />
              </div>
            )}

            {advanceAmount > 0 && (
              <>
                <div>
                  <label className="text-xs font-bold text-[#4B5563] block mb-1">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["cash", "bkash", "nagad", "card"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setAdvanceMethod(m)}
                        className={`py-2 px-2 text-xs font-bold rounded-xl border text-center capitalize transition cursor-pointer ${
                          advanceMethod === m
                            ? "bg-[#2A5CAA] border-[#2A5CAA] text-white shadow-2xs"
                            : "bg-white border-[#E4E4E7] text-[#4B5563] hover:bg-[#F4F4F5]"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {advanceMethod !== "cash" && (
                  <div>
                    <label className="text-xs font-bold text-[#4B5563] block mb-1">
                      Transaction ID / Reference
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

            {settlementMode === "due" && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                <span className="font-bold block">✓ Mark Invoice as Outstanding Due</span>
                <p>
                  No payment will be recorded today. The full <strong>{formatBdt(totalBdt)}</strong> will be tracked under Outstanding Dues.
                </p>
              </div>
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

            <div className="flex justify-between text-sm font-bold text-[#30D158]">
              <span>Paid Today:</span>
              <span>{advanceAmount > 0 ? `- ${formatBdt(advanceAmount)}` : "৳0"}</span>
            </div>

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
            <span>Generate &amp; Finalize Invoice</span>
          </button>
        </div>
      </div>
    </div>
  );
}
