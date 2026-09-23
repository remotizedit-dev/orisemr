"use client";

import { useState } from "react";

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

  return (
    <div className="space-y-3 p-3 rounded-xl bg-white border border-[#E4E4E7]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#1C1C1E] uppercase tracking-wider">
          FDI Tooth Chart {selectedTeeth.length > 0 && `(${selectedTeeth.join(", ")})`}
        </span>
        <button
          type="button"
          onClick={() => setIsPrimary(!isPrimary)}
          className="text-[11px] font-semibold text-[#2A5CAA] hover:underline cursor-pointer"
        >
          {isPrimary ? "Switch to Adult Permanent (11–48)" : "Switch to Primary / Milk (51–85)"}
        </button>
      </div>

      <div className="space-y-1.5 select-none font-mono text-xs">
        {/* Upper Arch */}
        <div className="flex justify-center items-center gap-1 border-b border-[#E4E4E7] pb-1.5">
          <div className="flex gap-1 justify-end">
            {upperRight.map((t) => {
              const active = selectedTeeth.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTooth(t)}
                  className={`w-6 h-7 rounded flex items-center justify-center font-bold text-[11px] transition cursor-pointer ${
                    active
                      ? "bg-[#2A5CAA] text-white shadow-xs"
                      : "bg-[#F4F4F5] text-[#1C1C1E] hover:bg-[#E8EEF7]"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>

          <div className="w-px h-6 bg-[#6B7280]/40 mx-0.5" />

          <div className="flex gap-1 justify-start">
            {upperLeft.map((t) => {
              const active = selectedTeeth.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTooth(t)}
                  className={`w-6 h-7 rounded flex items-center justify-center font-bold text-[11px] transition cursor-pointer ${
                    active
                      ? "bg-[#2A5CAA] text-white shadow-xs"
                      : "bg-[#F4F4F5] text-[#1C1C1E] hover:bg-[#E8EEF7]"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lower Arch */}
        <div className="flex justify-center items-center gap-1 pt-0.5">
          <div className="flex gap-1 justify-end">
            {lowerRight.map((t) => {
              const active = selectedTeeth.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTooth(t)}
                  className={`w-6 h-7 rounded flex items-center justify-center font-bold text-[11px] transition cursor-pointer ${
                    active
                      ? "bg-[#2A5CAA] text-white shadow-xs"
                      : "bg-[#F4F4F5] text-[#1C1C1E] hover:bg-[#E8EEF7]"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>

          <div className="w-px h-6 bg-[#6B7280]/40 mx-0.5" />

          <div className="flex gap-1 justify-start">
            {lowerLeft.map((t) => {
              const active = selectedTeeth.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTooth(t)}
                  className={`w-6 h-7 rounded flex items-center justify-center font-bold text-[11px] transition cursor-pointer ${
                    active
                      ? "bg-[#2A5CAA] text-white shadow-xs"
                      : "bg-[#F4F4F5] text-[#1C1C1E] hover:bg-[#E8EEF7]"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
