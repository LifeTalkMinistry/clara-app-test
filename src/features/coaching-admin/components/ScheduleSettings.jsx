import { useEffect, useState } from "react";
import { CalendarOff, Clock3, Save, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { coachingRepository } from "../data";
import { formatDate } from "../constants";
import {
  AdminButton,
  FieldLabel,
  inputClass,
  panelClass,
} from "./CoachingAdminUi";

const DAYS = [
  [0, "Sunday"],
  [1, "Monday"],
  [2, "Tuesday"],
  [3, "Wednesday"],
  [4, "Thursday"],
  [5, "Friday"],
  [6, "Saturday"],
];

export default function ScheduleSettings({ refreshToken, onChanged }) {
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exception, setException] = useState({
    dateKey: "",
    type: "blocked",
    reason: "",
    dayStart: "10:00",
    dayEnd: "15:00",
  });

  const load = async () => {
    const next = await coachingRepository.getScheduleSettings();
    setData(next);
    setSettings(next.settings);
  };

  useEffect(() => {
    load();
  }, [refreshToken]);

  const toggleDay = (day) => {
    setSettings((current) => {
      const hasDay = current.workingDays.includes(day);
      return {
        ...current,
        workingDays: hasDay
          ? current.workingDays.filter((item) => item !== day)
          : [...current.workingDays, day].sort(),
        sundayOff: day === 0 ? hasDay : current.sundayOff,
      };
    });
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await coachingRepository.saveScheduleSettings(settings);
      toast.success("Mock schedule settings saved.");
      await load();
      onChanged();
    } catch (error) {
      toast.error(error.message || "Unable to save schedule settings.");
    } finally {
      setSaving(false);
    }
  };

  const addException = async () => {
    if (!exception.dateKey) {
      toast.error("Choose a date first.");
      return;
    }

    try {
      if (exception.type === "custom_hours") {
        await coachingRepository.saveDateException(exception.dateKey, {
          dayStart: exception.dayStart,
          dayEnd: exception.dayEnd,
        });
        await coachingRepository.unblockDate(exception.dateKey);
      } else if (exception.type === "time_range") {
        await coachingRepository.blockTimeRange(
          exception.dateKey,
          exception.dayStart,
          exception.dayEnd,
          exception.reason || "Blocked time range"
        );
      } else {
        await coachingRepository.blockDate(
          exception.dateKey,
          exception.reason || (exception.type === "holiday" ? "Holiday" : "Personal day off"),
          exception.type
        );
      }
      toast.success("Schedule exception saved.");
      setException((current) => ({ ...current, dateKey: "", reason: "" }));
      await load();
      onChanged();
    } catch (error) {
      toast.error(error.message || "Unable to save the exception.");
    }
  };

  const removeDateBlock = async (dateKey) => {
    try {
      await coachingRepository.unblockDate(dateKey);
      toast.success("Date exception removed.");
      await load();
      onChanged();
    } catch (error) {
      toast.error(error.message || "Unable to reopen the date.");
    }
  };

  const removeTimeBlock = async (timeBlockId) => {
    try {
      await coachingRepository.removeTimeBlock(timeBlockId);
      toast.success("Blocked time range removed.");
      await load();
      onChanged();
    } catch (error) {
      toast.error(error.message || "Unable to remove blocked time range.");
    }
  };

  const removeCustomHours = async (dateKey) => {
    try {
      await coachingRepository.saveDateException(dateKey, null);
      toast.success("Custom hours removed.");
      await load();
      onChanged();
    } catch (error) {
      toast.error(error.message || "Unable to remove custom hours.");
    }
  };

  if (!settings || !data) {
    return <div className={`${panelClass} p-6 text-sm font-semibold text-white/55`}>Loading schedule settings...</div>;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)]">
      <section className={`${panelClass} p-4 sm:p-5`}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-cyan-200/15 bg-cyan-200/[0.07] text-cyan-100">
            <Settings2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/50">Default availability</p>
            <h2 className="mt-1 text-xl font-black text-white">Schedule Settings</h2>
          </div>
        </div>

        <div className="mt-5">
          <FieldLabel>Working days</FieldLabel>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DAYS.map(([day, label]) => {
              const active = settings.workingDays.includes(day) && !(day === 0 && settings.sundayOff);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`rounded-[15px] border px-3 py-3 text-[10px] font-black uppercase tracking-[0.08em] transition ${
                    active
                      ? "border-cyan-200/30 bg-cyan-200/[0.11] text-cyan-50"
                      : "border-white/[0.08] bg-white/[0.03] text-white/42"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <FieldLabel>Start time</FieldLabel>
            <input type="time" value={settings.dayStart} onChange={(event) => setSettings((current) => ({ ...current, dayStart: event.target.value }))} className={inputClass} />
          </div>
          <div>
            <FieldLabel>End time</FieldLabel>
            <input type="time" value={settings.dayEnd} onChange={(event) => setSettings((current) => ({ ...current, dayEnd: event.target.value }))} className={inputClass} />
          </div>
          <div>
            <FieldLabel>Session duration</FieldLabel>
            <select value={settings.durationMinutes} onChange={(event) => setSettings((current) => ({ ...current, durationMinutes: Number(event.target.value) }))} className={inputClass}>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </div>
          <div>
            <FieldLabel>Timezone</FieldLabel>
            <input value={settings.timezone} readOnly className={`${inputClass} text-white/55`} />
          </div>
          <div>
            <FieldLabel>Default coach</FieldLabel>
            <select value={settings.defaultCoachId} onChange={(event) => setSettings((current) => ({ ...current, defaultCoachId: event.target.value }))} className={inputClass}>
              {data.coaches.filter((coach) => coach.active).map((coach) => (
                <option key={coach.id} value={coach.id}>{coach.displayName}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Booking window</FieldLabel>
            <select value={settings.bookingWindowMonths} onChange={(event) => setSettings((current) => ({ ...current, bookingWindowMonths: Number(event.target.value) }))} className={inputClass}>
              <option value={1}>1 month</option>
              <option value={2}>2 months</option>
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
            </select>
          </div>
        </div>

        <label className="mt-4 flex items-center gap-3 rounded-[17px] border border-white/[0.08] bg-white/[0.035] p-3.5 text-[11px] font-bold text-white/65">
          <input
            type="checkbox"
            checked={settings.sundayOff}
            onChange={(event) => {
              const checked = event.target.checked;
              setSettings((current) => ({
                ...current,
                sundayOff: checked,
                workingDays: checked
                  ? current.workingDays.filter((day) => day !== 0)
                  : [...new Set([...current.workingDays, 0])].sort(),
              }));
            }}
            className="h-4 w-4 accent-cyan-400"
          />
          Keep Sunday unavailable by default
        </label>

        <AdminButton variant="primary" onClick={saveSettings} disabled={saving} className="mt-5 w-full sm:w-auto">
          <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save Schedule Settings"}
        </AdminButton>
      </section>

      <section className={`${panelClass} p-4 sm:p-5`}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-violet-200/15 bg-violet-200/[0.07] text-violet-100">
            <CalendarOff className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-100/50">Per-date override</p>
            <h2 className="mt-1 text-xl font-black text-white">Schedule Exceptions</h2>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Date</FieldLabel>
            <input type="date" value={exception.dateKey} onChange={(event) => setException((current) => ({ ...current, dateKey: event.target.value }))} className={inputClass} />
          </div>
          <div>
            <FieldLabel>Exception type</FieldLabel>
            <select value={exception.type} onChange={(event) => setException((current) => ({ ...current, type: event.target.value }))} className={inputClass}>
              <option value="blocked">Block specific date</option>
              <option value="holiday">Holiday</option>
              <option value="personal_day">Personal day off</option>
              <option value="time_range">Block a time range</option>
              <option value="custom_hours">Custom hours</option>
            </select>
          </div>
        </div>

        {["custom_hours", "time_range"].includes(exception.type) ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>{exception.type === "time_range" ? "Block from" : "Custom start"}</FieldLabel>
              <input type="time" value={exception.dayStart} onChange={(event) => setException((current) => ({ ...current, dayStart: event.target.value }))} className={inputClass} />
            </div>
            <div>
              <FieldLabel>{exception.type === "time_range" ? "Block until" : "Custom end"}</FieldLabel>
              <input type="time" value={exception.dayEnd} onChange={(event) => setException((current) => ({ ...current, dayEnd: event.target.value }))} className={inputClass} />
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <FieldLabel>Reason</FieldLabel>
            <input value={exception.reason} onChange={(event) => setException((current) => ({ ...current, reason: event.target.value }))} placeholder="Holiday, personal day off, private event..." className={inputClass} />
          </div>
        )}

        {exception.type === "time_range" ? (
          <div className="mt-3">
            <FieldLabel>Reason</FieldLabel>
            <input
              value={exception.reason}
              onChange={(event) => setException((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Admin hold, preparation, private event..."
              className={inputClass}
            />
          </div>
        ) : null}

        <AdminButton variant="primary" onClick={addException} className="mt-4 w-full">
          Add Exception
        </AdminButton>

        <div className="mt-5 space-y-2.5 border-t border-white/[0.07] pt-4">
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/40">Active exceptions</p>
          {Object.keys(data.dateBlocks).length === 0 &&
          Object.keys(data.customHours).length === 0 &&
          (data.timeBlocks || []).length === 0 ? (
            <p className="rounded-[17px] border border-white/[0.06] bg-white/[0.03] p-4 text-[11px] font-semibold text-white/45">No date exceptions configured.</p>
          ) : null}
          {Object.entries(data.dateBlocks).map(([dateKey, block]) => (
            <div key={dateKey} className="flex items-center justify-between gap-3 rounded-[17px] border border-white/[0.07] bg-white/[0.03] p-3.5">
              <div>
                <p className="text-[11px] font-black text-white">{formatDate(dateKey)}</p>
                <p className="mt-1 text-[9px] font-semibold text-white/45">{block.reason} · {block.type}</p>
              </div>
              <button type="button" onClick={() => removeDateBlock(dateKey)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-300/15 bg-rose-300/[0.07] text-rose-100 hover:bg-rose-300/[0.12]" aria-label={`Remove exception for ${dateKey}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {(data.timeBlocks || []).map((timeBlock) => (
            <div key={timeBlock.id} className="flex items-center justify-between gap-3 rounded-[17px] border border-white/[0.07] bg-white/[0.03] p-3.5">
              <div>
                <p className="text-[11px] font-black text-white">{formatDate(timeBlock.dateKey)}</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-[9px] font-semibold text-white/45">
                  <Clock3 className="h-3 w-3" /> Blocked range · {timeBlock.startTime}–{timeBlock.endTime}
                </p>
                <p className="mt-1 text-[9px] font-semibold text-white/35">{timeBlock.reason}</p>
              </div>
              <button type="button" onClick={() => removeTimeBlock(timeBlock.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-300/15 bg-rose-300/[0.07] text-rose-100 hover:bg-rose-300/[0.12]" aria-label={`Remove blocked time range for ${timeBlock.dateKey}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {Object.entries(data.customHours).map(([dateKey, hours]) => (
            <div key={dateKey} className="flex items-center justify-between gap-3 rounded-[17px] border border-white/[0.07] bg-white/[0.03] p-3.5">
              <div>
                <p className="text-[11px] font-black text-white">{formatDate(dateKey)}</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-[9px] font-semibold text-white/45">
                  <Clock3 className="h-3 w-3" /> Custom hours · {hours.dayStart}–{hours.dayEnd}
                </p>
              </div>
              <button type="button" onClick={() => removeCustomHours(dateKey)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-300/15 bg-rose-300/[0.07] text-rose-100 hover:bg-rose-300/[0.12]" aria-label={`Remove custom hours for ${dateKey}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
