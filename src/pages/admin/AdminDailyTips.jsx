import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "../../components/PageHeader";
import useUserRole from "../../hooks/useUserRole";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { formatSupabaseError } from "@/lib/admin-panel-utils";
import { buildTipTeaser, selectCurrentAdminTip } from "@/lib/daily-tip-utils";

const BLANK = {
  text: "",
  category: "mindset",
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
  const [errorText, setErrorText] = useState("");

  const loadTips = useCallback(async () => {
    try {
      setLoading(true);
      setErrorText("");

      const { data, error } = await supabase
        .from("daily_tips")
        .select("*")
        .order("scheduled_date", { ascending: false })
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTips(data || []);
    } catch (error) {
      console.error("Failed to load daily tips:", error);
      setTips([]);
      setErrorText(formatSupabaseError(error, "Failed to load daily tips."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadTips();
  }, [isAdmin, loadTips]);

  const adminTips = useMemo(() => tips.filter((tip) => tip.source === "admin"), [tips]);
  const studentTips = useMemo(() => tips.filter((tip) => tip.source === "student"), [tips]);
  const pendingStudentTips = useMemo(
    () => studentTips.filter((tip) => tip.status === "pending"),
    [studentTips]
  );
  const currentTip = useMemo(() => selectCurrentAdminTip(adminTips), [adminTips]);

  const refreshAndReset = useCallback(async () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(BLANK);
    await loadTips();
  }, [loadTips]);

  const activateAdminTip = useCallback(
    async (tipId) => {
      const deactivateQuery = supabase
        .from("daily_tips")
        .update({
          status: "inactive",
          approved_by: null,
        })
        .eq("source", "admin")
        .eq("status", "active");

      const deactivateResult = tipId ? await deactivateQuery.neq("id", tipId) : await deactivateQuery;
      if (deactivateResult.error) throw deactivateResult.error;

      if (!tipId) return;

      const { error } = await supabase
        .from("daily_tips")
        .update({
          status: "active",
          approved_by: user?.email || null,
        })
        .eq("id", tipId);

      if (error) throw error;
    },
    [user?.email]
  );

  async function handleSave() {
    if (!form.text.trim()) {
      toast.error("Tip required");
      return;
    }

    const payload = {
      ...form,
      text: form.text.trim(),
      source: "admin",
      approved_by: form.status === "active" ? user?.email || null : null,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from("daily_tips").update(payload).eq("id", editingId);
        if (error) throw error;

        if (payload.status === "active") {
          await activateAdminTip(editingId);
        }

        toast.success("Updated");
      } else {
        const { data, error } = await supabase
          .from("daily_tips")
          .insert([payload])
          .select("id")
          .single();

        if (error) throw error;

        if (payload.status === "active" && data?.id) {
          await activateAdminTip(data.id);
        }

        toast.success("Created");
      }

      await refreshAndReset();
    } catch (error) {
      console.error("Failed to save daily tip:", error);
      toast.error(formatSupabaseError(error, "Failed to save daily tip."));
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this tip?")) return;

    try {
      const { error } = await supabase.from("daily_tips").delete().eq("id", id);
      if (error) throw error;
      toast.success("Deleted");
      loadTips();
    } catch (error) {
      console.error("Failed to delete daily tip:", error);
      toast.error(formatSupabaseError(error, "Failed to delete daily tip."));
    }
  }

  async function handleApprove(tip) {
    try {
      const { error } = await supabase
        .from("daily_tips")
        .update({
          status: "active",
          approved_by: user?.email || null,
        })
        .eq("id", tip.id);

      if (error) throw error;
      loadTips();
    } catch (error) {
      console.error("Failed to approve daily tip:", error);
      toast.error(formatSupabaseError(error, "Failed to approve daily tip."));
    }
  }

  async function handleReject(tip) {
    try {
      const { error } = await supabase
        .from("daily_tips")
        .update({ status: "inactive" })
        .eq("id", tip.id);

      if (error) throw error;
      loadTips();
    } catch (error) {
      console.error("Failed to reject daily tip:", error);
      toast.error(formatSupabaseError(error, "Failed to reject daily tip."));
    }
  }

  async function handleToggle(tip) {
    try {
      if (tip.status === "active") {
        const { error } = await supabase
          .from("daily_tips")
          .update({
            status: "inactive",
            approved_by: null,
          })
          .eq("id", tip.id);

        if (error) throw error;
      } else {
        await activateAdminTip(tip.id);
      }

      loadTips();
    } catch (error) {
      console.error("Failed to update daily tip:", error);
      toast.error(formatSupabaseError(error, "Failed to update daily tip."));
    }
  }

  function openEdit(tip) {
    setForm({
      ...BLANK,
      ...tip,
      source: "admin",
      scheduled_date: tip.scheduled_date || "",
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

  const TipRow = ({ tip, showApprove = false }) => {
    const isCurrent = currentTip?.id === tip.id;

    return (
      <div className="flex justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-white">"{tip.text}"</p>
            {isCurrent ? (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                Current live tip
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-xs text-white/55">Front teaser: {buildTipTeaser(tip)}</p>

          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/55">
            <span className="rounded-full border border-white/10 px-2 py-0.5">{tip.category}</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5">{tip.audience}</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5">{tip.status}</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5">
              {tip.scheduled_date || "No date"}
            </span>
          </div>
        </div>

        <div className="flex gap-1">
          {showApprove ? (
            <>
              <Button size="sm" onClick={() => handleApprove(tip)}>
                <CheckCircle className="h-3 w-3" />
              </Button>
              <Button size="sm" onClick={() => handleReject(tip)}>
                <XCircle className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => handleToggle(tip)}>
              {tip.status === "active" ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
          )}

          <Button size="sm" onClick={() => openEdit(tip)}>
            <Edit3 className="h-3 w-3" />
          </Button>

          <Button size="sm" onClick={() => handleDelete(tip.id)}>
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
        subtitle={`${tips.length} total`}
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
            >
              <Plus className="mr-1 h-4 w-4" /> Add Tip
            </Button>
          </div>
        }
      />

      {currentTip ? (
        <div className="mb-5 overflow-hidden rounded-3xl border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(8,19,20,0.98)_0%,rgba(16,52,38,0.96)_100%)] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
                Current Dashboard Tip
              </p>
              <p className="mt-2 text-lg font-semibold text-white">{buildTipTeaser(currentTip)}</p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">{currentTip.text}</p>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-500/10">
              <Sparkles className="h-5 w-5 text-emerald-300" />
            </div>
          </div>
        </div>
      ) : null}

      {errorText ? <p className="mb-4 text-sm text-red-400">{errorText}</p> : null}

      <Tabs defaultValue="admin">
        <TabsList>
          <TabsTrigger value="admin">Admin</TabsTrigger>
          <TabsTrigger value="student">Student</TabsTrigger>
        </TabsList>

        <TabsContent value="admin" className="space-y-2">
          {adminTips.length === 0 ? (
            <div className="rounded-xl border p-4 text-sm text-muted-foreground">No admin tips yet.</div>
          ) : (
            adminTips.map((tip) => <TipRow key={tip.id} tip={tip} />)
          )}
        </TabsContent>

        <TabsContent value="student" className="space-y-2">
          {pendingStudentTips.length === 0 ? (
            <div className="rounded-xl border p-4 text-sm text-muted-foreground">No pending student tips.</div>
          ) : (
            pendingStudentTips.map((tip) => <TipRow key={tip.id} tip={tip} showApprove />)
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Add"} Tip</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Textarea
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              placeholder="Write the full tip that appears on the back of the card."
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
      <label className="text-sm font-medium">{label}</label>
      <input
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
