import { useEffect, useState } from "react";
import { toast } from "sonner";
import { coachingRepository } from "./data";

const confirmationCopy = {
  completed: {
    title: "Mark this session completed?",
    description: "The appointment will move to completed and remain tied to the historical session record.",
    confirmLabel: "Mark Completed",
    tone: "success",
  },
  cancelled: {
    title: "Cancel this appointment?",
    description: "The requested slot will return to availability unless it was manually blocked.",
    confirmLabel: "Cancel Appointment",
    tone: "danger",
  },
  no_show: {
    title: "Mark this appointment as no-show?",
    description: "Use this only when the confirmed session time has passed and the member did not attend.",
    confirmLabel: "Mark No-Show",
    tone: "danger",
  },
  declined: {
    title: "Decline this request?",
    description: "The request will be declined and its requested slot will be released.",
    confirmLabel: "Decline Request",
    tone: "danger",
  },
};

export default function useCoachingAdminDraft() {
  const [overview, setOverview] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = () => setRefreshToken((current) => current + 1);

  useEffect(() => {
    let active = true;
    coachingRepository.getOverview().then((data) => {
      if (active) setOverview(data);
    }).catch(() => {
      if (active) toast.error("Unable to load coaching overview.");
    });
    return () => {
      active = false;
    };
  }, [refreshToken]);

  const commitStatusChange = async (appointmentId, status) => {
    setBusy(true);
    try {
      await coachingRepository.updateAppointmentStatus(appointmentId, status);
      toast.success("Appointment status updated.");
      refresh();
    } catch (error) {
      toast.error(error.message || "Unable to update the appointment.");
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  };

  const requestStatusChange = (appointmentId, status) => {
    if (confirmationCopy[status]) {
      setPendingAction({ appointmentId, status, ...confirmationCopy[status] });
      return;
    }
    commitStatusChange(appointmentId, status);
  };

  const resetMockData = async () => {
    setBusy(true);
    try {
      await coachingRepository.resetMockData();
      toast.success("Mock coaching data restored.");
      setSelectedAppointmentId("");
      setResetOpen(false);
      refresh();
    } catch (error) {
      toast.error(error.message || "Unable to reset mock data.");
    } finally {
      setBusy(false);
    }
  };

  return {
    overview,
    refreshToken,
    selectedAppointmentId,
    pendingAction,
    resetOpen,
    busy,
    refresh,
    setSelectedAppointmentId,
    setPendingAction,
    setResetOpen,
    requestStatusChange,
    commitStatusChange,
    resetMockData,
  };
}
