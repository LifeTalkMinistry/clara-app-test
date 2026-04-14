import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Edit3,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "../../components/PageHeader";
import useUserRole from "../../hooks/useUserRole";
import {
  activateAdminDailyTip,
  deleteDailyTip,
  loadAdminDailyTips,
  saveAdminDailyTip,
  subscribeToDailyTips,
  updateDailyTipStatus,
} from "@/lib/daily-tip-service";
import {
  buildTipTeaser,
  FALLBACK_MONEY_TIPS,
  getFallbackTipForDate,
  selectCurrentAdminTip,
} from "@/lib/daily-tip-utils";

const BLANK = {
  title: "",
  text: "",
  category: "money",
  audience: "all",
  status: "active",
  source: "admin",
  scheduled_date: "",
};

export default function AdminDailyTips() {
  const { isAdmin, user } = useUserRole();
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [setupRequired, setSetupRequired] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [errorText, setErrorText] = useState("");

  const loadTips = useCallback(async () => {
    try {
      setLoading(true);
      setErrorText("");

      const result = await loadAdminDailyTips();
      setTips(result.tips);
      setSetupRequired(result.setupRequired);
      setConfigured(result.configured !== false);
    } catch (error) {
      console.error("Failed to load daily tips:", error);
      setTips([]);
      setSetupRequired(false);
      setConfigured(true);
      setErrorText(error.message || "Failed to load daily tips.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return undefined;

    loadTips();

    const unsubscribe = subscribeToDailyTips(() => {
      loadTips();
    });

    return unsubscribe;
  }, [isAdmin, loadTips]);

  const adminTips = useMemo(() => tips.filter((tip) => tip.source === "admin"), [tips]);
  const studentTips = useMemo(() => tips.filter((tip) => tip.source === "student"), [tips]);
  const pendingStudentTips = useMemo(
    () => studentTips.filter((tip) => tip.status === "pending"),
    [studentTips]
  );
  const reviewedStudentTips = useMemo(
    () => studentTips.filter((tip) => tip.status !== "pending"),
    [studentTips]
  );
  const currentTip = useMemo(() => selectCurrentAdminTip(adminTips), [adminTips]);
  const fallbackTip = useMemo(() => getFallbackTipForDate(), []);

  const refreshAndReset = useCallback(async () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(BLANK);
    await loadTips();
  }, [loadTips]);

  async function handleSave() {
    if (!form.text.trim()) {
      toast.error("Tip required");
      return;
    }

    try {
      await saveAdminDailyTip({
        editingId,
        form: {
          ...form,
          title: form.title.trim(),
          text: form.text.trim(),
        },
        approverEmail: user?.email || null,
      });

      toast.success(editingId ? "Tip updated" : "Tip created");
      await refreshAndReset();
    } catch (error) {
      console.error("Failed to save daily tip:", error);
      toast.error(error.message || "Failed to save daily tip.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this tip?")) return;

    try {
      await deleteDailyTip(id);
      toast.success("Tip deleted");
      await loadTips();
    } catch (error) {
      console.error("Failed to delete daily tip:", error);
      toast.error(error.message || "Failed to delete daily tip.");
    }
  }

  async function handleApprove(tip) {
    try {
      await updateDailyTipStatus(tip.id, {
        status: "approved",
        approved_by: user?.email || null,
      });

      toast.success("Suggestion approved");
      await loadTips();
    } catch (error) {
      console.error("Failed to approve daily tip:", error);
      toast.error(error.message || "Failed to approve daily tip.");
    }
  }

  async function handleReject(tip) {
    try {
      await updateDailyTipStatus(tip.id, {
        status: "rejected",
        approved_by: user?.email || null,
      });

      toast.success("Suggestion marked as rejected");
      await loadTips();
    } catch (error) {
      console.error("Failed to reject daily tip:", error);
      toast.error(error.message || "Failed to reject daily tip.");
    }
  }

  async function handleToggle(tip) {
    try {
      if (tip.status === "active") {
        await updateDailyTipStatus(tip.id, {
          status: "inactive",
          approved_by: null,
        });
      } else {
        await activateAdminDailyTip(tip.id, user?.email || null);
      }

      await loadTips();
    } catch (error) {
      console.error("Failed to update daily tip:", error);
      toast.error(error.message || "Failed to update daily tip.");
    }
  }

  function openEdit(tip) {
    setForm({
      ...BLANK,
      ...tip,
      title: tip.title || "",
      text: tip.text || "",
      scheduled_date: tip.scheduled_date || "",
      source: "admin",
    });
    setEditingId(tip.id);
    setDialogOpen(true);
  }

  if (!isAdmin) return <div className="p-6 text-center">Admin only</div>;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  const TipRow = ({ tip, showApprove = false, readOnly = false }) => {
    const isCurrent = currentTip?.id === tip.id;

    return (
      <div className="flex justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-white">{buildTipTeaser(tip)}</p>
            {isCurrent ? (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                Live now
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-sm leading-6 text-white/70">{tip.text}</p>

          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/55">
            <span className="rounded-full border border-white/10 px-2 py-0.5">{tip.category}</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5">{tip.audience}</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5">{tip.status}</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5">
              {tip.scheduled_date || "Always available"}
            </span>
            {tip.created_by ? (
              <span className="rounded-full border border-white/10 px-2 py-0.5">
                {tip.created_by}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex gap-1 self-start">
          {showApprove ? (
            <>
              <Button size="sm" onClick={() => handleApprove(tip)}>
                <CheckCircle className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleReject(tip)}>
                <XCircle className="h-3 w-3" />
              </Button>
            </>
          ) : readOnly ? null : (
            <Button size="sm" onClick={() => handleToggle(tip)}>
              {tip.status === "active" ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
          )}

          {!showApprove && !readOnly ? (
            <Button size="sm" onClick={() => openEdit(tip)}>
              <Edit3 className="h-3 w-3" />
            </Button>
          ) : null}

          <Button size="sm" variant="outline" onClick={() => handleDelete(tip.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl p-4">
      <PageHeader
        title="Daily Tips"
        subtitle={`${adminTips.length} admin tips • ${pendingStudentTips.length} pending suggestions`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadTips}>
              <RefreshCw className="mr-1 h-4 w-4" /> Refresh
            </Button>
            <Button
              onClick={() => {
                setEditingId(null);
                setForm(BLANK);
                setDialogOpen(true);
              }}
              disabled={setupRequired || !configured}
            >
              <Plus className="mr-1 h-4 w-4" /> Add Tip
            </Button>
          </div>
        }
      />

      <div className="mb-5 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-3xl border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(8,19,20,0.98)_0%,rgba(16,52,38,0.96)_100%)] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
                Current Dashboard Tip
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {currentTip ? buildTipTeaser(currentTip) : buildTipTeaser(fallbackTip)}
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
                {currentTip
                  ? currentTip.text
                  : fallbackTip.text}
              </p>
              {!currentTip ? (
                <p className="mt-3 text-xs text-white/55">
                  No admin override is active right now, so the dashboard is using the fallback daily rotation.
                </p>
              ) : null}
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-500/10">
              <Sparkles className="h-5 w-5 text-emerald-300" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
            Fallback system
          </p>
          <p className="mt-2 text-lg font-semibold text-white">{buildTipTeaser(fallbackTip)}</p>
          <p className="mt-3 text-sm leading-6 text-white/70">
            CLARA rotates one predefined tip per day across {FALLBACK_MONEY_TIPS.length} fallback entries, so the card never feels empty.
          </p>
        </div>
      </div>

      {setupRequired ? (
        <div className="mb-5 rounded-3xl border border-amber-400/20 bg-amber-500/10 p-5 text-sm text-white/80">
          <p className="font-semibold text-white">Daily tips table setup required</p>
          <p className="mt-2 leading-6">
            The dashboard fallback is already live, but admin tips and student suggestions need the
            `daily_tips` table. Run the SQL in
            {" "}
            <code>supabase/daily_tips_schema.sql</code>
            {" "}
            inside your Supabase project to enable full management.
          </p>
        </div>
      ) : null}

      {!configured ? (
        <div className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/80">
          <p className="font-semibold text-white">Supabase connection required</p>
          <p className="mt-2 leading-6">
            Fallback tips still keep the dashboard alive, but admin management and student suggestions
            need the Supabase environment variables to be configured for this app.
          </p>
        </div>
      ) : null}

      {errorText ? <p className="mb-4 text-sm text-red-400">{errorText}</p> : null}

      <Tabs defaultValue="admin">
        <TabsList className="bg-white/5 text-white/60">
          <TabsTrigger value="admin">Admin Tips</TabsTrigger>
          <TabsTrigger value="student">Student Suggestions</TabsTrigger>
        </TabsList>

        <TabsContent value="admin" className="space-y-2">
          {adminTips.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
              No admin tips yet. The dashboard is currently using the fallback daily rotation.
            </div>
          ) : (
            adminTips.map((tip) => <TipRow key={tip.id} tip={tip} />)
          )}
        </TabsContent>

        <TabsContent value="student" className="space-y-4">
          <section className="space-y-2">
            <p className="text-sm font-semibold text-white">Pending review</p>
            {pendingStudentTips.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                No pending student suggestions right now.
              </div>
            ) : (
              pendingStudentTips.map((tip) => <TipRow key={tip.id} tip={tip} showApprove />)
            )}
          </section>

          <section className="space-y-2">
            <p className="text-sm font-semibold text-white">Reviewed suggestions</p>
            {reviewedStudentTips.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                No reviewed suggestions yet.
              </div>
            ) : (
              reviewedStudentTips.map((tip) => <TipRow key={tip.id} tip={tip} readOnly />)
            )}
          </section>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Add"} Daily Tip</DialogTitle>
            <DialogDescription>
              Choose an optional teaser for the front of the card and a full message for the back.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Front teaser or title"
            />

            <Textarea
              value={form.text}
              onChange={(event) => setForm({ ...form, text: event.target.value })}
              placeholder="Write the full tip that appears on the back of the card."
              className="min-h-[140px]"
            />

            <InputRow
              label="Scheduled Date"
              value={form.scheduled_date}
              onChange={(value) => setForm({ ...form, scheduled_date: value })}
              type="date"
            />

            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">Make this live</p>
                <p className="text-xs text-white/55">
                  Only one admin tip stays active on the dashboard at a time.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    status: current.status === "active" ? "inactive" : "active",
                  }))
                }
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  form.status === "active"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-white/10 text-white/65"
                }`}
              >
                {form.status === "active" ? "Active" : "Inactive"}
              </button>
            </div>

            <Button onClick={handleSave}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InputRow({ label, value, onChange, type = "text" }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-white">{label}</label>
      <input
        className="w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm text-white"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
