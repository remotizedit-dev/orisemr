import { db } from "@/db";
import * as schema from "@/db/schema";
import { Layers, Stethoscope, Pill, MessageSquare } from "lucide-react";

export default async function PlatformCatalogPage() {
  const categories = await db.select().from(schema.masterServiceCategories);
  const services = await db.select().from(schema.masterServices);
  const medicines = await db.select().from(schema.masterMedicines);
  const dosagePatterns = await db.select().from(schema.masterDosagePatterns);
  const adviceTemplates = await db.select().from(schema.masterAdviceTemplates);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
          Master Catalogs &amp; Templates
        </h1>
        <p className="text-sm text-[#6B7280]">
          Global templates replicated into every newly created dental chamber.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Services & Categories Card */}
        <div className="glass-panel p-5 rounded-2xl border border-[#E4E4E7] space-y-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-[#2A5CAA]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#1C1C1E]">
              Services ({services.length})
            </h2>
          </div>
          <p className="text-xs text-[#6B7280]">
            Organized across {categories.length} clinical categories. Seeding default duration and online bookability.
          </p>
          <div className="max-h-80 overflow-y-auto divide-y divide-[#E4E4E7] text-xs">
            {services.slice(0, 15).map((s) => (
              <div key={s.id} className="py-2 flex justify-between">
                <span className="font-semibold text-[#1C1C1E]">{s.name}</span>
                <span className="text-[#6B7280]">{s.durationMinutes}m</span>
              </div>
            ))}
            {services.length > 15 && (
              <div className="py-2 text-center text-[#2A5CAA] font-semibold">
                + {services.length - 15} more services
              </div>
            )}
          </div>
        </div>

        {/* Medicines Card */}
        <div className="glass-panel p-5 rounded-2xl border border-[#E4E4E7] space-y-3">
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-[#30D158]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#1C1C1E]">
              Medicines ({medicines.length})
            </h2>
          </div>
          <p className="text-xs text-[#6B7280]">
            Brand formulations and generic dental medications with drug class safety mappings.
          </p>
          <div className="max-h-80 overflow-y-auto divide-y divide-[#E4E4E7] text-xs">
            {medicines.slice(0, 15).map((m) => (
              <div key={m.id} className="py-2 flex justify-between">
                <div>
                  <span className="font-bold text-[#1C1C1E]">
                    {m.brandName || m.genericName}
                  </span>
                  {m.brandName && (
                    <span className="text-[#6B7280] block text-[11px]">
                      {m.genericName}
                    </span>
                  )}
                </div>
                <span className="text-[#6B7280] capitalize text-[11px] font-mono">
                  {m.form}
                </span>
              </div>
            ))}
            {medicines.length > 15 && (
              <div className="py-2 text-center text-[#2A5CAA] font-semibold">
                + {medicines.length - 15} more medicines
              </div>
            )}
          </div>
        </div>

        {/* Prescription Presets Card */}
        <div className="glass-panel p-5 rounded-2xl border border-[#E4E4E7] space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#FF9F0A]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#1C1C1E]">
              Presets &amp; Bangla Advice
            </h2>
          </div>
          <p className="text-xs text-[#6B7280]">
            {dosagePatterns.length} Bangla dosage patterns and {adviceTemplates.length} grouped advice guidelines.
          </p>
          <div className="max-h-80 overflow-y-auto space-y-2 text-xs">
            <span className="font-bold text-[#1C1C1E] block">Dosage Chips:</span>
            <div className="flex flex-wrap gap-1.5">
              {dosagePatterns.slice(0, 12).map((d) => (
                <span
                  key={d.id}
                  className="px-2 py-1 rounded bg-white border border-[#E4E4E7] text-[#1C1C1E] font-medium"
                >
                  {d.labelBn}
                </span>
              ))}
            </div>
            <span className="font-bold text-[#1C1C1E] block pt-2">Advice Groups:</span>
            <div className="space-y-1">
              {Array.from(new Set(adviceTemplates.map((a) => a.groupName))).map((grp) => (
                <div key={grp} className="px-2 py-1 rounded bg-[#F4F4F5] text-[#1C1C1E] font-medium text-[11px]">
                  {grp}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
