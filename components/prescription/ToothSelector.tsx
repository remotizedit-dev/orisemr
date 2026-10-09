"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";

interface ToothSelectorProps {
  selectedTeeth: string[];
  onChange: (teeth: string[]) => void;
}

export function ToothSelector({ selectedTeeth, onChange }: ToothSelectorProps) {
  const [isPrimary, setIsPrimary] = useState(false);

  // Permanent FDI teeth
  const permUR = ["18", "17", "16", "15", "14", "13", "12", "11"];
  const permUL = ["21", "22", "23", "24", "25", "26", "27", "28"];
  const permLL = ["31", "32", "33", "34", "35", "36", "37", "38"];
  const permLR = ["48", "47", "46", "45", "44", "43", "42", "41"];

  // Deciduous / Primary FDI teeth
  const primUR = ["55", "54", "53", "52", "51"];
  const primUL = ["61", "62", "63", "64", "65"];
  const primLL = ["71", "72", "73", "74", "75"];
  const primLR = ["85", "84", "83", "82", "81"];

  const upperRight = isPrimary ? primUR : permUR;
  const upperLeft = isPrimary ? primUL : permUL;
  const lowerLeft = isPrimary ? primLL : permLL;
  const lowerRight = isPrimary ? primLR : permLR;

  const toggleTooth = (tooth: string) => {
    if (selectedTeeth.includes(tooth)) {
      onChange(selectedTeeth.filter((t) => t !== tooth));
    } else {
      onChange([...selectedTeeth, tooth]);
    }
  };

  const removeTooth = (tooth: string) => {
    onChange(selectedTeeth.filter((t) => t !== tooth));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-3.5 p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E4E4E7] shadow-xs">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#E4E4E7]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-[#1C1C1E] uppercase tracking-wider">
            FDI Dental Chart
          </span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EBF2FC] text-[#2A5CAA] border border-[#2A5CAA]/20">
            {isPrimary ? "Primary (Milk)" : "Adult (Permanent)"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsPrimary(!isPrimary)}
          className="text-xs font-bold text-[#2A5CAA] hover:text-[#1E4282] bg-[#F4F4F5] hover:bg-[#E8EEF7] px-3 py-1.5 rounded-xl transition cursor-pointer text-left sm:text-right"
        >
          {isPrimary ? "⇄ Switch to Adult (11–48)" : "⇄ Switch to Child / Milk (51–85)"}
        </button>
      </div>

      {/* Selected Teeth Badges Row */}
      {selectedTeeth.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E4E4E7]">
          <span className="text-xs font-extrabold uppercase text-[#4B5563]">
            Selected ({selectedTeeth.length}):
          </span>
          {selectedTeeth.map((tooth) => (
            <span
              key={tooth}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2A5CAA] text-white font-mono text-xs font-black shadow-xs"
            >
              <span>T{tooth}</span>
              <button
                type="button"
                onClick={() => removeTooth(tooth)}
                className="hover:text-rose-200 transition cursor-pointer"
                title="Remove tooth"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-bold text-[#FF453A] hover:underline ml-auto cursor-pointer px-2 py-0.5"
          >
            Clear all
          </button>
        </div>
      )}

      {/* FDI Teeth Grid (Panoramic Arch Layout) */}
      <div className="w-full overflow-x-auto pb-2 pt-1 scrollbar-thin">
        <div className="w-full min-w-[580px] sm:min-w-0 max-w-4xl mx-auto space-y-3 select-none font-mono text-xs px-1">
          {/* Upper Arch Labels */}
          <div className="flex justify-between items-center px-2 text-xs font-bold text-[#6B7280] uppercase tracking-wide">
            <span>Maxillary Right (UR)</span>
            <span className="text-[10px] text-gray-400 font-sans">UPPER ARCH</span>
            <span>Maxillary Left (UL)</span>
          </div>

          {/* Upper Arch Buttons */}
          <div className="flex justify-center items-center gap-1 sm:gap-2 pb-3 border-b border-[#E4E4E7]">
            {/* Upper Right Quadrant (18 -> 11) */}
            <div className="flex gap-1 sm:gap-1.5 justify-end flex-1">
              {upperRight.map((t) => {
                const active = selectedTeeth.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTooth(t)}
                    title={`Tooth ${t}`}
                    className={`flex-1 max-w-[48px] h-10 sm:h-12 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm transition cursor-pointer shrink-0 ${
                      active
                        ? "bg-[#2A5CAA] text-white shadow-md ring-2 ring-[#2A5CAA]/40 scale-105"
                        : "bg-[#F4F4F5] text-[#1C1C1E] hover:bg-[#E8EEF7] hover:text-[#2A5CAA]"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            {/* Midline Divider */}
            <div className="w-1 h-10 sm:h-12 bg-[#2A5CAA] rounded-full mx-1.5 sm:mx-2 shrink-0 opacity-60" />

            {/* Upper Left Quadrant (21 -> 28) */}
            <div className="flex gap-1 sm:gap-1.5 justify-start flex-1">
              {upperLeft.map((t) => {
                const active = selectedTeeth.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTooth(t)}
                    title={`Tooth ${t}`}
                    className={`flex-1 max-w-[48px] h-10 sm:h-12 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm transition cursor-pointer shrink-0 ${
                      active
                        ? "bg-[#2A5CAA] text-white shadow-md ring-2 ring-[#2A5CAA]/40 scale-105"
                        : "bg-[#F4F4F5] text-[#1C1C1E] hover:bg-[#E8EEF7] hover:text-[#2A5CAA]"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lower Arch Buttons */}
          <div className="flex justify-center items-center gap-1 sm:gap-2 pt-1">
            {/* Lower Right Quadrant (48 -> 41) */}
            <div className="flex gap-1 sm:gap-1.5 justify-end flex-1">
              {lowerRight.map((t) => {
                const active = selectedTeeth.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTooth(t)}
                    title={`Tooth ${t}`}
                    className={`flex-1 max-w-[48px] h-10 sm:h-12 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm transition cursor-pointer shrink-0 ${
                      active
                        ? "bg-[#2A5CAA] text-white shadow-md ring-2 ring-[#2A5CAA]/40 scale-105"
                        : "bg-[#F4F4F5] text-[#1C1C1E] hover:bg-[#E8EEF7] hover:text-[#2A5CAA]"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            {/* Midline Divider */}
            <div className="w-1 h-10 sm:h-12 bg-[#2A5CAA] rounded-full mx-1.5 sm:mx-2 shrink-0 opacity-60" />

            {/* Lower Left Quadrant (31 -> 38) */}
            <div className="flex gap-1 sm:gap-1.5 justify-start flex-1">
              {lowerLeft.map((t) => {
                const active = selectedTeeth.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTooth(t)}
                    title={`Tooth ${t}`}
                    className={`flex-1 max-w-[48px] h-10 sm:h-12 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm transition cursor-pointer shrink-0 ${
                      active
                        ? "bg-[#2A5CAA] text-white shadow-md ring-2 ring-[#2A5CAA]/40 scale-105"
                        : "bg-[#F4F4F5] text-[#1C1C1E] hover:bg-[#E8EEF7] hover:text-[#2A5CAA]"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lower Arch Labels */}
          <div className="flex justify-between items-center px-2 text-xs font-bold text-[#6B7280] uppercase tracking-wide pt-1">
            <span>Mandibular Right (LR)</span>
            <span className="text-[10px] text-gray-400 font-sans">LOWER ARCH</span>
            <span>Mandibular Left (LL)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
