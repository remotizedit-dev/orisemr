"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Plus, X } from "lucide-react";

interface SuggestionItem {
  id: string;
  text: string;
}

interface ClinicalAutocompleteInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  suggestions: SuggestionItem[];
  isTextarea?: boolean;
  rows?: number;
  badgeCount?: number;
}

export function ClinicalAutocompleteInput({
  label,
  value,
  onChange,
  placeholder,
  suggestions = [],
  isTextarea = true,
  rows = 2,
}: ClinicalAutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Filter suggestions based on active typed input query
  const matchingSuggestions = suggestions.filter((s) => {
    if (!filterQuery.trim()) return false;
    return s.text.toLowerCase().includes(filterQuery.toLowerCase());
  }).slice(0, 8);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    // Extract the current typing word / fragment after the last comma
    const parts = val.split(/[,;\n]/);
    const lastPart = parts[parts.length - 1]?.trim() || "";
    setFilterQuery(lastPart);
    setHighlightIndex(0);

    if (lastPart.length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const applySuggestion = (suggestionText: string) => {
    const currentVal = value.trim();
    if (!currentVal) {
      onChange(suggestionText);
    } else {
      // If user was typing the end, replace the active partial match or append
      const parts = value.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean);
      // If the last part is a substring of the suggestion, replace last part
      const lastPart = parts[parts.length - 1] || "";
      if (lastPart && suggestionText.toLowerCase().includes(lastPart.toLowerCase())) {
        parts[parts.length - 1] = suggestionText;
        onChange(parts.join(", "));
      } else {
        onChange(`${currentVal}, ${suggestionText}`);
      }
    }
    setIsOpen(false);
    setFilterQuery("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || matchingSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % matchingSuggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 + matchingSuggestions.length) % matchingSuggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (matchingSuggestions[highlightIndex]) {
        e.preventDefault();
        applySuggestion(matchingSuggestions[highlightIndex].text);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Top 4 quick suggestion pills for 1-click addition
  const quickPills = suggestions.slice(0, 4);

  return (
    <div ref={containerRef} className="space-y-1.5 relative">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1E]">
          {label}
        </label>
        {suggestions.length > 0 && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-[11px] font-bold text-[#2A5CAA] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Search className="w-3 h-3" />
            <span>Browse Templates ({suggestions.length})</span>
          </button>
        )}
      </div>

      <div className="relative">
        {isTextarea ? (
          <textarea
            ref={inputRef as any}
            rows={rows}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full p-3 rounded-xl border border-[#E4E4E7] bg-white text-sm focus:outline-none focus:border-[#2A5CAA] shadow-2xs font-medium leading-relaxed transition"
          />
        ) : (
          <input
            ref={inputRef as any}
            type="text"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E4E7] bg-white text-sm focus:outline-none focus:border-[#2A5CAA] shadow-2xs font-medium transition"
          />
        )}

        {/* Floating Autocomplete Dropdown */}
        {isOpen && matchingSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-white rounded-2xl border border-[#2A5CAA]/30 shadow-xl overflow-hidden divide-y divide-[#E4E4E7] animate-in fade-in-50 duration-150">
            <div className="px-3 py-1.5 bg-[#EBF2FC] text-[11px] font-bold text-[#2A5CAA] flex items-center justify-between">
              <span>Matching Templates (Press Enter to insert)</span>
              <span className="font-mono text-[10px]">{matchingSuggestions.length} found</span>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {matchingSuggestions.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => applySuggestion(item.text)}
                  className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                    idx === highlightIndex ? "bg-[#2A5CAA] text-white" : "text-[#1C1C1E] hover:bg-[#F4F4F5]"
                  }`}
                >
                  <span>{item.text}</span>
                  <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${
                    idx === highlightIndex ? "bg-white/20 text-white" : "bg-[#F4F4F5] text-[#6B7280]"
                  }`}>
                    Insert ↵
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Clickable Chips */}
      {quickPills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {quickPills.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => applySuggestion(q.text)}
              className="px-2 py-0.5 rounded-lg bg-[#F4F4F5] hover:bg-[#E8EEF7] text-[11px] font-semibold text-[#4B5563] hover:text-[#2A5CAA] transition cursor-pointer border border-[#E4E4E7]/60"
            >
              + {q.text}
            </button>
          ))}
        </div>
      )}

      {/* Full Browse Modal for when clinic has 100+ or 1,000 records */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 border border-[#E4E4E7] shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-[#E4E4E7]">
              <div>
                <h3 className="font-extrabold text-base text-[#1C1C1E]">
                  Browse {label} Templates
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Search across all {suggestions.length} chamber clinical templates
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-[#6B7280] hover:text-[#1C1C1E] hover:bg-[#F4F4F5] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-3" />
              <input
                type="text"
                autoFocus
                placeholder="Search templates..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E4E4E7] text-sm focus:outline-none focus:border-[#2A5CAA]"
              />
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-[#F4F4F5] rounded-xl border border-[#E4E4E7]">
              {suggestions
                .filter((s) => !filterQuery || s.text.toLowerCase().includes(filterQuery.toLowerCase()))
                .map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      applySuggestion(s.text);
                      setIsModalOpen(false);
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-[#1C1C1E] hover:bg-[#E8EEF7] hover:text-[#2A5CAA] flex items-center justify-between transition cursor-pointer"
                  >
                    <span>{s.text}</span>
                    <Plus className="w-3.5 h-3.5 text-[#2A5CAA] shrink-0" />
                  </button>
                ))}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#F4F4F5] text-xs font-bold text-[#1C1C1E] hover:bg-[#E4E4E7] cursor-pointer"
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
