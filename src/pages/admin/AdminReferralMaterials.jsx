import { useCallback, useEffect, useState } from "react";
import { Plus, Edit3, Trash2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import PageHeader from "../../components/PageHeader";
import useUserRole from "../../hooks/useUserRole";
import { supabase } from "@/lib/supabaseClient";
import { formatSupabaseError } from "@/lib/admin-panel-utils";
import { toast } from "sonner";

const CATEGORIES = ["social_posts", "images", "captions", "program_explainers", "ambassador_training", "other"];
const TYPES = ["image", "file", "link", "text"];

const EMPTY = {
  title: "",
  description: "",
  category: "social_posts",
  type: "image",
  file_url: "",
  content: "",
  is_active: true,
  sort_order: 0,
};

export default function AdminReferralMaterials() {
  const { isAdmin } = useUserRole();

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errorText, setErrorText] = useState("");

  const loadMaterials = useCallback(async () => {
    try {
      setLoading(true);
      setErrorText("");

      const { data, error } = await supabase
        .from("referral_materials")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error("Failed to load referral materials:", error);
      setMaterials([]);
      setErrorText(formatSupabaseError(error, "Failed to load referral materials."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadMaterials();
  }, [isAdmin, loadMaterials]);

  async function handleSave() {
    if (!form.title || !form.category) {
      toast.error("Title and category required");
      return;
    }

    if (["image", "file", "link"].includes(form.type) && !form.file_url) {
      toast.error(`URL required for ${form.type}`);
      return;
    }

    if (form.type === "text" && !form.content) {
      toast.error("Content required");
      return;
    }

    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        file_url: form.file_url.trim() || null,
        content: form.content.trim() || null,
        sort_order: Number(form.sort_order || 0),
      };

      if (editingId) {
        const { error } = await supabase
          .from("referral_materials")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Updated");
      } else {
        const { error } = await supabase.from("referral_materials").insert([payload]);
        if (error) throw error;
        toast.success("Created");
      }

      setDialogOpen(false);
      setEditingId(null);
      setForm(EMPTY);
      loadMaterials();
    } catch (error) {
      console.error("Failed to save referral material:", error);
      toast.error(formatSupabaseError(error, "Failed to save referral material."));
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this material?")) return;

    try {
      const { error } = await supabase.from("referral_materials").delete().eq("id", id);
      if (error) throw error;
      toast.success("Deleted");
      loadMaterials();
    } catch (error) {
      console.error("Failed to delete referral material:", error);
      toast.error(formatSupabaseError(error, "Failed to delete referral material."));
    }
  }

  function handleEdit(material) {
    setForm({ ...EMPTY, ...material });
    setEditingId(material.id);
    setDialogOpen(true);
  }

  async function handleToggleActive(material) {
    try {
      const { error } = await supabase
        .from("referral_materials")
        .update({ is_active: !material.is_active })
        .eq("id", material.id);

      if (error) throw error;

      toast.success(material.is_active ? "Hidden" : "Visible");
      loadMaterials();
    } catch (error) {
      console.error("Failed to toggle referral material:", error);
      toast.error(formatSupabaseError(error, "Failed to update referral material."));
    }
  }

  if (!isAdmin) {
    return <div className="p-6 text-center text-muted-foreground">Admin only.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Referral Materials"
        subtitle="Manage content for ambassadors"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadMaterials}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY);
                setDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Add
            </Button>
          </div>
        }
      />

      {errorText ? <p className="mb-4 text-sm text-red-400">{errorText}</p> : null}

      <div className="space-y-2">
        {materials.length === 0 ? (
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">No referral materials found.</div>
        ) : (
          materials.map((material) => (
            <div key={material.id} className="bg-white rounded-xl border p-4 flex justify-between gap-4">
              <div className="flex-1">
                <h4 className="font-semibold">{material.title}</h4>
                <p className="text-xs text-muted-foreground">{material.category}</p>
                {material.file_url ? (
                  <p className="text-xs text-blue-500 truncate">{material.file_url}</p>
                ) : null}
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleToggleActive(material)}>
                  {material.is_active ? <Eye /> : <EyeOff />}
                </Button>

                <Button size="sm" variant="outline" onClick={() => handleEdit(material)}>
                  <Edit3 />
                </Button>

                <Button size="sm" variant="outline" onClick={() => handleDelete(material.id)}>
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Create"} Material</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Title"
            />

            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description"
            />

            <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {form.type !== "text" ? (
              <Input
                value={form.file_url}
                onChange={(e) => setForm({ ...form, file_url: e.target.value })}
                placeholder="URL"
              />
            ) : (
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Content"
              />
            )}

            <Button onClick={handleSave} className="w-full">
              {editingId ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
