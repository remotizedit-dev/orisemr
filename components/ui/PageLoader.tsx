import { Sparkles } from "lucide-react";

interface PageLoaderProps {
  label?: string;
  sublabel?: string;
  showSkeleton?: boolean;
}

export default function PageLoader({
  label = "Loading Chamber Data...",
  sublabel = "Retrieving patient records & appointments",
  showSkeleton = true,
}: PageLoaderProps) {
  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* Central Pulsing Glass Pill */}
      <div className="flex flex-col items-center justify-center py-8">
        <div className="glass-panel px-6 py-4 rounded-2xl border border-[#E4E4E7] shadow-lg flex items-center gap-4 bg-white/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
          {/* Animated Spinner with Tooth/Stethoscope Glow */}
          <div className="relative flex items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2A5CAA] to-[#1E4282] flex items-center justify-center text-white shadow-md shadow-[#2A5CAA]/20">
              <span className="font-extrabold text-sm tracking-tight">O</span>
            </div>
            {/* Spinning orbital ring */}
            <div className="absolute -inset-1.5 rounded-2xl border-2 border-transparent border-t-[#2A5CAA] border-r-[#30D158] animate-spin" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-[#1C1C1E] tracking-tight">
                {label}
              </h3>
              <Sparkles className="w-3 h-3 text-[#2A5CAA] animate-pulse" />
            </div>
            <p className="text-[11px] text-[#6B7280]">{sublabel}</p>
          </div>
        </div>
      </div>

      {/* Shimmering Content Skeletons */}
      {showSkeleton && (
        <div className="space-y-4 max-w-5xl mx-auto">
          {/* Top Stat Cards Skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="glass-panel p-4 rounded-2xl border border-[#E4E4E7] space-y-2 bg-white/40"
              >
                <div className="w-20 h-3 bg-[#E4E4E7]/60 rounded-md animate-pulse" />
                <div className="w-28 h-6 bg-[#E4E4E7]/80 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>

          {/* Main Panel Skeleton */}
          <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-4 bg-white/40">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E7]/60">
              <div className="w-40 h-4 bg-[#E4E4E7]/80 rounded-md animate-pulse" />
              <div className="w-24 h-7 bg-[#E4E4E7]/60 rounded-xl animate-pulse" />
            </div>

            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4, 5].map((row) => (
                <div
                  key={row}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/60 border border-[#E4E4E7]/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#E4E4E7]/80 animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="w-32 h-3.5 bg-[#E4E4E7]/80 rounded-md animate-pulse" />
                      <div className="w-20 h-2.5 bg-[#E4E4E7]/50 rounded-md animate-pulse" />
                    </div>
                  </div>
                  <div className="w-16 h-6 bg-[#E4E4E7]/70 rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
