"use client";

import { useState, useTransition } from "react";
import { Check, ExternalLink, Loader2, Video } from "lucide-react";
import { updateLandingVideoUrl } from "@/app/(platform)/platform/actions";

function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <polygon points="10 15 15 12 10 9 10 15" fill="currentColor" />
    </svg>
  );
}

interface Props {
  initialVideoUrl: string;
}

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v) return `https://www.youtube-nocookie.com/embed/${v}`;
      if (parsed.pathname.startsWith("/embed/")) return url;
    } else if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.slice(1);
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
    }
  } catch {}
  return null;
}

export default function LandingVideoSettingsCard({ initialVideoUrl }: Props) {
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl);
  const [savedUrl, setSavedUrl] = useState(initialVideoUrl);
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const embedUrl = getYouTubeEmbedUrl(videoUrl);

  const handleSave = () => {
    startTransition(async () => {
      try {
        const res = await updateLandingVideoUrl(videoUrl);
        if (res.success) {
          setSavedUrl(res.videoUrl);
          setStatusMessage("✅ Landing page YouTube video updated successfully!");
          setTimeout(() => setStatusMessage(null), 4000);
        }
      } catch (err) {
        setStatusMessage("❌ Failed to update video. Check permissions.");
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#E4E4E7] shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
          <YoutubeIcon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#1C1C1E]">
            Landing Page Demo Video
          </h2>
          <p className="text-xs text-[#6B7280]">
            Paste your YouTube video link to showcase your chamber walkthrough on the landing page.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#1C1C1E] focus:outline-none focus:ring-2 focus:ring-[#2A5CAA] focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || videoUrl === savedUrl}
            className="px-5 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#224b8c] disabled:opacity-50 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition shrink-0 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Video URL</span>
              </>
            )}
          </button>
        </div>

        {statusMessage && (
          <p className="text-xs font-semibold text-[#059669]">{statusMessage}</p>
        )}

        {embedUrl && (
          <div className="mt-4 pt-4 border-t border-[#F4F4F5]">
            <p className="text-xs font-medium text-[#6B7280] mb-2 flex items-center justify-between">
              <span>Live Video Preview</span>
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#2A5CAA] hover:underline inline-flex items-center gap-1"
              >
                Open in YouTube <ExternalLink className="w-3 h-3" />
              </a>
            </p>
            <div className="relative aspect-video w-full max-w-lg rounded-xl overflow-hidden border border-[#E2E8F0] shadow-sm bg-black">
              <iframe
                src={embedUrl}
                title="Preview"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
