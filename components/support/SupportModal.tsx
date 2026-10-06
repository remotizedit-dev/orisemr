"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  Headphones,
  LifeBuoy,
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Trash2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { sendSupportRequestAction, type SupportRequestInput } from "@/app/(tenant)/app/support/actions";

interface SupportModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  triggerButton?: boolean;
  userName?: string;
  userEmail?: string;
  tenantName?: string;
}

const CATEGORIES: Array<{
  id: SupportRequestInput["category"];
  label: string;
  desc: string;
}> = [
  { id: "bug", label: "Bug / Issue", desc: "Something is not working as expected" },
  { id: "question", label: "How-to Question", desc: "Need assistance using a feature" },
  { id: "urgent", label: "Urgent Clinic Issue", desc: "Critical blocker during patient visit" },
  { id: "feature", label: "Feature Suggestion", desc: "Idea for a future improvement" },
  { id: "billing", label: "Billing & Account", desc: "Questions about invoices or subscription" },
];

export function SupportModal({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  triggerButton = true,
  userName = "Clinic User",
  userEmail = "",
  tenantName = "Dental Clinic",
}: SupportModalProps) {
  const pathname = usePathname();
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isControlled = typeof controlledIsOpen === "boolean";
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleOpen = () => {
    if (!isControlled) setInternalIsOpen(true);
  };

  const handleClose = () => {
    if (isControlled && controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const [category, setCategory] = useState<SupportRequestInput["category"]>("bug");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [screenshotData, setScreenshotData] = useState<{
    base64: string;
    fileName: string;
    sizeKb: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process image file to base64
  const processImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, or WEBP).");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error("Screenshot file size must be less than 8MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setScreenshotData({
          base64: reader.result,
          fileName: file.name || `screenshot_${Date.now()}.png`,
          sizeKb: Math.round(file.size / 1024),
        });
        toast.success("Screenshot attached successfully!");
      }
    };
    reader.readAsDataURL(file);
  }, []);

  // Clipboard paste listener: Allows pressing Ctrl+V anywhere when modal is open to attach screenshot
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen, processImageFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || message.trim().length < 5) {
      toast.error("Please describe your question or issue in detail (at least 5 characters).");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await sendSupportRequestAction({
        category,
        subject: subject.trim() || undefined,
        message: message.trim(),
        currentPath: pathname || "/app",
        screenshotBase64: screenshotData?.base64 || null,
        screenshotFileName: screenshotData?.fileName || null,
      });

      if (result.success) {
        toast.success("Support ticket sent to support@orisemr.com!", {
          description: "Our team has received your message and screenshot and will assist you shortly.",
        });
        // Reset form
        setMessage("");
        setSubject("");
        setCategory("bug");
        setScreenshotData(null);
        handleClose();
      } else {
        toast.error(result.message || "Failed to send support request. Please try again.");
      }
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred while sending your request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Optional Trigger Button for header or layout */}
      {triggerButton && (
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#2A5CAA] bg-[#EBF2FC] hover:bg-[#2A5CAA] hover:text-white border border-[#2A5CAA]/20 transition shadow-2xs cursor-pointer"
          title="Contact Oris EMR Support"
        >
          <Headphones className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Support</span>
        </button>
      )}

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-xl max-h-[92vh] flex flex-col bg-white rounded-3xl border border-[#E4E4E7] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#E4E4E7] bg-[#F8FAFC]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#EBF2FC] text-[#2A5CAA] flex items-center justify-center border border-[#2A5CAA]/25 shrink-0 shadow-2xs">
                  <LifeBuoy className="w-5 h-5 text-[#2A5CAA]" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-[#1C1C1E]">
                    Oris EMR Help &amp; Support
                  </h2>
                  <p className="text-xs text-[#6B7280]">
                    Direct assistance from the Oris engineering &amp; clinical team
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="p-1.5 rounded-xl text-[#6B7280] hover:text-[#1C1C1E] hover:bg-[#E4E4E7]/60 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
              {/* Category selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-2">
                  Request Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`px-3 py-2 rounded-xl text-left border text-xs font-bold transition cursor-pointer flex flex-col gap-0.5 ${
                        category === cat.id
                          ? "bg-[#2A5CAA] text-white border-[#2A5CAA] shadow-2xs"
                          : "bg-white text-[#4B5563] border-[#E4E4E7] hover:bg-[#F4F4F5]"
                      }`}
                    >
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1.5">
                  Subject (Optional)
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Issue saving prescription, patient search query, etc."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E4E4E7] text-[#1C1C1E] placeholder:text-[#9CA3AF] text-sm focus:outline-hidden focus:border-[#2A5CAA] focus:ring-2 focus:ring-[#EBF2FC] transition"
                  disabled={isSubmitting}
                />
              </div>

              {/* Message Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                    Message / Description <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-[#9CA3AF]">
                    {message.length} chars
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe what happened, what you expected, or what question you have..."
                  required
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E4E4E7] text-[#1C1C1E] placeholder:text-[#9CA3AF] text-sm focus:outline-hidden focus:border-[#2A5CAA] focus:ring-2 focus:ring-[#EBF2FC] transition resize-y"
                />
              </div>

              {/* Screenshot Attachment Zone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1.5">
                  Attach Screenshot
                </label>

                {screenshotData ? (
                  <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#BFDBFE] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-xl overflow-hidden border border-[#E4E4E7] bg-white shrink-0 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={screenshotData.base64}
                          alt="Screenshot preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#1C1C1E] block truncate">
                          {screenshotData.fileName}
                        </span>
                        <span className="text-[11px] text-[#6B7280]">
                          {screenshotData.sizeKb} KB · Ready to send
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScreenshotData(null)}
                      disabled={isSubmitting}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                      title="Remove screenshot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-4 rounded-2xl border-2 border-dashed transition text-center cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                      isDragOver
                        ? "border-[#2A5CAA] bg-[#EBF2FC]/50"
                        : "border-[#E4E4E7] hover:border-[#2A5CAA]/60 hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="w-8 h-8 rounded-full bg-[#EBF2FC] text-[#2A5CAA] flex items-center justify-center">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1C1C1E]">
                        Click to upload or drag image here
                      </p>
                      <p className="text-[11px] text-[#6B7280] mt-0.5">
                        💡 <strong>Tip:</strong> Press <kbd className="px-1.5 py-0.5 rounded bg-[#F4F4F5] border text-[10px] font-mono font-bold">Ctrl+V</kbd> anywhere in this window to paste a screenshot!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Automatic Context Information Display */}
              <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E4E4E7] text-[11px] text-[#6B7280] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#4B5563]">
                  <Info className="w-3.5 h-3.5 text-[#2A5CAA]" />
                  <span>Automatic Diagnostics Context</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px] font-medium pt-0.5">
                  <div>Clinic: <strong className="text-[#1C1C1E]">{tenantName}</strong></div>
                  <div>User: <strong className="text-[#1C1C1E]">{userName}</strong></div>
                  <div className="col-span-2 truncate">
                    Active Page: <span className="font-mono text-[#2A5CAA]">{pathname || "/app"}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#4B5563] hover:bg-[#F4F4F5] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || message.trim().length < 5}
                  className="px-5 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition shadow-sm cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending to support@orisemr.com...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send to Support</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
