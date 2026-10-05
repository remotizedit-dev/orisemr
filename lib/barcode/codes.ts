export type RecordPrefix = "APT" | "RX" | "INV" | "RPT";

/**
 * Formats a record code: {PREFIX}-{SHORT_CODE}-{SEQ6}
 * e.g. generateRecordCode("INV", "DDC", 123) -> "INV-DDC-000123"
 */
export function generateRecordCode(
  prefix: RecordPrefix,
  shortCode: string,
  sequence: number | bigint
): string {
  const cleanShortCode = shortCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const seqNumber = typeof sequence === "bigint" ? Number(sequence) : sequence;
  const seqPadded = seqNumber.toString().padStart(6, "0");
  return `${prefix}-${cleanShortCode}-${seqPadded}`;
}

/**
 * Generates an auto-generated patient card number from the CARD counter:
 * Format: "1" followed by (minLen - 1) digits zero-padded.
 * e.g. counter = 1, minLen = 10 -> "1000000001"
 */
export function generateAutoCardNumber(
  counter: number | bigint,
  minLen: number = 10
): string {
  const seqNumber = typeof counter === "bigint" ? Number(counter) : counter;
  const paddingLength = Math.max(minLen - 1, 9);
  const padded = seqNumber.toString().padStart(paddingLength, "0");
  return `1${padded}`;
}

export interface ParsedRecordCode {
  isValid: boolean;
  prefix?: RecordPrefix;
  shortCode?: string;
  sequence?: number;
  raw: string;
}

/**
 * Parses and validates an Oris record code string.
 */
export function parseRecordCode(input: string): ParsedRecordCode {
  if (!input) return { isValid: false, raw: "" };
  const trimmed = input.trim().toUpperCase();

  const match = trimmed.match(/^(APT|RX|INV|RPT)-([A-Z0-9]{2,6})-(\d{6,})$/);
  if (!match) {
    return { isValid: false, raw: trimmed };
  }

  return {
    isValid: true,
    prefix: match[1] as RecordPrefix,
    shortCode: match[2],
    sequence: parseInt(match[3], 10),
    raw: trimmed,
  };
}

/**
 * Returns a doctor prefix letter ('A', 'B', 'C' ... 'Z', 'AA', 'AB'...)
 * based on doctor index among active clinic doctors.
 */
export function getDoctorPrefixLetter(doctorIndex: number): string {
  if (doctorIndex < 0) return "Q";
  let prefix = "";
  let num = doctorIndex;
  while (num >= 0) {
    prefix = String.fromCharCode(65 + (num % 26)) + prefix;
    num = Math.floor(num / 26) - 1;
  }
  return prefix;
}

/**
 * Formats doctor-scoped serial token code: e.g. "A-01", "B-03"
 */
export function formatDoctorSerialCode(prefixLetter: string, serialNo: number): string {
  const padded = String(serialNo).padStart(2, "0");
  return `${prefixLetter}-${padded}`;
}

