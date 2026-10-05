/**
 * Clinical Queue Wait-Time Estimation Engine
 * 
 * Computes live, dynamic estimated call times for dental clinic queue displays:
 * - In multi-doctor clinics, wait times are calculated per doctor stream (doctorId).
 *   Doctor A's in-chair duration only affects Doctor A's waiting patients.
 * - Active treatments in dental chairs count down based on planned service duration.
 * - If an in-chair treatment exceeds planned duration, a graceful overrun buffer (e.g. ~10 mins)
 *   is applied so patients in the lounge see realistic, calm estimates rather than 0 or negative time.
 * - Waiting patients receive cumulative estimated wait times based on preceding services in their doctor's queue.
 */

export interface QueueEstimateInputItem {
  id: string;
  status: "booked" | "waiting" | "in_chair" | "billing" | "done" | "no_show" | "cancelled";
  serialNo: number | null;
  serialCode?: string | null;
  patientName: string;
  chairId?: string | null;
  chairName?: string | null;
  doctorId?: string | null;
  doctorName?: string | null;
  startTimeRaw?: string;
  endTimeRaw?: string;
  inChairAt?: string | null;
  estimatedDurationMinutes?: number;
}

export interface WaitingItemEstimate {
  id: string;
  serialNo: number | null;
  serialCode?: string | null;
  patientName: string;
  doctorId?: string | null;
  doctorName?: string | null;
  estimatedWaitMinutes: number;
  badgeText: string;
  badgeVariant: "urgent" | "soon" | "normal";
  approxCallTimeFormatted: string; // e.g. "03:45 PM"
}

export interface InChairItemEstimate {
  id: string;
  serialNo: number | null;
  serialCode?: string | null;
  patientName: string;
  chairName: string;
  doctorId?: string | null;
  doctorName?: string | null;
  serviceDurationMinutes: number;
  elapsedMinutes: number;
  remainingMinutes: number;
  isOverrun: boolean;
  statusText: string;
}

export interface QueueEstimatesResult {
  inChairEstimates: Map<string, InChairItemEstimate>;
  waitingEstimates: Map<string, WaitingItemEstimate>;
  nextCallWaitMinutes: number;
}

/**
 * Calculates in-chair treatment countdowns and lounge waiting list call-time estimates.
 */
export function calculateQueueEstimates(
  items: QueueEstimateInputItem[],
  now: Date = new Date()
): QueueEstimatesResult {
  const inChairItems = items.filter((i) => i.status === "in_chair");
  const waitingItems = items
    .filter((i) => i.status === "waiting")
    .sort((a, b) => (Number(a.serialNo) || 9999) - (Number(b.serialNo) || 9999));

  const inChairEstimates = new Map<string, InChairItemEstimate>();
  const waitingEstimates = new Map<string, WaitingItemEstimate>();

  // 1. Calculate remaining time for active treatments in chairs
  const chairRemainingMinutes: number[] = [];
  const doctorActiveRemaining = new Map<string, number>();

  for (const item of inChairItems) {
    const plannedDuration = Math.max(10, item.estimatedDurationMinutes || 20);
    const startedAt = item.inChairAt
      ? new Date(item.inChairAt)
      : item.startTimeRaw
      ? new Date(item.startTimeRaw)
      : now;

    const diffMs = now.getTime() - startedAt.getTime();
    const elapsedMinutes = Math.max(0, Math.floor(diffMs / 60000));

    let remainingMinutes: number;
    let isOverrun = false;

    if (elapsedMinutes < plannedDuration) {
      remainingMinutes = plannedDuration - elapsedMinutes;
    } else {
      isOverrun = true;
      const overrunMinutes = elapsedMinutes - plannedDuration;
      // Overrun buffer: starts at approx 10 mins, gracefully steps down to min 3 mins
      remainingMinutes = overrunMinutes < 10 ? Math.max(3, 10 - overrunMinutes) : 3;
    }

    chairRemainingMinutes.push(remainingMinutes);

    if (item.doctorId) {
      const current = doctorActiveRemaining.get(item.doctorId) ?? 0;
      doctorActiveRemaining.set(item.doctorId, Math.max(current, remainingMinutes));
    }

    const statusText = isOverrun
      ? `Finalizing (~${remainingMinutes}m)`
      : `~${remainingMinutes} mins left`;

    inChairEstimates.set(item.id, {
      id: item.id,
      serialNo: item.serialNo,
      serialCode: item.serialCode,
      patientName: item.patientName,
      chairName: item.chairName || "Dental Chair",
      doctorId: item.doctorId,
      doctorName: item.doctorName,
      serviceDurationMinutes: plannedDuration,
      elapsedMinutes,
      remainingMinutes,
      isOverrun,
      statusText,
    });
  }

  // 2. Check if we have doctor-scoped items
  const hasDoctorScopedItems = items.some((i) => Boolean(i.doctorId));

  if (hasDoctorScopedItems) {
    // Group waiting items by doctorId (or "unassigned")
    const doctorWaitingGroups = new Map<string, QueueEstimateInputItem[]>();
    for (const item of waitingItems) {
      const docKey = item.doctorId || "unassigned";
      if (!doctorWaitingGroups.has(docKey)) {
        doctorWaitingGroups.set(docKey, []);
      }
      doctorWaitingGroups.get(docKey)!.push(item);
    }

    // For each doctor group, project sequential wait times
    for (const [docKey, docWaitings] of doctorWaitingGroups.entries()) {
      docWaitings.sort((a, b) => (Number(a.serialNo) || 9999) - (Number(b.serialNo) || 9999));

      // Initial wait for this doctor: remaining in-chair time, or 0 if doctor is free
      let currentWait = docKey !== "unassigned" ? (doctorActiveRemaining.get(docKey) ?? 0) : 0;

      for (const item of docWaitings) {
        const patientDuration = Math.max(10, item.estimatedDurationMinutes || 20);
        const waitMins = currentWait;

        const callTimeMs = now.getTime() + waitMins * 60000;
        const callTimeDate = new Date(callTimeMs);
        const approxCallTimeFormatted = new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Dhaka",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }).format(callTimeDate);

        let badgeText: string;
        let badgeVariant: "urgent" | "soon" | "normal";

        if (waitMins <= 0) {
          badgeText = "Calling Next";
          badgeVariant = "urgent";
        } else if (waitMins <= 5) {
          badgeText = "Within ~5 mins";
          badgeVariant = "urgent";
        } else if (waitMins <= 10) {
          badgeText = `Within ~${waitMins} mins`;
          badgeVariant = "soon";
        } else if (waitMins < 60) {
          badgeText = `Within ~${waitMins} mins`;
          badgeVariant = "normal";
        } else {
          const hrs = Math.floor(waitMins / 60);
          const remainder = waitMins % 60;
          badgeText = remainder > 0 ? `Within ~${hrs}h ${remainder}m` : `Within ~${hrs}h`;
          badgeVariant = "normal";
        }

        waitingEstimates.set(item.id, {
          id: item.id,
          serialNo: item.serialNo,
          serialCode: item.serialCode,
          patientName: item.patientName,
          doctorId: item.doctorId,
          doctorName: item.doctorName,
          estimatedWaitMinutes: waitMins,
          badgeText,
          badgeVariant,
          approxCallTimeFormatted,
        });

        currentWait += patientDuration;
      }
    }
  } else {
    // Fallback: General chair availability simulation for solo or doctor-agnostic setups
    const availableChairs: number[] =
      chairRemainingMinutes.length > 0 ? [...chairRemainingMinutes] : [0];

    for (let idx = 0; idx < waitingItems.length; idx++) {
      const item = waitingItems[idx];
      const patientDuration = Math.max(10, item.estimatedDurationMinutes || 20);

      let minChairIdx = 0;
      for (let c = 1; c < availableChairs.length; c++) {
        if (availableChairs[c] < availableChairs[minChairIdx]) {
          minChairIdx = c;
        }
      }

      const waitMins = availableChairs[minChairIdx];

      const callTimeMs = now.getTime() + waitMins * 60000;
      const callTimeDate = new Date(callTimeMs);
      const approxCallTimeFormatted = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Dhaka",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(callTimeDate);

      let badgeText: string;
      let badgeVariant: "urgent" | "soon" | "normal";

      if (waitMins <= 0) {
        badgeText = "Calling Next";
        badgeVariant = "urgent";
      } else if (waitMins <= 5) {
        badgeText = "Within ~5 mins";
        badgeVariant = "urgent";
      } else if (waitMins <= 10) {
        badgeText = `Within ~${waitMins} mins`;
        badgeVariant = "soon";
      } else if (waitMins < 60) {
        badgeText = `Within ~${waitMins} mins`;
        badgeVariant = "normal";
      } else {
        const hrs = Math.floor(waitMins / 60);
        const remainder = waitMins % 60;
        badgeText = remainder > 0 ? `Within ~${hrs}h ${remainder}m` : `Within ~${hrs}h`;
        badgeVariant = "normal";
      }

      waitingEstimates.set(item.id, {
        id: item.id,
        serialNo: item.serialNo,
        serialCode: item.serialCode,
        patientName: item.patientName,
        doctorId: item.doctorId,
        doctorName: item.doctorName,
        estimatedWaitMinutes: waitMins,
        badgeText,
        badgeVariant,
        approxCallTimeFormatted,
      });

      availableChairs[minChairIdx] += patientDuration;
    }
  }

  let nextCallWaitMinutes = 0;
  if (waitingEstimates.size > 0) {
    nextCallWaitMinutes = Math.min(
      ...Array.from(waitingEstimates.values()).map((e) => e.estimatedWaitMinutes)
    );
  } else if (chairRemainingMinutes.length > 0) {
    nextCallWaitMinutes = Math.min(...chairRemainingMinutes);
  }

  return {
    inChairEstimates,
    waitingEstimates,
    nextCallWaitMinutes,
  };
}
