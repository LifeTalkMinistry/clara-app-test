import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Edit3, Trash2, CheckCircle, XCircle, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "../../components/PageHeader";
import useUserRole from "../../hooks/useUserRole";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { formatSupabaseError } from "@/lib/admin-panel-utils";

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

  async function handleSave() {
    if (!form.text.trim()) {
      toast.error("Tip required");
      return;
    }

    const payload = {
      ...form,
      text: form.text.trim(),
      approved_by: form.status === "active" ? user?.email || null : null,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from("daily_tips").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Updated");
      } else {
        const { error } = await supabase.from("daily_tips").insert([payload]);
        if (error) throw error;
        toast.success("Created");
      }

      setDialogOpen(false);
      setEditingId(null);
      setForm(BLANK);
      loadTips();
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
      const { error } = await supabase
        .from("daily_tips")
        .update({
          status: tip.status === "active" ? "inactive" : "active",
          approved_by: tip.status === "active" ? null : user?.email || null,
        })
        .eq("id", tip.id);

      if (error) throw error;
      loadTips();
    } catch (error) {
      console.error("Failed to toggle daily tip:", error);
      toast.error(formatSupabaseError(error, "Failed to update daily tip."));
    }
  }

  function openEdit(tip) {
    setForm({
      ...BLANK,
      ...tip,
      scheduled_date: tip.scheduled_date || "",
    });
    setEditingId(tip.id);
    setDialogOpen(true);
  }

  if (!isAdmin) return <div className="p-6 text-center">Admin only</div>;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const TipRow = ({ tip, showApprove }) => (
    <div className="bg-white rounded-xl border p-4 flex justify-between gap-3">
      <div className="flex-1">
        <p className="text-sm font-medium">"{tip.text}"</p>
        <div className="text-xs mt-1 flex gap-1 text-muted-foreground">
          <span>{tip.category}</span>
          <span>{tip.audience}</span>
          <span>{tip.status}</span>
        </div>
      </div>

      <div className="flex gap-1">
        {showApprove ? (
          <>
            <Button size="sm" onClick={() => handleApprove(tip)}>
              <CheckCircle className="w-3 h-3" />
            </Button>
            <Button size="sm" onClick={() => handleReject(tip)}>
              <XCircle className="w-3 h-3" />
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={() => handleToggle(tip)}>
            {tip.status === "active" ? <EyeOff /> : <Eye />}
          </Button>
        )}

        <Button size="sm" onClick={() => openEdit(tip)}>
          <Edit3 className="w-3 h-3" />
        </Button>

        <Button size="sm" onClick={() => handleDelete(tip.id)}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <PageHeader
        title="Daily Tips"
        subtitle={`${tips.length} total`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadTips}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Tip
            </Button>
          </div>
        }
      />

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
            adminTips.map((tip) => <TipRow key={tip.id} tip={tip} showApprove={false} />)
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
            />

            <InputRow
              label="Scheduled Date"
              value={form.scheduled_date}
              onChange={(value) => setForm({ ...form, scheduled_date: value })}
              type="date"
            />

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
