import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Edit, Trash2, Unlock, Lock, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabaseClient";
import { formatSupabaseError, uploadPublicFile } from "@/lib/admin-panel-utils";

const MODULE_BUCKET = "module-assets";

const EMPTY = {
  title: "",
  description: "",
  content: "",
  week: 1,
  order: 1,
  is_published: false,
  is_activated: false,
  video_url: "",
  resource_url: "",
  resource_label: "",
};

function normalizeModule(module = {}) {
  return {
    ...module,
    week: Number(module.week ?? module.week_number ?? 1),
    order: Number(module.order ?? module.sort_order ?? 1),
    is_published: Boolean(module.is_published),
    is_activated: Boolean(module.is_activated),
    title: module.title || "",
    description: module.description || "",
    content: module.content || "",
    video_url: module.video_url || "",
    resource_url: module.resource_url || "",
    resource_label: module.resource_label || "",
  };
}

function toPayload(form) {
  const week = Number(form.week || 1);
  const order = Number(form.order || 1);

  return {
    title: form.title.trim(),
    description: form.description.trim(),
    content: form.content.trim(),
    week,
    week_number: week,
    order,
    sort_order: order,
    is_published: Boolean(form.is_published),
    is_activated: Boolean(form.is_activated),
    status: form.is_activated ? "active" : "inactive",
    video_url: form.video_url.trim() || null,
    resource_url: form.resource_url.trim() || null,
    resource_label: form.resource_label.trim() || null,
  };
}

export default function AdminModules() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [uploading, setUploading] = useState({ video: false, resource: false });

  const sortedModules = useMemo(
    () =>
      [...modules].sort((a, b) => {
        const weekDiff = Number(a.week || 0) - Number(b.week || 0);
        if (weekDiff !== 0) return weekDiff;
        return Number(a.order || 0) - Number(b.order || 0);
      }),
    [modules]
  );

  const fetchModules = useCallback(async (soft = false) => {
    try {
      if (soft) setRefreshing(true);
      else setLoading(true);

      setErrorText("");

      const { data, error } = await supabase
        .from("modules")
        .select("*")
        .order("week_number", { ascending: true })
        .order("sort_order", { ascending: true });

      if (error) throw error;

      setModules((data || []).map(normalizeModule));
    } catch (error) {
      console.error("Failed to fetch modules:", error);
      setModules([]);
      setErrorText(formatSupabaseError(error, "Failed to load modules."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  function resetForm() {
    setForm(EMPTY);
    setEditId(null);
    setOpen(false);
  }

  async function handleUpload(file, field) {
    if (!file) return;

    setUploading((prev) => ({ ...prev, [field]: true }));
    setErrorText("");

    try {
      const publicUrl = await uploadPublicFile({
        bucket: MODULE_BUCKET,
        file,
        folder: `modules/${field}`,
      });

      setForm((prev) => ({ ...prev, [`${field}_url`]: publicUrl }));
    } catch (error) {
      console.error("Module upload failed:", error);
      setErrorText(error.message || "Failed to upload module file.");
      alert(error.message || "Failed to upload module file.");
    } finally {
      setUploading((prev) => ({ ...prev, [field]: false }));
    }
  }

  async function handleSave() {
    if (!form.title.trim()) {
      alert("Title is required.");
      return;
    }

    setSaving(true);
    setErrorText("");

    try {
      const payload = toPayload(form);

      if (editId) {
        const { data, error } = await supabase
          .from("modules")
          .update(payload)
          .eq("id", editId)
          .select()
          .single();

        if (error) throw error;

        setModules((prev) =>
          prev.map((item) => (item.id === editId ? normalizeModule(data) : item))
        );
      } else {
        const { data, error } = await supabase
          .from("modules")
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        setModules((prev) => [...prev, normalizeModule(data)]);
      }

      resetForm();
    } catch (error) {
      console.error("Failed to save module:", error);
      setErrorText(formatSupabaseError(error, "Failed to save module."));
      alert(formatSupabaseError(error, "Failed to save module."));
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate(module, activate) {
    try {
      const { data, error } = await supabase
        .from("modules")
        .update({
          is_activated: activate,
          status: activate ? "active" : "inactive",
        })
        .eq("id", module.id)
        .select()
        .single();

      if (error) throw error;

      setModules((prev) =>
        prev.map((item) => (item.id === module.id ? normalizeModule(data) : item))
      );
    } catch (error) {
      console.error("Failed to update module access:", error);
      alert(formatSupabaseError(error, "Failed to update module status."));
    }
  }

  function handleEdit(module) {
    setForm(normalizeModule(module));
    setEditId(module.id);
    setOpen(true);
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this module?");
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("modules").delete().eq("id", id);
      if (error) throw error;

      setModules((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Failed to delete module:", error);
      alert(formatSupabaseError(error, "Failed to delete module."));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Modules</p>
          <p className="text-xs text-muted-foreground">
            {sortedModules.length} module{sortedModules.length !== 1 ? "s" : ""}
          </p>
          {errorText ? <p className="mt-1 text-sm text-red-400">{errorText}</p> : null}
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => fetchModules(true)} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Dialog
            open={open}
            onOpenChange={(value) => {
              if (!value) resetForm();
              else setOpen(value);
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" /> Add Module
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editId ? "Edit" : "Create"} Module</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <Input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Title"
                />

                <Input
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Description"
                />

                <Textarea
                  value={form.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                  rows={6}
                  placeholder="Module content"
                />

                <div className="space-y-2">
                  <Label>Video File</Label>
                  <Input
                    type="file"
                    onChange={(e) => handleUpload(e.target.files?.[0], "video")}
                  />
                  <Input
                    value={form.video_url}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, video_url: e.target.value }))
                    }
                    placeholder="Video URL"
                  />
                  {uploading.video ? (
                    <p className="text-xs text-muted-foreground">Uploading video...</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Resource File</Label>
                  <Input
                    type="file"
                    onChange={(e) => handleUpload(e.target.files?.[0], "resource")}
                  />
                  <Input
                    value={form.resource_url}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, resource_url: e.target.value }))
                    }
                    placeholder="Resource URL"
                  />
                  {uploading.resource ? (
                    <p className="text-xs text-muted-foreground">Uploading resource...</p>
                  ) : null}
                </div>

                <Input
                  value={form.resource_label}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, resource_label: e.target.value }))
                  }
                  placeholder="Resource Label"
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="number"
                    value={form.week}
                    onChange={(e) => setForm((prev) => ({ ...prev, week: e.target.value }))}
                  />
                  <Input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm((prev) => ({ ...prev, order: e.target.value }))}
                  />
                </div>

                <div className="flex gap-2">
                  <Switch
                    checked={form.is_published}
                    onCheckedChange={(value) =>
                      setForm((prev) => ({ ...prev, is_published: value }))
                    }
                  />
                  <Label>Published</Label>
                </div>

                <div className="flex gap-2">
                  <Switch
                    checked={form.is_activated}
                    onCheckedChange={(value) =>
                      setForm((prev) => ({ ...prev, is_activated: value }))
                    }
                  />
                  <Label>Activated</Label>
                </div>

                <Button onClick={handleSave} className="w-full" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editId ? (
                    "Update Module"
                  ) : (
                    "Create Module"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-2">
        {sortedModules.length === 0 ? (
          <div className="rounded-xl border p-6 text-sm text-muted-foreground">
            No modules found.
          </div>
        ) : (
          sortedModules.map((module) => (
            <div key={module.id} className="flex items-center gap-3 p-3 bg-card rounded-xl border">
              <div className="flex-1">
                <p className="text-sm font-medium">{module.title}</p>
                <p className="text-xs text-muted-foreground">
                  Week {module.week} • #{module.order}
                </p>
              </div>

              {module.is_activated ? (
                <Button size="sm" onClick={() => handleActivate(module, false)}>
                  <Lock className="w-3 h-3 mr-1" /> Lock
                </Button>
              ) : (
                <Button size="sm" onClick={() => handleActivate(module, true)}>
                  <Unlock className="w-3 h-3 mr-1" /> Activate
                </Button>
              )}

              <Button size="icon" onClick={() => handleEdit(module)}>
                <Edit className="w-4 h-4" />
              </Button>

              <Button size="icon" onClick={() => handleDelete(module.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
