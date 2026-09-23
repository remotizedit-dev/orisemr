"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Radio,
  Send,
  Mail,
  Bell,
  CheckCircle,
  Building2,
  Users,
  Loader2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { formatDhakaDate } from "@/lib/utils";
import { sendBroadcastAction } from "@/app/(platform)/platform/broadcasts/actions";

interface ClinicOption {
  id: string;
  name: string;
  shortCode: string;
}

interface BroadcastItem {
  id: string;
  title: string;
  body: string;
  target: string;
  audience: string | null;
  sendEmail: boolean;
  sendInApp: boolean;
  recipientCount: number;
  sentAt: string | null;
  createdBy: string;
}

interface Props {
  clinics: ClinicOption[];
  pastBroadcasts: BroadcastItem[];
}

export default function BroadcastsClient({
  clinics,
  pastBroadcasts,
}: Props) {
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<"all_tenants" | "selected_tenants">("all_tenants");
  const [selectedClinicIds, setSelectedClinicIds] = useState<string[]>([]);
  const [audience, setAudience] = useState<"tenant_admins" | "all_staff">("tenant_admins");
  const [sendInApp, setSendInApp] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  const [isSending, setIsSending] = useState(false);

  function toggleClinic(id: string) {
    if (selectedClinicIds.includes(id)) {
      setSelectedClinicIds(selectedClinicIds.filter((c) => c !== id));
    } else {
      setSelectedClinicIds([...selectedClinicIds, id]);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Please enter a title and message.");
      return;
    }

    if (target === "selected_tenants" && selectedClinicIds.length === 0) {
      toast.error("Please select at least one clinic.");
      return;
    }

    try {
      setIsSending(true);
      const res = await sendBroadcastAction({
        title,
        body,
        target,
        targetTenantIds: selectedClinicIds,
        audience,
        sendEmail,
        sendInApp,
      });

      toast.success(
        `Broadcast sent successfully to ${res.recipientCount} recipients!`
      );
      setTitle("");
      setBody("");
      setSelectedClinicIds([]);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to send broadcast");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
            Platform Broadcasts &amp; Announcements
          </h1>
          <p className="text-sm text-[#6B7280]">
            Send system announcements, scheduled maintenance alerts, or policy updates to dental chambers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Compose Broadcast */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleSend}
            className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-4"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#2A5CAA] text-white flex items-center justify-center shadow-xs">
                <Radio className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-[#1C1C1E]">
                Compose Announcement
              </h2>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#6B7280]">
                Subject / Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Scheduled System Upgrade on Friday"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#6B7280]">
                Message Body
              </label>
              <textarea
                required
                rows={4}
                placeholder="Write your announcement details here..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] bg-white leading-relaxed"
              />
            </div>

            {/* Target Clinics */}
            <div className="space-y-2 pt-2 border-t border-[#E4E4E7]">
              <label className="text-xs font-semibold text-[#6B7280] block">
                Target Clinics
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTarget("all_tenants")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                    target === "all_tenants"
                      ? "bg-[#2A5CAA] text-white border-[#2A5CAA] shadow-2xs"
                      : "bg-white text-[#6B7280] border-[#E4E4E7] hover:bg-[#F4F4F5]"
                  }`}
                >
                  All Active Clinics
                </button>
                <button
                  type="button"
                  onClick={() => setTarget("selected_tenants")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                    target === "selected_tenants"
                      ? "bg-[#2A5CAA] text-white border-[#2A5CAA] shadow-2xs"
                      : "bg-white text-[#6B7280] border-[#E4E4E7] hover:bg-[#F4F4F5]"
                  }`}
                >
                  Pick Specific Clinics
                </button>
              </div>

              {target === "selected_tenants" && (
                <div className="p-3 bg-white rounded-xl border border-[#E4E4E7] max-h-40 overflow-y-auto space-y-1.5">
                  {clinics.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 text-xs text-[#1C1C1E] cursor-pointer hover:bg-[#F4F4F5] p-1 rounded-lg"
                    >
                      <input
                        type="checkbox"
                        checked={selectedClinicIds.includes(c.id)}
                        onChange={() => toggleClinic(c.id)}
                        className="w-4 h-4 rounded border-[#E4E4E7] text-[#2A5CAA]"
                      />
                      <span className="font-semibold">{c.name}</span>
                      <span className="text-[10px] text-[#6B7280] font-mono">
                        ({c.shortCode})
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Target Audience */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#6B7280] block">
                Recipient Role
              </label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none bg-white"
              >
                <option value="tenant_admins">Chamber Admins Only</option>
                <option value="all_staff">
                  All Staff (Doctors &amp; Receptionists)
                </option>
              </select>
            </div>

            {/* Delivery Channels */}
            <div className="space-y-2 pt-2 border-t border-[#E4E4E7]">
              <label className="text-xs font-semibold text-[#6B7280] block">
                Delivery Channels
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendInApp}
                    onChange={(e) => setSendInApp(e.target.checked)}
                    className="w-4 h-4 rounded border-[#E4E4E7] text-[#2A5CAA]"
                  />
                  <Bell className="w-3.5 h-3.5 text-[#2A5CAA]" />
                  <span className="text-xs text-[#1C1C1E]">In-App Alert</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="w-4 h-4 rounded border-[#E4E4E7] text-[#2A5CAA]"
                  />
                  <Mail className="w-3.5 h-3.5 text-[#2A5CAA]" />
                  <span className="text-xs text-[#1C1C1E]">Email Notification</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Send Broadcast Now</span>
            </button>
          </form>
        </div>

        {/* Right Column: History of Broadcasts */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-4">
            <h2 className="text-sm font-bold text-[#1C1C1E]">
              Past Broadcast History ({pastBroadcasts.length})
            </h2>

            {pastBroadcasts.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#6B7280]">
                No broadcasts have been sent yet.
              </div>
            ) : (
              <div className="space-y-3">
                {pastBroadcasts.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl bg-white border border-[#E4E4E7] space-y-2 hover:border-[#2A5CAA]/40 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-xs text-[#1C1C1E]">
                        {b.title}
                      </h4>
                      <span className="text-[10px] text-[#6B7280] whitespace-nowrap">
                        {b.sentAt ? formatDhakaDate(b.sentAt) : "Draft"}
                      </span>
                    </div>

                    <p className="text-xs text-[#6B7280] leading-relaxed line-clamp-2">
                      {b.body}
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-2 text-[10px]">
                      <span className="px-2 py-0.5 rounded-md bg-[#F4F4F5] text-[#1C1C1E] font-semibold">
                        {b.target === "all_tenants"
                          ? "All Clinics"
                          : "Selected Clinics"}
                      </span>

                      <span className="px-2 py-0.5 rounded-md bg-[#EBF2FC] text-[#2A5CAA] font-semibold">
                        {b.audience === "tenant_admins"
                          ? "Admins Only"
                          : "All Chamber Staff"}
                      </span>

                      <div className="flex items-center gap-1.5 text-[#6B7280]">
                        {b.sendInApp && (
                          <span className="flex items-center gap-0.5">
                            <Bell className="w-3 h-3 text-[#30D158]" /> In-App
                          </span>
                        )}
                        {b.sendEmail && (
                          <span className="flex items-center gap-0.5">
                            <Mail className="w-3 h-3 text-[#2A5CAA]" /> Email
                          </span>
                        )}
                      </div>

                      <span className="ml-auto font-bold text-[#1C1C1E]">
                        {b.recipientCount} Recipients
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
