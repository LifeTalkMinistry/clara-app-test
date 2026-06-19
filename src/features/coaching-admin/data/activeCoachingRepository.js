import { buildAvailability } from "./mockCoachingSeed";
import { mockCoachingRepository } from "./mockCoachingRepository";
import { readCoachingMockState, writeCoachingMockState } from "./coachingStorage";

function isCoveredByTimeBlock(slot, timeBlocks = []) {
  return timeBlocks.some(
    (block) =>
      block.dateKey === slot.dateKey &&
      slot.startTime >= block.startTime &&
      slot.startTime < block.endTime
  );
}

function rebuildConsistentAvailability(state) {
  const oldSlotOverrides = new Map(
    state.availability
      .filter(
        (slot) =>
          slot.manuallyBlocked &&
          !slot.appointmentId &&
          !state.dateBlocks[slot.dateKey] &&
          !isCoveredByTimeBlock(slot, state.timeBlocks || [])
      )
      .map((slot) => [slot.id, slot])
  );

  const rebuilt = buildAvailability(state.settings, state.appointments, {
    dateBlocks: state.dateBlocks,
    customHours: state.customHours,
    timeBlocks: state.timeBlocks || [],
  });

  rebuilt.forEach((slot) => {
    const override = oldSlotOverrides.get(slot.id);
    if (override && !slot.appointmentId) Object.assign(slot, override);
  });

  state.availability = rebuilt;
  return writeCoachingMockState(state);
}

export const activeCoachingRepository = {
  ...mockCoachingRepository,

  async updateAppointmentStatus(appointmentId, status) {
    await mockCoachingRepository.updateAppointmentStatus(appointmentId, status);
    rebuildConsistentAvailability(readCoachingMockState());
    return mockCoachingRepository.getAppointmentById(appointmentId);
  },

  async removeTimeBlock(timeBlockId) {
    const state = readCoachingMockState();
    const timeBlock = (state.timeBlocks || []).find((item) => item.id === timeBlockId);

    if (timeBlock) {
      state.availability.forEach((slot) => {
        const belongsToBlock =
          slot.dateKey === timeBlock.dateKey &&
          slot.startTime >= timeBlock.startTime &&
          slot.startTime < timeBlock.endTime;
        if (!belongsToBlock || slot.appointmentId) return;
        slot.status = "available";
        slot.blockReason = "";
        slot.manuallyBlocked = false;
      });
      writeCoachingMockState(state);
    }

    await mockCoachingRepository.removeTimeBlock(timeBlockId);
    rebuildConsistentAvailability(readCoachingMockState());
    return true;
  },
};
