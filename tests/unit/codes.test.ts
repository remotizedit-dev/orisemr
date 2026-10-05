import { describe, expect, it } from "vitest";
import {
  generateAutoCardNumber,
  generateRecordCode,
  parseRecordCode,
  getDoctorPrefixLetter,
  formatDoctorSerialCode,
} from "@/lib/barcode/codes";

describe("Record Code Generation & Parsing Tests", () => {
  it("Generates exact invoice, rx, appointment, and report codes", () => {
    expect(generateRecordCode("INV", "DDC", 123)).toBe("INV-DDC-000123");
    expect(generateRecordCode("RX", "DDC", 5)).toBe("RX-DDC-000005");
    expect(generateRecordCode("APT", "ORIS", 9999)).toBe("APT-ORIS-009999");
    expect(generateRecordCode("RPT", "DDC", 1)).toBe("RPT-DDC-000001");
  });

  it("Generates auto card number starting with 1 and zero padded to 10 digits", () => {
    expect(generateAutoCardNumber(1, 10)).toBe("1000000001");
    expect(generateAutoCardNumber(25, 10)).toBe("1000000025");
    expect(generateAutoCardNumber(12345, 10)).toBe("1000012345");
  });

  it("Parses valid record codes", () => {
    const parsed = parseRecordCode("INV-DDC-000123");
    expect(parsed.isValid).toBe(true);
    expect(parsed.prefix).toBe("INV");
    expect(parsed.shortCode).toBe("DDC");
    expect(parsed.sequence).toBe(123);
  });

  it("Rejects malformed codes", () => {
    expect(parseRecordCode("RANDOM-TEXT").isValid).toBe(false);
    expect(parseRecordCode("INV-D-12").isValid).toBe(false); // short code too short
    expect(parseRecordCode("XYZ-DDC-000123").isValid).toBe(false); // unknown prefix
  });

  it("Generates doctor prefix letters correctly (A, B, C... Z, AA)", () => {
    expect(getDoctorPrefixLetter(0)).toBe("A");
    expect(getDoctorPrefixLetter(1)).toBe("B");
    expect(getDoctorPrefixLetter(2)).toBe("C");
    expect(getDoctorPrefixLetter(25)).toBe("Z");
    expect(getDoctorPrefixLetter(26)).toBe("AA");
    expect(getDoctorPrefixLetter(-1)).toBe("Q");
  });

  it("Formats doctor-scoped serial tokens properly (e.g. A-01, B-03)", () => {
    expect(formatDoctorSerialCode("A", 1)).toBe("A-01");
    expect(formatDoctorSerialCode("A", 12)).toBe("A-12");
    expect(formatDoctorSerialCode("B", 3)).toBe("B-03");
    expect(formatDoctorSerialCode("C", 105)).toBe("C-105");
  });
});
