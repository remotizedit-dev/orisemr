"use client";

import { useState, useRef, useEffect } from "react";
import { uploadPatientReportAction } from "@/app/(tenant)/app/patients/actions";
import {
  Camera,
  Check,
  FileText,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Upload,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface UploadReportModalProps {
  patientId: string;
  prescriptionId?: string;
  isOpen: boolean;
  onClose: () => void;
  onUploaded?: (attachment: any) => void;
}

export function UploadReportModal({
  patientId,
  prescriptionId,
  isOpen,
  onClose,
  onUploaded,
}: UploadReportModalProps) {
  const [mode, setMode] = useState<"file" | "camera">("file");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"xray" | "intraoral_photo" | "report" | "document">("xray");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setSelectedFile(null);
      setPreviewUrl(null);
      setTitle("");
      setCameraError(null);
    }
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn("Webcam access error:", err);
      setCameraError(
        "Could not access camera. Please allow camera permissions in your browser or use file upload."
      );
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const capturedFile = new File([blob], `camera_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setSelectedFile(capturedFile);
        setPreviewUrl(URL.createObjectURL(blob));
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
    if (!title) {
      const cleanBase = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
      setTitle(cleanBase);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please pick a file or capture a photo first");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set("patientId", patientId);
      formData.set("kind", kind);
      formData.set("title", title || `${kind.toUpperCase()} Document`);
      if (prescriptionId) {
        formData.set("prescriptionId", prescriptionId);
      }
      formData.set("file", selectedFile);

      const res = await uploadPatientReportAction(formData);
      if (res?.success) {
        toast.success("Document successfully uploaded to S3!");
        if (onUploaded) {
          onUploaded(res.attachment);
        }
        onClose();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-[#E4E4E7] space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E7]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E8EEF7] text-[#2A5CAA] flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-[#1C1C1E]">
                Upload Medical Document / X-Ray
              </h3>
              <p className="text-xs text-[#6B7280]">
                Stored securely in S3 bucket (ORIS-EMR/tenant/...)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#6B7280] hover:text-[#1C1C1E] hover:bg-[#F4F4F5] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Mode Selector: File Pick vs Camera */}
        <div className="flex items-center gap-2 p-1 bg-[#F4F4F5] rounded-2xl border border-[#E4E4E7]">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setMode("file");
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === "file"
                ? "bg-white text-[#2A5CAA] shadow-xs"
                : "text-[#6B7280] hover:text-[#1C1C1E]"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Choose File (Image / PDF)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("camera");
              startCamera();
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === "camera"
                ? "bg-white text-[#2A5CAA] shadow-xs"
                : "text-[#6B7280] hover:text-[#1C1C1E]"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Take Photo (Camera / Webcam)</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1C1C1E] mb-1">
                Category
              </label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#E4E4E7] bg-white text-xs font-semibold focus:outline-none focus:border-[#2A5CAA]"
              >
                <option value="xray">X-Ray (IOPA / OPG / Bitewing)</option>
                <option value="intraoral_photo">Intraoral / Teeth Photo</option>
                <option value="report">Blood / Pathology Report</option>
                <option value="document">Prescription / Clinical Document</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1C1E] mb-1">
                Document Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. IOPA Tooth #46 or Blood Glucose"
                className="w-full px-3 py-2 rounded-xl border border-[#E4E4E7] text-xs font-medium focus:outline-none focus:border-[#2A5CAA]"
              />
            </div>
          </div>

          {/* Mode 1: File Upload */}
          {mode === "file" && (
            <div className="space-y-3">
              <label className="block border-2 border-dashed border-[#CBD5E1] hover:border-[#2A5CAA] rounded-2xl p-6 text-center cursor-pointer transition bg-[#F8FAFC]">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#E8EEF7] text-[#2A5CAA] flex items-center justify-center font-bold">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#1C1C1E] block">
                      {selectedFile ? selectedFile.name : "Click to browse or drop document here"}
                    </span>
                    <span className="text-xs text-[#6B7280]">
                      Accepts JPEG, PNG, WebP, BMP, DICOM, PDF (up to 25MB)
                    </span>
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Mode 2: Live Camera Viewfinder */}
          {mode === "camera" && (
            <div className="space-y-3">
              {!previewUrl ? (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-[#E4E4E7]">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {cameraError ? (
                    <div className="p-4 text-center text-white space-y-2">
                      <VideoOff className="w-8 h-8 mx-auto text-rose-400" />
                      <p className="text-xs">{cameraError}</p>
                      <label className="inline-block mt-2 px-3 py-1.5 rounded-xl bg-white text-[#1C1C1E] text-xs font-bold cursor-pointer">
                        Use Native Mobile Camera
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="px-5 py-2.5 rounded-full bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-bold flex items-center gap-2 shadow-lg transition cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Take Photo</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-[#E4E4E7]">
                    <img
                      src={previewUrl}
                      alt="Captured photo preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      startCamera();
                    }}
                    className="px-3 py-1.5 rounded-xl border border-[#E4E4E7] text-xs font-bold text-[#4B5563] hover:text-[#1C1C1E] hover:bg-[#F4F4F5] flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retake Photo</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Preview for File Upload Mode */}
          {mode === "file" && previewUrl && (
            <div className="relative rounded-2xl overflow-hidden bg-[#F8FAFC] max-h-48 flex items-center justify-center border border-[#E4E4E7]">
              <img
                src={previewUrl}
                alt="File preview"
                className="max-h-48 object-contain"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E4E4E7]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#1C1C1E] text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="px-5 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading to S3...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload Document</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
