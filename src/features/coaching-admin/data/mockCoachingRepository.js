import {
  APPOINTMENT_STATUSES,
  VALID_STATUS_TRANSITIONS,
  isPriorityAppointment,
} from "../constants";
import { buildAvailability } from "./mockCoachingSeed";
import {
  cloneCoachingValue,
  readCoachingMockState,
  resetCoachingMockState,
  writeCoachingMockState,
} from "./coachingStorage";

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function enrichAppointment(state, appointment) {
  if (!appointment) return null;
  const member = state.members.find((item) => item.id === appointment.memberId) || null;
  const coach = state.coaches.find((item) => item.id === appointment.coachId) || null;
  return cloneCoachingValue({ ...appointment, member, coach });
}

function slotForAppointment(state, appointment) {
  return state.availability.find(
    (slot) => slot.dateKey === appointment.dateKey && slot.startTime === appointment.startTime
  );
}

function syncSlotForStatus(state, appointment) {
  const slot = slotForAppointment(state, appointment);
  if (!slot) return;

  if ([APPOINTMENT_STATUSES.PENDING, APPOINTMENT_STATUSES.RESCHEDULE_REQUESTED].includes(appointment.status)) {
    slot.status = "pending";
    slot.appointmentId = appointment.id;
    slot.coachId = appointment.coachId || slot.coachId || state.settings.defaultCoachId;
    return;
  }

  if ([APPOINTMENT_STATUSES.CONFIRMED, APPOINTMENT_STATUSES.COMPLETED, APPOINTMENT_STATUSES.NO_SHOW].includes(appointment.status)) {
    slot.status = "booked";
    slot.appointmentId = appointment.id;
    slot.coachId = appointment.coachId || slot.coachId || state.settings.defaultCoachId;
    return;
  }

  slot.appointmentId = null;
  if (!slot.manuallyBlocked) {
    slot.status = "available";
    slot.blockReason = "";
  }
}

function assertTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return;
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Status cannot change from ${currentStatus} to ${nextStatus}.`);
  }
}

function sortAppointments(items) {
  return items.sort((a, b) => {
    const dateCompare = `${a.dateKey}T${a.startTime}`.localeCompare(`${b.dateKey}T${b.startTime}`);
    if (dateCompare !== 0) return dateCompare;
    return b.submittedAt.localeCompare(a.submittedAt);
  });
}

export const mockCoachingRepository = {
  async getOverview() {
    const state = readCoachingMockState();
    const today = localDateKey();
    const currentMonth = today.slice(0, 7);
    const pending = state.appointments.filter((item) => item.status === "pending").length;
    const confirmed = state.appointments.filter((item) => item.status === "confirmed").length;
    const todayCount = state.appointments.filter(
      (item) => item.dateKey === today && !["cancelled", "declined"].includes(item.status)
    ).length;
    const availableSlots = state.availability.filter(
      (slot) => slot.dateKey >= today && slot.status === "available" && !state.dateBlocks[slot.dateKey]
    ).length;
    const completedThisMonth = state.appointments.filter(
      (item) => item.status === "completed" && item.dateKey.startsWith(currentMonth)
    ).length;
    const rescheduleRequests = state.appointments.filter(
      (item) => item.status === "reschedule_requested"
    ).length;
    const cancelledNoShow = state.appointments.filter((item) =>
      ["cancelled", "no_show"].includes(item.status)
    ).length;

    const attention = state.appointments
      .filter((item) => {
        if (["pending", "reschedule_requested"].includes(item.status)) return true;
        if (item.dateKey === today && item.status === "confirmed") return true;
        if (item.status === "completed" && !item.sessionOutcome.trim()) return true;
        return isPriorityAppointment(item) && !["cancelled", "declined"].includes(item.status);
      })
      .map((item) => enrichAppointment(state, item))
      .sort((a, b) => {
        const aPriority = isPriorityAppointment(a) ? 1 : 0;
        const bPriority = isPriorityAppointment(b) ? 1 : 0;
        if (aPriority !== bPriority) return bPriority - aPriority;
        return `${a.dateKey}T${a.startTime}`.localeCompare(`${b.dateKey}T${b.startTime}`);
      });

    return {
      metrics: {
        pending,
        confirmed,
        today: todayCount,
        availableSlots,
        completedThisMonth,
        rescheduleRequests,
        cancelledNoShow,
      },
      attention,
      coaches: cloneCoachingValue(state.coaches),
      lastUpdatedAt: state.lastUpdatedAt,
    };
  },

  async getAppointments(filters = {}) {
    const state = readCoachingMockState();
    const search = String(filters.search || "").trim().toLowerCase();

    const result = state.appointments.filter((appointment) => {
      const member = state.members.find((item) => item.id === appointment.memberId);
      if (filters.status && filters.status !== "all" && appointment.status !== filters.status) return false;
      if (filters.dateFrom && appointment.dateKey < filters.dateFrom) return false;
      if (filters.dateTo && appointment.dateKey > filters.dateTo) return false;
      if (filters.coachId && filters.coachId !== "all" && appointment.coachId !== filters.coachId) return false;
      if (filters.focus && filters.focus !== "all" && appointment.focus !== filters.focus) return false;
      if (filters.approach && filters.approach !== "all" && appointment.coachingApproach !== filters.approach) return false;
      if (filters.priorityOnly && !isPriorityAppointment(appointment)) return false;
      if (search) {
        const haystack = [
          appointment.id,
          appointment.focus,
          member?.displayName,
          member?.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    return sortAppointments(result.map((item) => enrichAppointment(state, item)));
  },

  async getAppointmentById(appointmentId) {
    const state = readCoachingMockState();
    return enrichAppointment(
      state,
      state.appointments.find((item) => item.id === appointmentId)
    );
  },

  async getAppointmentsForDate(dateKey) {
    const state = readCoachingMockState();
    const appointments = new Map(
      state.appointments.map((item) => [item.id, enrichAppointment(state, item)])
    );
    return state.availability
      .filter((slot) => slot.dateKey === dateKey)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((slot) => ({
        ...cloneCoachingValue(slot),
        appointment: slot.appointmentId ? appointments.get(slot.appointmentId) || null : null,
        coach: state.coaches.find((item) => item.id === slot.coachId) || null,
        dateBlock: state.dateBlocks[dateKey] || null,
      }));
  },

  async getAvailability(monthKey) {
    const state = readCoachingMockState();
    const slots = state.availability.filter((slot) => slot.dateKey.startsWith(monthKey));
    const appointments = state.appointments.filter((item) => item.dateKey.startsWith(monthKey));
    return cloneCoachingValue({
      monthKey,
      slots,
      appointments,
      dateBlocks: state.dateBlocks,
      customHours: state.customHours,
      settings: state.settings,
    });
  },

  async updateAppointmentStatus(appointmentId, status) {
    const state = readCoachingMockState();
    const appointment = state.appointments.find((item) => item.id === appointmentId);
    if (!appointment) throw new Error("Appointment not found.");
    assertTransition(appointment.status, status);

    const now = new Date().toISOString();
    appointment.status = status;
    appointment.updatedAt = now;

    if (status === "confirmed") {
      appointment.confirmedAt = appointment.confirmedAt || now;
      appointment.cancelledAt = null;
    }
    if (status === "completed") appointment.completedAt = now;
    if (status === "cancelled") appointment.cancelledAt = now;
    if (status === "pending") {
      appointment.cancelledAt = null;
      appointment.completedAt = null;
    }

    syncSlotForStatus(state, appointment);
    writeCoachingMockState(state);
    return enrichAppointment(state, appointment);
  },

  async assignCoach(appointmentId, coachId) {
    const state = readCoachingMockState();
    const appointment = state.appointments.find((item) => item.id === appointmentId);
    if (!appointment) throw new Error("Appointment not found.");
    if (coachId && !state.coaches.some((item) => item.id === coachId && item.active)) {
      throw new Error("Coach is not available.");
    }
    appointment.coachId = coachId || null;
    appointment.updatedAt = new Date().toISOString();
    const slot = slotForAppointment(state, appointment);
    if (slot) slot.coachId = coachId || state.settings.defaultCoachId;
    writeCoachingMockState(state);
    return enrichAppointment(state, appointment);
  },

  async saveInternalNotes(appointmentId, notes) {
    const state = readCoachingMockState();
    const appointment = state.appointments.find((item) => item.id === appointmentId);
    if (!appointment) throw new Error("Appointment not found.");
    const fields = [
      "preparationNotes",
      "questionsToAsk",
      "sensitivities",
      "sessionNotes",
      "agreedAction",
      "followUpNotes",
      "internalNotes",
    ];
    fields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(notes, field)) {
        appointment[field] = String(notes[field] || "");
      }
    });
    if (Object.prototype.hasOwnProperty.call(notes, "followUpNeeded")) {
      appointment.followUpNeeded = Boolean(notes.followUpNeeded);
    }
    appointment.updatedAt = new Date().toISOString();
    writeCoachingMockState(state);
    return enrichAppointment(state, appointment);
  },

  async saveSessionOutcome(appointmentId, outcome) {
    const state = readCoachingMockState();
    const appointment = state.appointments.find((item) => item.id === appointmentId);
    if (!appointment) throw new Error("Appointment not found.");
    appointment.sessionOutcome = String(outcome?.sessionOutcome || outcome || "");
    if (typeof outcome === "object") {
      appointment.agreedAction = String(outcome.agreedAction || appointment.agreedAction || "");
      appointment.followUpNotes = String(outcome.followUpNotes || appointment.followUpNotes || "");
      appointment.followUpNeeded = Boolean(outcome.followUpNeeded);
    }
    appointment.updatedAt = new Date().toISOString();
    writeCoachingMockState(state);
    return enrichAppointment(state, appointment);
  },

  async updateAvailability(dateKey, slotId, status, options = {}) {
    const state = readCoachingMockState();
    const slot = state.availability.find((item) => item.id === slotId && item.dateKey === dateKey);
    if (!slot) throw new Error("Availability slot not found.");
    if (slot.appointmentId && ["available", "blocked", "hold"].includes(status)) {
      throw new Error("Occupied slots must be managed through the appointment status.");
    }
    if (!["available", "blocked", "hold"].includes(status)) {
      throw new Error("Unsupported availability status.");
    }
    slot.status = status;
    slot.manuallyBlocked = status !== "available";
    slot.blockReason = status === "available" ? "" : String(options.reason || (status === "hold" ? "Admin hold" : "Blocked by admin"));
    writeCoachingMockState(state);
    return cloneCoachingValue(slot);
  },

  async blockDate(dateKey, reason = "Blocked by admin", type = "blocked") {
    const state = readCoachingMockState();
    state.dateBlocks[dateKey] = { reason, type };
    state.availability.forEach((slot) => {
      if (slot.dateKey !== dateKey || slot.appointmentId) return;
      slot.status = "blocked";
      slot.blockReason = reason;
      slot.manuallyBlocked = true;
    });
    writeCoachingMockState(state);
    return cloneCoachingValue(state.dateBlocks[dateKey]);
  },

  async unblockDate(dateKey) {
    const state = readCoachingMockState();
    const previousReason = state.dateBlocks[dateKey]?.reason;
    delete state.dateBlocks[dateKey];
    state.availability.forEach((slot) => {
      if (slot.dateKey !== dateKey || slot.appointmentId) return;
      if (!previousReason || slot.blockReason === previousReason) {
        slot.status = "available";
        slot.blockReason = "";
        slot.manuallyBlocked = false;
      }
    });
    writeCoachingMockState(state);
    return true;
  },

  async saveScheduleSettings(settings) {
    const state = readCoachingMockState();
    state.settings = { ...state.settings, ...cloneCoachingValue(settings) };
    const rebuilt = buildAvailability(state.settings, state.appointments);
    const oldOverrides = new Map(
      state.availability
        .filter((slot) => slot.manuallyBlocked && !slot.appointmentId)
        .map((slot) => [slot.id, slot])
    );
    rebuilt.forEach((slot) => {
      const override = oldOverrides.get(slot.id);
      if (override && !slot.appointmentId) Object.assign(slot, override);
      const dateBlock = state.dateBlocks[slot.dateKey];
      if (dateBlock && !slot.appointmentId) {
        slot.status = "blocked";
        slot.blockReason = dateBlock.reason;
        slot.manuallyBlocked = true;
      }
    });
    state.availability = rebuilt;
    writeCoachingMockState(state);
    return cloneCoachingValue(state.settings);
  },

  async saveDateException(dateKey, exception) {
    const state = readCoachingMockState();
    if (exception?.dayStart && exception?.dayEnd) {
      state.customHours[dateKey] = {
        dayStart: exception.dayStart,
        dayEnd: exception.dayEnd,
      };
    } else {
      delete state.customHours[dateKey];
    }
    writeCoachingMockState(state);
    return cloneCoachingValue(state.customHours[dateKey] || null);
  },

  async getScheduleSettings() {
    const state = readCoachingMockState();
    return cloneCoachingValue({
      settings: state.settings,
      coaches: state.coaches,
      dateBlocks: state.dateBlocks,
      customHours: state.customHours,
    });
  },

  async resetMockData() {
    return cloneCoachingValue(resetCoachingMockState());
  },
};
