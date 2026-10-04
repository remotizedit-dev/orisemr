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
});
