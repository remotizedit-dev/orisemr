import { describe, expect, it } from "vitest";
import { formatBdPhone, formatBdt, normalizeBdPhone } from "@/lib/utils";

describe("Utility Functions Unit Tests", () => {
  describe("Bangladeshi Phone Normalization", () => {
    it("Normalizes +88017... to 017...", () => {
      expect(normalizeBdPhone("+8801712345678")).toBe("01712345678");
    });

    it("Normalizes 88018... to 018...", () => {
      expect(normalizeBdPhone("8801812345678")).toBe("01812345678");
    });

    it("Accepts valid 11-digit 019...", () => {
      expect(normalizeBdPhone("01912345678")).toBe("01912345678");
    });

    it("Formats BD phone for display", () => {
      expect(formatBdPhone("01712345678")).toBe("01712-345678");
    });

    it("Rejects non-BD numbers or invalid prefixes", () => {
      expect(normalizeBdPhone("01212345678")).toBeNull(); // 012 is invalid operator prefix
      expect(normalizeBdPhone("123456789")).toBeNull(); // too short
      expect(normalizeBdPhone("+14155552671")).toBeNull(); // US number
    });
  });

  describe("Whole-Taka BDT Formatting", () => {
    it("Formats zero", () => {
      expect(formatBdt(0)).toBe("৳0");
    });

    it("Formats standard thousands and lakhs with Indian/Bangladeshi grouping", () => {
      expect(formatBdt(1500)).toBe("৳1,500");
      expect(formatBdt(25000)).toBe("৳25,000");
      expect(formatBdt(100000)).toBe("৳1,00,000");
      expect(formatBdt(1250000)).toBe("৳12,50,000");
    });

    it("Handles null or undefined gracefully", () => {
      expect(formatBdt(null)).toBe("৳0");
      expect(formatBdt(undefined)).toBe("৳0");
    });
  });
});
