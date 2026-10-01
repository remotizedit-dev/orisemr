"use client";

import { useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export interface PaginationControlsProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export default function PaginationControls({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 100],
  className = "",
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startRecord = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(totalItems, safeCurrentPage * pageSize);

  // Generate page numbers with ellipsis
  const visiblePages = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "ellipsis")[] = [];

    if (safeCurrentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push("ellipsis");
      pages.push(totalPages);
    } else if (safeCurrentPage >= totalPages - 3) {
      pages.push(1);
      pages.push("ellipsis");
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("ellipsis");
      pages.push(safeCurrentPage - 1);
      pages.push(safeCurrentPage);
      pages.push(safeCurrentPage + 1);
      pages.push("ellipsis");
      pages.push(totalPages);
    }

    return pages;
  }, [safeCurrentPage, totalPages]);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 bg-white/70 backdrop-blur-md rounded-2xl border border-[#E4E4E7] shadow-2xs ${className}`}
    >
      {/* Left: Record summary */}
      <div className="text-xs sm:text-sm text-[#4B5563] font-medium flex items-center gap-1.5 order-2 sm:order-1">
        <span>Showing</span>
        <strong className="font-mono font-bold text-[#1C1C1E]">
          {startRecord}
        </strong>
        <span>to</span>
        <strong className="font-mono font-bold text-[#1C1C1E]">{endRecord}</strong>
        <span>of</span>
        <strong className="font-mono font-bold text-[#1C1C1E]">{totalItems}</strong>
        <span>records</span>
      </div>

      {/* Right: Page Size Selector + Pagination Buttons */}
      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 order-1 sm:order-2 w-full sm:w-auto">
        {/* Rows per page selector */}
        {onPageSizeChange && pageSizeOptions && pageSizeOptions.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
            <span className="font-semibold hidden xs:inline">Per page:</span>
            <div className="inline-flex items-center bg-[#F4F4F5] p-1 rounded-xl border border-[#E4E4E7]">
              {pageSizeOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    if (opt !== pageSize) {
                      onPageSizeChange(opt);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer font-mono ${
                    pageSize === opt
                      ? "bg-[#2A5CAA] text-white shadow-2xs"
                      : "text-[#4B5563] hover:text-[#1C1C1E]"
                  }`}
                  title={`Show ${opt} items per page`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Page Nav Buttons */}
        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={safeCurrentPage <= 1}
            className="p-1.5 rounded-xl border border-[#E4E4E7] bg-white text-[#4B5563] hover:bg-[#F4F4F5] hover:text-[#1C1C1E] disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
            title="First Page"
            aria-label="First Page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Previous Page */}
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage <= 1}
            className="p-1.5 rounded-xl border border-[#E4E4E7] bg-white text-[#4B5563] hover:bg-[#F4F4F5] hover:text-[#1C1C1E] disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
            title="Previous Page"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Numbered page pills */}
          <div className="hidden sm:flex items-center gap-1">
            {visiblePages.map((page, idx) => {
              if (page === "ellipsis") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-2 py-1 text-xs text-[#8E8E93] font-bold"
                  >
                    …
                  </span>
                );
              }
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => onPageChange(page)}
                  className={`min-w-8 h-8 px-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer flex items-center justify-center ${
                    page === safeCurrentPage
                      ? "bg-[#2A5CAA] text-white shadow-xs"
                      : "bg-white border border-[#E4E4E7] text-[#4B5563] hover:bg-[#F4F4F5] hover:text-[#1C1C1E]"
                  }`}
                  title={`Go to page ${page}`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          {/* Mobile Current Page Indicator */}
          <span className="sm:hidden px-2 text-xs font-mono font-bold text-[#1C1C1E]">
            {safeCurrentPage} / {totalPages}
          </span>

          {/* Next Page */}
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= totalPages}
            className="p-1.5 rounded-xl border border-[#E4E4E7] bg-white text-[#4B5563] hover:bg-[#F4F4F5] hover:text-[#1C1C1E] disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
            title="Next Page"
            aria-label="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last Page */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={safeCurrentPage >= totalPages}
            className="p-1.5 rounded-xl border border-[#E4E4E7] bg-white text-[#4B5563] hover:bg-[#F4F4F5] hover:text-[#1C1C1E] disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
            title="Last Page"
            aria-label="Last Page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
