import { useState, useEffect } from "react";
import { Plus, Edit3, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import PageHeader from "../../components/PageHeader";
import useUserRole from "../../hooks/useUserRole";
import axios from "axios";
import { toast } from "sonner";

const API = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

const CATEGORIES = ["social_posts", "images", "captions", "program_explainers", "ambassador_training", "other"];
const TYPES = ["image", "file", "link", "text"];

export default function AdminReferralMaterials() {
  const { isAdmin } = useUserRole();

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

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

  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    try {
      const res = await API.get("/referral-materials");
      setMaterials(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
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
      if (editingId) {
        await API.put(`/referral-materials/${editingId}`, form);
        toast.success("Updated");
      } else {
        await API.post("/referral-materials", form);
        toast.success("Created");
      }

      setDialogOpen(false);
      setEditingId(null);
      setForm(EMPTY);
      loadMaterials();

    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this material?")) return;

    await API.delete(`/referral-materials/${id}`);
    toast.success("Deleted");
    loadMaterials();
  };

  const handleEdit = (mat) => {
    setForm(mat);
    setEditingId(mat.id);
    setDialogOpen(true);
  };

  const handleToggleActive = async (mat) => {
    await API.patch(`/referral-materials/${mat.id}`, {
      is_active: !mat.is_active,
    });

    toast.success(mat.is_active ? "Hidden" : "Visible");
    loadMaterials();
  };

  if (!isAdmin)
    return <div className="p-6 text-center text-muted-foreground">Admin only.</div>;

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Referral Materials"
        subtitle="Manage content for ambassadors"
        action={
          <Button onClick={() => {
            setEditingId(null);
            setForm(EMPTY);
            setDialogOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" /> Add
          </Button>
        }
      />

      <div className="space-y-2">
        {materials.map(mat => (
          <div key={mat.id} className="bg-white rounded-xl border p-4 flex justify-between gap-4">
            <div className="flex-1">
              <h4 className="font-semibold">{mat.title}</h4>
              <p className="text-xs text-muted-foreground">{mat.category}</p>
              {mat.file_url && <p className="text-xs text-blue-500 truncate">{mat.file_url}</p>}
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleToggleActive(mat)}>
                {mat.is_active ? <Eye /> : <EyeOff />}
              </Button>

              <Button size="sm" variant="outline" onClick={() => handleEdit(mat)}>
                <Edit3 />
              </Button>

              <Button size="sm" variant="outline" onClick={() => handleDelete(mat.id)}>
                <Trash2 />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Create"} Material</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Title"
            />

            <Textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Description"
            />

            <Select
              value={form.category}
              onValueChange={v => setForm({ ...form, category: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={form.type}
              onValueChange={v => setForm({ ...form, type: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {form.type !== "text" ? (
              <Input
                value={form.file_url}
                onChange={e => setForm({ ...form, file_url: e.target.value })}
                placeholder="URL"
              />
            ) : (
              <Textarea
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
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