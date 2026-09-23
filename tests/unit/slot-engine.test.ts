import { describe, expect, it } from "vitest";
import {
  calculateAvailableSlots,
  parseWallClockTimeToDate,
  type CandidateDoctor,
} from "@/lib/scheduling/slot-engine";

describe("Slot Engine Unit Tests", () => {
  it("Worked example from specification: 17:00-23:00, 30 min Root Canal, 10 min granularity", () => {
    // Clinic hours 17:00 to 23:00
    // Patient A has an appointment at 17:00-17:30
    const testDate = "2026-10-01";
    const dentistId = "dentist-1";

    const doctor: CandidateDoctor = {
      doctorId: dentistId,
      sortOrder: 1,
      appointmentCountToday: 1,
      windows: [{ startTime: "17:00", endTime: "23:00" }],
      busyIntervals: [
        {
          startTime: parseWallClockTimeToDate(testDate, "17:00"),
          endTime: parseWallClockTimeToDate(testDate, "17:30"),
        },
      ],
    };

    const slots = calculateAvailableSlots({
      date: testDate,
      totalDurationMinutes: 30, // 30 min root canal or consultation
      slotGranularityMinutes: 10,
      bookingBufferMinutes: 0,
      minLeadMinutes: 0,
      referenceTime: parseWallClockTimeToDate(testDate, "08:00"), // morning
      selectedDoctorId: dentistId,
      candidates: [doctor],
    });

    expect(slots.length).toBeGreaterThan(0);
    // The earliest available time must be 17:30, NOT 17:00, 17:10, or 17:20
    expect(slots[0].time).toBe("17:30");
    expect(slots[0].displayTime).toBe("05:30 PM");

    // The second slot with 10 min granularity should be 17:40
    expect(slots[1].time).toBe("17:40");

    // The last slot for a 30 min service in a window ending at 23:00 is 22:30
    expect(slots[slots.length - 1].time).toBe("22:30");
  });

  it("Honors booking_buffer_minutes padding around existing appointments", () => {
    const testDate = "2026-10-01";
    const dentistId = "dentist-buffer-test";

    // Appointment 18:00 to 18:30 with 15 min buffer
    // Widened busy interval is 17:45 to 18:45
    const doctor: CandidateDoctor = {
      doctorId: dentistId,
      sortOrder: 1,
      appointmentCountToday: 1,
      windows: [{ startTime: "17:00", endTime: "21:00" }],
      busyIntervals: [
        {
          startTime: parseWallClockTimeToDate(testDate, "18:00"),
          endTime: parseWallClockTimeToDate(testDate, "18:30"),
        },
      ],
    };

    const slots = calculateAvailableSlots({
      date: testDate,
      totalDurationMinutes: 30,
      slotGranularityMinutes: 10,
      bookingBufferMinutes: 15, // 15 min buffer
      referenceTime: parseWallClockTimeToDate(testDate, "08:00"),
      selectedDoctorId: dentistId,
      candidates: [doctor],
    });

    // 17:00 to 17:30 is valid (finishes before 17:45)
    expect(slots.some((s) => s.time === "17:00")).toBe(true);
    expect(slots.some((s) => s.time === "17:10")).toBe(true);

    // 17:20 would end at 17:50, overlapping the 17:45 buffer -> invalid
    expect(slots.some((s) => s.time === "17:20")).toBe(false);

    // Any slot starting before 18:45 is invalid
    expect(slots.some((s) => s.time === "18:30")).toBe(false);
    expect(slots.some((s) => s.time === "18:40")).toBe(false);

    // 18:50 is valid (starts after 18:45)
    expect(slots.some((s) => s.time === "18:50")).toBe(true);
  });

  it("Supports split shifts (multiple windows per day)", () => {
    const testDate = "2026-10-01";
    const doctor: CandidateDoctor = {
      doctorId: "dentist-split",
      sortOrder: 1,
      appointmentCountToday: 0,
      windows: [
        { startTime: "10:00", endTime: "13:00" },
        { startTime: "17:00", endTime: "21:00" },
      ],
      busyIntervals: [],
    };

    const slots = calculateAvailableSlots({
      date: testDate,
      totalDurationMinutes: 30,
      slotGranularityMinutes: 30,
      bookingBufferMinutes: 0,
      referenceTime: parseWallClockTimeToDate(testDate, "08:00"),
      selectedDoctorId: "dentist-split",
      candidates: [doctor],
    });

    const times = slots.map((s) => s.time);
    // Morning shift
    expect(times).toContain("10:00");
    expect(times).toContain("12:00");
    expect(times).toContain("12:30");
    // Afternoon break (no slots between 13:00 and 17:00)
    expect(times).not.toContain("13:00");
    expect(times).not.toContain("14:00");
    expect(times).not.toContain("16:30");
    // Evening shift
    expect(times).toContain("17:00");
    expect(times).toContain("20:30");
  });

  it("Balances 'any' dentist selection towards doctor with fewest appointments", () => {
    const testDate = "2026-10-01";

    const busyDoctor: CandidateDoctor = {
      doctorId: "doc-busy",
      sortOrder: 1,
      appointmentCountToday: 5,
      windows: [{ startTime: "17:00", endTime: "20:00" }],
      busyIntervals: [],
    };

    const freeDoctor: CandidateDoctor = {
      doctorId: "doc-free",
      sortOrder: 2,
      appointmentCountToday: 1,
      windows: [{ startTime: "17:00", endTime: "20:00" }],
      busyIntervals: [],
    };

    const slots = calculateAvailableSlots({
      date: testDate,
      totalDurationMinutes: 30,
      slotGranularityMinutes: 30,
      selectedDoctorId: "any",
      referenceTime: parseWallClockTimeToDate(testDate, "08:00"),
      candidates: [busyDoctor, freeDoctor],
    });

    // For all common slots, freeDoctor should be assigned due to fewer appointments
    for (const slot of slots) {
      expect(slot.doctorId).toBe("doc-free");
    }
  });
});
