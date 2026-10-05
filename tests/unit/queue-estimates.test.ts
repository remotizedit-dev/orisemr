import { describe, it, expect } from "vitest";
import { calculateQueueEstimates, type QueueEstimateInputItem } from "@/lib/queue-estimates";

describe("Queue Estimates Engine", () => {
  it("shows next SL within ~20 mins when active patient entered chair with 20 min service", () => {
    const now = new Date("2026-10-05T10:00:00Z");
    const items: QueueEstimateInputItem[] = [
      {
        id: "chair-1",
        status: "in_chair",
        serialNo: 1,
        patientName: "Patient One",
        inChairAt: "2026-10-05T10:00:00Z", // just entered
        estimatedDurationMinutes: 20,
      },
      {
        id: "wait-1",
        status: "waiting",
        serialNo: 2,
        patientName: "Patient Two",
        estimatedDurationMinutes: 15,
      },
    ];

    const result = calculateQueueEstimates(items, now);

    const chairEstimate = result.inChairEstimates.get("chair-1");
    expect(chairEstimate?.remainingMinutes).toBe(20);
    expect(chairEstimate?.isOverrun).toBe(false);

    const waitEstimate = result.waitingEstimates.get("wait-1");
    expect(waitEstimate?.estimatedWaitMinutes).toBe(20);
    expect(waitEstimate?.badgeText).toBe("Within ~20 mins");
  });

  it("shows next SL within ~10 mins if 20 mins pass without calling next patient (overrun buffer)", () => {
    // 20 minutes elapsed since chair entry
    const now = new Date("2026-10-05T10:20:00Z");
    const items: QueueEstimateInputItem[] = [
      {
        id: "chair-1",
        status: "in_chair",
        serialNo: 1,
        patientName: "Patient One",
        inChairAt: "2026-10-05T10:00:00Z",
        estimatedDurationMinutes: 20,
      },
      {
        id: "wait-1",
        status: "waiting",
        serialNo: 2,
        patientName: "Patient Two",
        estimatedDurationMinutes: 15,
      },
    ];

    const result = calculateQueueEstimates(items, now);

    const chairEstimate = result.inChairEstimates.get("chair-1");
    expect(chairEstimate?.isOverrun).toBe(true);
    expect(chairEstimate?.remainingMinutes).toBe(10);

    const waitEstimate = result.waitingEstimates.get("wait-1");
    expect(waitEstimate?.estimatedWaitMinutes).toBe(10);
    expect(waitEstimate?.badgeText).toBe("Within ~10 mins");
  });

  it("calculates sequential wait times for all waiting SLs", () => {
    const now = new Date("2026-10-05T10:05:00Z"); // 5 mins elapsed
    const items: QueueEstimateInputItem[] = [
      {
        id: "chair-1",
        status: "in_chair",
        serialNo: 1,
        patientName: "Active Patient",
        inChairAt: "2026-10-05T10:00:00Z", // 20m service, 15m remaining
        estimatedDurationMinutes: 20,
      },
      {
        id: "wait-1",
        status: "waiting",
        serialNo: 2,
        patientName: "Waiting Patient 1",
        estimatedDurationMinutes: 20, // takes 20m
      },
      {
        id: "wait-2",
        status: "waiting",
        serialNo: 3,
        patientName: "Waiting Patient 2",
        estimatedDurationMinutes: 30, // takes 30m
      },
    ];

    const result = calculateQueueEstimates(items, now);

    const wait1 = result.waitingEstimates.get("wait-1");
    expect(wait1?.estimatedWaitMinutes).toBe(15);
    expect(wait1?.badgeText).toBe("Within ~15 mins");

    const wait2 = result.waitingEstimates.get("wait-2");
    // 15m (remaining chair) + 20m (wait1 service) = 35m
    expect(wait2?.estimatedWaitMinutes).toBe(35);
    expect(wait2?.badgeText).toBe("Within ~35 mins");
  });

  it("calls next patient immediately if dental chairs are currently empty", () => {
    const now = new Date("2026-10-05T10:00:00Z");
    const items: QueueEstimateInputItem[] = [
      {
        id: "wait-1",
        status: "waiting",
        serialNo: 1,
        patientName: "First Patient",
        estimatedDurationMinutes: 20,
      },
    ];

    const result = calculateQueueEstimates(items, now);

    const wait1 = result.waitingEstimates.get("wait-1");
    expect(wait1?.estimatedWaitMinutes).toBe(0);
    expect(wait1?.badgeText).toBe("Calling Next");
  });

  it("calculates independent wait times per doctor in multi-doctor clinics", () => {
    const now = new Date("2026-10-05T10:00:00Z");
    const items: QueueEstimateInputItem[] = [
      // Doctor A is active in chair with 30 mins remaining
      {
        id: "chair-doc-a",
        status: "in_chair",
        doctorId: "doc-a",
        doctorName: "Dr. Alice",
        serialNo: 1,
        serialCode: "A-01",
        patientName: "Doc A Patient 1",
        inChairAt: "2026-10-05T10:00:00Z",
        estimatedDurationMinutes: 30,
      },
      // Waiting for Doctor A
      {
        id: "wait-doc-a-1",
        status: "waiting",
        doctorId: "doc-a",
        doctorName: "Dr. Alice",
        serialNo: 2,
        serialCode: "A-02",
        patientName: "Doc A Waiting 1",
        estimatedDurationMinutes: 20,
      },
      // Doctor B is completely FREE (no in_chair item)
      // Waiting for Doctor B - should be 0 mins ("Calling Next")
      {
        id: "wait-doc-b-1",
        status: "waiting",
        doctorId: "doc-b",
        doctorName: "Dr. Bob",
        serialNo: 1,
        serialCode: "B-01",
        patientName: "Doc B Waiting 1",
        estimatedDurationMinutes: 15,
      },
      // Second waiting patient for Doctor B - should be 15 mins (after B-01)
      {
        id: "wait-doc-b-2",
        status: "waiting",
        doctorId: "doc-b",
        doctorName: "Dr. Bob",
        serialNo: 2,
        serialCode: "B-02",
        patientName: "Doc B Waiting 2",
        estimatedDurationMinutes: 25,
      },
    ];

    const result = calculateQueueEstimates(items, now);

    // Doctor B is free, so B-01 is called immediately (0 mins)
    const waitB1 = result.waitingEstimates.get("wait-doc-b-1");
    expect(waitB1?.estimatedWaitMinutes).toBe(0);
    expect(waitB1?.badgeText).toBe("Calling Next");

    // B-02 waits for B-01's 15 min duration
    const waitB2 = result.waitingEstimates.get("wait-doc-b-2");
    expect(waitB2?.estimatedWaitMinutes).toBe(15);
    expect(waitB2?.badgeText).toBe("Within ~15 mins");

    // Doctor A is busy for 30 mins, so A-02 waits 30 mins regardless of Doctor B's availability
    const waitA1 = result.waitingEstimates.get("wait-doc-a-1");
    expect(waitA1?.estimatedWaitMinutes).toBe(30);
    expect(waitA1?.badgeText).toBe("Within ~30 mins");

    // Earliest call time in the clinic is 0 mins (Doctor B is ready)
    expect(result.nextCallWaitMinutes).toBe(0);
  });
});
