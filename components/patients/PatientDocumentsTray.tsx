"use client";

import { useState } from "react";
import {
  Camera,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatDhakaDate } from "@/lib/utils";
import { deletePatientAttachmentAction } from "@/app/(tenant)/app/patients/actions";
import { UploadReportModal } from "@/components/prescription/UploadReportModal";

interface AttachmentItem {
  id: string;
  title: string | null;
  kind: string;
  reportCode: string | null;
  s3Key: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: Date | string;
  uploadedByName: string | null;
  url: string;
}

interface PatientDocumentsTrayProps {
  patientId: string;
  initialAttachments: AttachmentItem[];
}

export function PatientDocumentsTray({
  patientId,
  initialAttachments,
}: PatientDocumentsTrayProps) {
  const [attachments, setAttachments] = useState<AttachmentItem[]>(initialAttachments);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [lightboxAttachment, setLightboxAttachment] = useState<AttachmentItem | null>(null);

  async function handleDeleteAttachment(attachmentId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this clinical document?")) return;

    try {
      await deletePatientAttachmentAction(attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      toast.success("Document deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete document");
    }
  }

  return (
    <div className="glass-panel rounded-2xl border border-[#E4E4E7] overflow-hidden">
      {/* Upload Modal */}
      <UploadReportModal
        patientId={patientId}
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploaded={(newDoc) => {
          setAttachments((prev) => [
            {
              id: newDoc.id,
              title: newDoc.title,
              kind: newDoc.kind,
              reportCode: newDoc.reportCode,
              s3Key: newDoc.s3Key,
              contentType: newDoc.contentType,
              sizeBytes: newDoc.sizeBytes,
              uploadedAt: newDoc.uploadedAt,
              uploadedByName: newDoc.uploadedByName,
              url: newDoc.url,
            },
            ...prev,
          ]);
        }}
      />

      {/* Lightbox Modal */}
      {lightboxAttachment && (
        <div
          onClick={() => setLightboxAttachment(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl flex items-center justify-between py-2 px-4 rounded-xl bg-white/10 text-white backdrop-blur-md border border-white/10"
          >
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#2A5CAA] text-white">
                {lightboxAttachment.kind.replace("_", " ")}
              </span>
              <span className="font-mono text-xs font-bold text-slate-300">
                {lightboxAttachment.reportCode}
              </span>
              <span className="text-xs font-bold truncate max-w-sm">
                {lightboxAttachment.title}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={lightboxAttachment.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-300 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Full</span>
              </a>
              <button
                type="button"
                onClick={() => setLightboxAttachment(null)}
                className="p-1 rounded-lg hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center max-w-5xl max-h-[80vh] my-auto"
          >
            <img
              src={lightboxAttachment.url}
              alt={lightboxAttachment.title || "Clinical document"}
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Tray Header */}
      <div className="p-4 border-b border-[#E4E4E7] flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-[#1C1C1E] flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-[#2A5CAA]" />
          <span>Clinical Reports, X-Rays &amp; Documents ({attachments.length})</span>
        </h2>

        <button
          type="button"
          onClick={() => setIsUploadModalOpen(true)}
          className="px-3 py-1.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Tray Content */}
      <div className="p-4">
        {attachments.length === 0 ? (
          <div
            onClick={() => setIsUploadModalOpen(true)}
            className="p-8 text-center text-xs text-[#6B7280] bg-[#F9FAFB] hover:bg-[#F1F5F9] rounded-xl border border-dashed border-[#E4E4E7] cursor-pointer transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 group-hover:bg-blue-100 text-[#2A5CAA] flex items-center justify-center mx-auto mb-2 transition">
              <Camera className="w-5 h-5" />
            </div>
            <p className="font-bold text-[#1C1C1E] mb-1">
              No clinical documents, X-rays, or lab reports uploaded yet.
            </p>
            <p className="text-[11px] text-[#6B7280] mb-3">
              Upload radiographs or reports now so doctors can inspect them in-chair during appointments.
            </p>
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-[#2A5CAA]/30 text-[#2A5CAA] font-bold text-xs shadow-2xs group-hover:bg-[#2A5CAA] group-hover:text-white transition">
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Report / Document Now</span>
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {attachments.map((att) => {
              const isImg =
                att.contentType?.startsWith("image/") ||
                /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(att.s3Key || "");

              return (
                <div
                  key={att.id}
                  className="group relative rounded-xl bg-white border border-[#E4E4E7] hover:border-[#2A5CAA] shadow-2xs hover:shadow-md p-2 flex flex-col justify-between transition overflow-hidden"
                >
                  {/* Delete Cross Icon */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteAttachment(att.id, e)}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 hover:bg-rose-600 text-white flex items-center justify-center transition opacity-70 group-hover:opacity-100 z-10 cursor-pointer shadow-xs"
                    title="Delete document"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  {/* Thumbnail */}
                  <div
                    onClick={() => {
                      if (isImg) {
                        setLightboxAttachment(att);
                      } else {
                        window.open(att.url, "_blank");
                      }
                    }}
                    className="w-full h-24 rounded-lg bg-[#0F172A] relative overflow-hidden flex items-center justify-center cursor-pointer group/thumb"
                  >
                    {isImg ? (
                      <>
                        <img
                          src={att.url}
                          alt={att.title || "Clinical Report"}
                          className="w-full h-full object-contain transition-transform duration-300 group-hover/thumb:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white">
                          <Search className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold">Inspect</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-300 gap-1 p-2">
                        <FileText className="w-6 h-6 text-[#2A5CAA]" />
                        <span className="text-[9px] uppercase font-bold text-center line-clamp-1">
                          {att.contentType?.split("/")[1] || "DOC"}
                        </span>
                      </div>
                    )}

                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-black/70 text-white backdrop-blur-xs">
                      {att.kind.replace("_", " ")}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="pt-2 space-y-1">
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="font-mono text-[#2A5CAA] font-bold truncate max-w-[65px]">
                        {att.reportCode || "DOC"}
                      </span>
                      <span className="text-[#8E8E93]">
                        {formatDhakaDate(att.uploadedAt, "dd MMM yyyy")}
                      </span>
                    </div>

                    <h3
                      className="font-bold text-xs text-[#1C1C1E] truncate group-hover:text-[#2A5CAA] transition"
                      title={att.title || "Clinical Document"}
                    >
                      {att.title || "Clinical Document"}
                    </h3>

                    {att.uploadedByName && (
                      <p className="text-[10px] text-[#6B7280] truncate">
                        By {att.uploadedByName}
                      </p>
                    )}

                    <div className="pt-1.5 flex items-center justify-between gap-1 border-t border-[#F4F4F5]">
                      {isImg ? (
                        <button
                          type="button"
                          onClick={() => setLightboxAttachment(att)}
                          className="text-[10px] font-bold text-[#2A5CAA] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Search className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      ) : (
                        <span className="text-[9px] text-[#6B7280]">
                          {att.sizeBytes ? `${Math.round(att.sizeBytes / 1024)} KB` : "File"}
                        </span>
                      )}

                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-md text-[#8E8E93] hover:text-[#2A5CAA] hover:bg-[#E8EEF7] transition"
                        title="Open in new window ↗"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
