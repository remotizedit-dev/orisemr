export interface TimeWindow {
  startTime: string; // "HH:MM" or "HH:MM:SS"
  endTime: string;   // "HH:MM" or "HH:MM:SS"
}

export interface BusyInterval {
  startTime: Date;
  endTime: Date;
}

export interface CandidateDoctor {
  doctorId: string;
  doctorName?: string;
  sortOrder: number;
  appointmentCountToday: number;
  windows: TimeWindow[];
  busyIntervals: BusyInterval[];
}

export interface SlotEngineOptions {
  date: string; // "YYYY-MM-DD" (Asia/Dhaka)
  totalDurationMinutes: number;
  slotGranularityMinutes?: number; // default: 10
  bookingBufferMinutes?: number;   // default: 0
  minLeadMinutes?: number;         // default: 0 (e.g. 60 for public booking)
  referenceTime?: Date;            // current time, default: new Date()
  selectedDoctorId?: string | "any";
  candidates: CandidateDoctor[];
}

export interface AvailableSlot {
  time: string; // "HH:MM" formatted (24h)
  displayTime: string; // "05:00 PM"
  startTime: Date;
  endTime: Date;
  doctorId: string;
}

/**
 * Parses "HH:MM" string and returns a Date in UTC representing that wall clock time on the target date.
 */
export function parseWallClockTimeToDate(dateStr: string, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const [year, month, day] = dateStr.split("-").map(Number);
  
  // Create UTC date representation for stable slot calculations
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
}

/**
 * Formats a Date to 12-hour display string (e.g. "05:30 PM").
 */
export function formatDisplayTime(date: Date): string {
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${formattedHours < 10 ? `0${formattedHours}` : formattedHours}:${formattedMinutes} ${ampm}`;
}

/**
 * Formats a Date to "HH:MM" 24h string.
 */
export function format24hTime(date: Date): string {
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const hStr = hours < 10 ? `0${hours}` : `${hours}`;
  const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hStr}:${mStr}`;
}

/**
 * Checks whether two half-open intervals [A, B) and [C, D) overlap.
 */
export function intervalsOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA.getTime() < endB.getTime() && startB.getTime() < endA.getTime();
}

/**
 * Pure slot calculation engine.
 * Computes available start times without side-effects or direct database calls.
 */
export function calculateAvailableSlots(options: SlotEngineOptions): AvailableSlot[] {
  const {
    date,
    totalDurationMinutes,
    slotGranularityMinutes = 10,
    bookingBufferMinutes = 0,
    minLeadMinutes = 0,
    referenceTime = new Date(),
    selectedDoctorId = "any",
    candidates,
  } = options;

  if (totalDurationMinutes <= 0 || candidates.length === 0) {
    return [];
  }

  // Filter candidates if a specific dentist was requested
  const targetDoctors =
    selectedDoctorId === "any"
      ? candidates
      : candidates.filter((c) => c.doctorId === selectedDoctorId);

  if (targetDoctors.length === 0) {
    return [];
  }

  // Minimum allowed start time
  const earliestAllowedTime = new Date(referenceTime.getTime() + minLeadMinutes * 60 * 1000);

  // Buffer in milliseconds
  const bufferMs = bookingBufferMinutes * 60 * 1000;
  const durationMs = totalDurationMinutes * 60 * 1000;
  const stepMs = slotGranularityMinutes * 60 * 1000;

  // Map to hold slots per time string: timeStr -> list of capable doctors
  const timeSlotsMap = new Map<string, { slot: AvailableSlot; candidate: CandidateDoctor }[]>();

  for (const doc of targetDoctors) {
    // Widened busy intervals with buffer
    const bufferedBusy = doc.busyIntervals.map((interval) => ({
      start: new Date(interval.startTime.getTime() - bufferMs),
      end: new Date(interval.endTime.getTime() + bufferMs),
    }));

    for (const win of doc.windows) {
      const windowStart = parseWallClockTimeToDate(date, win.startTime);
      const windowEnd = parseWallClockTimeToDate(date, win.endTime);

      if (windowEnd.getTime() <= windowStart.getTime()) {
        continue;
      }

      // Step from windowStart as long as slot finishes inside the window
      let currentStartMs = windowStart.getTime();
      const lastPossibleStartMs = windowEnd.getTime() - durationMs;

      while (currentStartMs <= lastPossibleStartMs) {
        const slotStart = new Date(currentStartMs);
        const slotEnd = new Date(currentStartMs + durationMs);

        // 1. Must be after earliest allowed time
        if (slotStart.getTime() >= earliestAllowedTime.getTime()) {
          // 2. Must not overlap any buffered busy interval
          const hasConflict = bufferedBusy.some((b) =>
            intervalsOverlap(slotStart, slotEnd, b.start, b.end)
          );

          if (!hasConflict) {
            const timeKey = format24hTime(slotStart);
            const slotItem: AvailableSlot = {
              time: timeKey,
              displayTime: formatDisplayTime(slotStart),
              startTime: slotStart,
              endTime: slotEnd,
              doctorId: doc.doctorId,
            };

            const existing = timeSlotsMap.get(timeKey) || [];
            existing.push({ slot: slotItem, candidate: doc });
            timeSlotsMap.set(timeKey, existing);
          }
        }

        currentStartMs += stepMs;
      }
    }
  }

  // Convert map to sorted list, resolving "any" doctor balancing
  const sortedTimes = Array.from(timeSlotsMap.keys()).sort();
  const result: AvailableSlot[] = [];

  for (const timeKey of sortedTimes) {
    const list = timeSlotsMap.get(timeKey)!;
    if (selectedDoctorId !== "any") {
      // Direct assignment
      result.push(list[0].slot);
    } else {
      // Load-balance: dentist with fewest appointments today, tie-breaker: sortOrder
      list.sort((a, b) => {
        if (a.candidate.appointmentCountToday !== b.candidate.appointmentCountToday) {
          return a.candidate.appointmentCountToday - b.candidate.appointmentCountToday;
        }
        return a.candidate.sortOrder - b.candidate.sortOrder;
      });

      const selected = list[0];
      result.push({
        ...selected.slot,
        doctorId: selected.candidate.doctorId,
      });
    }
  }

  return result;
}
