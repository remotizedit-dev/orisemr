"use client";

import { useState } from "react";
import {
  ScrollText,
  Search,
  Filter,
  User,
  Building2,
  Calendar,
  Eye,
  X,
  Shield,
} from "lucide-react";
import { formatDhakaDate } from "@/lib/utils";

interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  tenantId: string | null;
  tenantName: string | null;
  ip: string | null;
  before: any;
  after: any;
  createdAt: string;
}

interface Props {
  logs: AuditLogItem[];
  entityTypes: string[];
}

export default function AuditClient({ logs, entityTypes }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<string>("all");
  const [activeModalLog, setActiveModalLog] = useState<AuditLogItem | null>(null);

  const filteredLogs = logs.filter((log) => {
    if (selectedEntity !== "all" && log.entityType !== selectedEntity) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchActor =
        (log.actorName && log.actorName.toLowerCase().includes(q)) ||
        (log.actorEmail && log.actorEmail.toLowerCase().includes(q));
      const matchTenant =
        log.tenantName && log.tenantName.toLowerCase().includes(q);
      const matchEntity = log.entityType.toLowerCase().includes(q);

      return matchAction || matchActor || matchTenant || matchEntity;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
            Security &amp; Compliance Audit Logs
          </h1>
          <p className="text-sm text-[#6B7280]">
            Immutable chronological audit trail of all clinical, billing, and platform management operations.
          </p>
        </div>

        <div className="p-2.5 rounded-xl bg-white border border-[#E4E4E7] shadow-2xs flex items-center gap-2 text-xs font-bold text-[#1C1C1E]">
          <Shield className="w-4 h-4 text-[#30D158]" />
          <span>{logs.length} Total Audit Records</span>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-panel p-3 rounded-2xl border border-[#E4E4E7]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#A1A1AA]" />
          <input
            type="text"
            placeholder="Search by action, actor, or clinic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#6B7280]" />
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none bg-white text-[#1C1C1E] font-medium"
          >
            <option value="all">All Entity Types</option>
            {entityTypes.map((et) => (
              <option key={et} value={et}>
                {et.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="glass-panel rounded-2xl border border-[#E4E4E7] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E4E4E7] bg-white/50 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Chamber</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B7280]">
                    No audit records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/70 transition">
                    <td className="py-3 px-4 text-[#6B7280] whitespace-nowrap">
                      {formatDhakaDate(log.createdAt)}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-xs text-[#2A5CAA]">
                      {log.action}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-[#F4F4F5] text-[#1C1C1E] font-semibold uppercase text-[10px]">
                        {log.entityType}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-[#1C1C1E] block">
                        {log.actorName || "System / Bot"}
                      </span>
                      {log.actorEmail && (
                        <span className="text-[10px] text-[#6B7280]">
                          {log.actorEmail}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-[#1C1C1E] font-medium">
                        {log.tenantName || "Global Platform"}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-[#6B7280]">
                      {log.ip || "—"}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {(log.before || log.after) ? (
                        <button
                          type="button"
                          onClick={() => setActiveModalLog(log)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#E4E4E7] text-[#2A5CAA] hover:bg-[#F4F4F5] font-semibold inline-flex items-center gap-1 transition shadow-2xs"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      ) : (
                        <span className="text-[#A1A1AA]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Payload Inspector Modal */}
      {activeModalLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1C1C1E]">
                  Audit Log Details
                </h3>
                <span className="text-xs text-[#6B7280] font-mono">
                  {activeModalLog.action} • {activeModalLog.entityType}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalLog(null)}
                className="p-1.5 rounded-lg hover:bg-[#F4F4F5] text-[#6B7280]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-semibold text-[#6B7280] block mb-1">
                  Actor:
                </span>
                <span className="font-bold text-[#1C1C1E]">
                  {activeModalLog.actorName || "System"} ({activeModalLog.actorEmail || "N/A"})
                </span>
              </div>
              <div>
                <span className="font-semibold text-[#6B7280] block mb-1">
                  Timestamp:
                </span>
                <span className="font-medium text-[#1C1C1E]">
                  {formatDhakaDate(activeModalLog.createdAt)}
                </span>
              </div>
            </div>

            {/* Before / After Payload */}
            <div className="space-y-3 pt-2">
              {activeModalLog.before && (
                <div>
                  <span className="text-xs font-bold text-[#FF453A] block mb-1">
                    State Before Modification:
                  </span>
                  <pre className="p-3 bg-[#F4F4F5] rounded-xl text-[11px] font-mono overflow-x-auto text-[#1C1C1E]">
                    {JSON.stringify(activeModalLog.before, null, 2)}
                  </pre>
                </div>
              )}

              {activeModalLog.after && (
                <div>
                  <span className="text-xs font-bold text-[#30D158] block mb-1">
                    State After Modification:
                  </span>
                  <pre className="p-3 bg-[#F4F4F5] rounded-xl text-[11px] font-mono overflow-x-auto text-[#1C1C1E]">
                    {JSON.stringify(activeModalLog.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveModalLog(null)}
                className="px-4 py-2 bg-[#2A5CAA] text-white rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
