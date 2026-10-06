import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines Tailwind classes cleanly with conflict resolution.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes a Bangladeshi mobile number into standard 11-digit format (01XXXXXXXXX).
 * Accepts:
 *   - +8801XXXXXXXXX
 *   - 8801XXXXXXXXX
 *   - 01XXXXXXXXX
 * Validates prefixes for all Bangladeshi operators (GP 017/013, Robi/Airtel 018/016, BL 019/014, Teletalk 015).
 * Returns null if invalid.
 */
export function normalizeBdPhone(input: string): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  let normalized = digits;

  if (digits.startsWith("880") && digits.length === 13) {
    normalized = digits.slice(2);
  } else if (digits.startsWith("88") && digits.length === 13) {
    normalized = digits.slice(2);
  }

  // Must match strict Bangladeshi 11-digit mobile format: 01[3-9]XXXXXXXX
  const bdRegex = /^01[3-9]\d{8}$/;
  if (bdRegex.test(normalized)) {
    return normalized;
  }
  return null;
}

/**
 * Formats an 11-digit BD mobile number for visual display: e.g. "01712-345678"
 */
export function formatBdPhone(phone: string): string {
  const normalized = normalizeBdPhone(phone);
  if (!normalized) return phone;
  return `${normalized.slice(0, 5)}-${normalized.slice(5)}`;
}

/**
 * Formats an integer whole-Taka amount into Bangladeshi currency standard: e.g. "৳1,500" or "৳1,25,000"
 */
export function formatBdt(amountInTaka: number | null | undefined): string {
  if (amountInTaka === null || amountInTaka === undefined || isNaN(amountInTaka)) {
    return "৳0";
  }
  const isNegative = amountInTaka < 0;
  const absVal = Math.abs(Math.round(amountInTaka)).toString();

  // Bangladeshi / Indian numbering format: last 3 digits, then groups of 2 digits
  let result = "";
  if (absVal.length > 3) {
    const lastThree = absVal.slice(-3);
    const rest = absVal.slice(0, -3);
    const restFormatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    result = `${restFormatted},${lastThree}`;
  } else {
    result = absVal;
  }

  return `${isNegative ? "-" : ""}৳${result}`;
}

/**
 * Formats payment method identifiers into official brand capitalization standard (e.g. "bKash", "Nagad", "Cash").
 */
export function formatPaymentMethod(method: string | null | undefined): string {
  if (!method) return "—";
  const m = method.toLowerCase().trim();
  if (m === "bkash") return "bKash";
  if (m === "nagad") return "Nagad";
  if (m === "rocket") return "Rocket";
  if (m === "cash") return "Cash";
  if (m === "card") return "Card / POS";
  if (m === "bank_transfer") return "Bank Transfer";
  return method.charAt(0).toUpperCase() + method.slice(1);
}

/**
 * Formats a given date to Asia/Dhaka time zone standard string.
 * Supports:
 * - "hh:mm" or "hh:mm a": returns 12-hour formatted time (e.g. "06:00 PM")
 * - "dd MMM yyyy": returns date only (e.g. "24 Sep 2026")
 * - "dd MMM yyyy, hh:mm a" (default): returns full date and time (e.g. "24 Sep 2026, 06:00 PM")
 */
export function formatDhakaDate(
  date: Date | string | number | null | undefined,
  formatStr: string = "dd MMM yyyy, hh:mm a"
): string {
  if (!date) return "";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  if (formatStr === "hh:mm" || formatStr === "hh:mm a") {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Dhaka",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  }

  if (formatStr === "dd MMM yyyy") {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Formats a given date/time to Asia/Dhaka 12-hour time string e.g. "06:00 PM"
 */
export function formatDhakaTime(date: Date | string | number | null | undefined): string {
  return formatDhakaDate(date, "hh:mm a");
}

/**
 * Generates an alphanumeric secure random token.
 */
export function generateRandomCode(length: number = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Dhaka (+06:00) timezone.
 */
export function getDhakaTodayStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Adds days to a date in Asia/Dhaka timezone and returns YYYY-MM-DD.
 */
export function addDhakaDays(baseDateStrOrDate: string | Date, days: number): string {
  const baseStr =
    typeof baseDateStrOrDate === "string"
      ? baseDateStrOrDate
      : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(baseDateStrOrDate);
  const [y, m, d] = baseStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0];
}

/**
 * Adds months to a date in Asia/Dhaka timezone and returns YYYY-MM-DD.
 */
export function addDhakaMonths(baseDateStrOrDate: string | Date, months: number): string {
  const baseStr =
    typeof baseDateStrOrDate === "string"
      ? baseDateStrOrDate
      : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(baseDateStrOrDate);
  const [y, m, d] = baseStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, d));
  return date.toISOString().split("T")[0];
}

/**
 * Formats a doctor's name cleanly, ensuring no duplicate titles like "Dr. Dr. Shihab" or "Dr. Shihab Shihab".
 */
export function formatDoctorName(name: string | null | undefined, title?: string | null): string {
  if (!name) return "Doctor";
  let cleanName = name.trim();
  // Strip any leading "Dr.", "Dr", "Doctor" repeated instances
  cleanName = cleanName.replace(/^(?:(?:Dr\.|Dr|Doctor)\s+)+/gi, "").trim();

  let effectiveTitle = (title || "").trim();
  if (effectiveTitle) {
    // Strip leading "Dr." from title if present
    effectiveTitle = effectiveTitle.replace(/^(?:(?:Dr\.|Dr|Doctor)\s+)+/gi, "").trim();
    if (!effectiveTitle) {
      effectiveTitle = "Dr.";
    } else {
      // If the title contains or matches the doctor's name (e.g. title was stored as "Dr. Shihab" or "Shihab"),
      // revert to default "Dr." to prevent "Dr. Shihab Shihab"
      const nameParts = cleanName.toLowerCase().split(/\s+/).filter(Boolean);
      const titleParts = effectiveTitle.toLowerCase().split(/\s+/).filter(Boolean);
      const isNameContained = titleParts.length > 0 && titleParts.every((tp) => nameParts.includes(tp));
      if (isNameContained) {
        effectiveTitle = "Dr.";
      } else if (!effectiveTitle.toLowerCase().startsWith("dr") && !effectiveTitle.toLowerCase().startsWith("prof")) {
        effectiveTitle = `Dr. ${effectiveTitle}`;
      }
    }
  } else {
    effectiveTitle = "Dr.";
  }

  if (/^dr$/i.test(effectiveTitle)) {
    effectiveTitle = "Dr.";
  }

  // Deduplicate consecutive repeated words in cleanName (e.g. "Shihab Shihab" -> "Shihab")
  const words = cleanName.split(/\s+/).filter(Boolean);
  const dedupedWords: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (i === 0 || words[i].toLowerCase() !== words[i - 1].toLowerCase()) {
      dedupedWords.push(words[i]);
    }
  }
  cleanName = dedupedWords.join(" ");

  if (cleanName.toLowerCase().startsWith(effectiveTitle.toLowerCase())) {
    return cleanName;
  }

  return `${effectiveTitle} ${cleanName}`.trim();
}

/**
 * Masks patient names for public displays (e.g. Smart TV screens) to preserve privacy.
 * E.g. "QA Echo" -> "Q. Echo", "Sabrina Ahmed" -> "S. Ahmed", "Rahim" -> "R***m"
 */
export function maskPatientName(name: string | null | undefined): string {
  if (!name) return "Patient";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    const single = parts[0];
    if (single.length <= 2) return single;
    return `${single.charAt(0)}***${single.slice(-1)}`;
  }
  const firstInitial = parts[0].charAt(0).toUpperCase();
  const rest = parts.slice(1).join(" ");
  return `${firstInitial}. ${rest}`;
}

