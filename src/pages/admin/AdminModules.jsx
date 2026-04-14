import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Unlock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import axios from "axios";

const API = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

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

export default function AdminModules() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [, setUploading] = useState({ video: false, resource: false });

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const res = await API.get("/modules");
      setModules(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await API.post("/upload", formData);
    return res.data.url;
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading((u) => ({ ...u, video: true }));
    try {
      const url = await uploadFile(file);
      setForm((f) => ({ ...f, video_url: url }));
    } catch (err) {
      console.error(err);
    } finally {
      setUploading((u) => ({ ...u, video: false }));
    }
  };

  const handleResourceUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading((u) => ({ ...u, resource: true }));
    try {
      const url = await uploadFile(file);
      setForm((f) => ({ ...f, resource_url: url }));
    } catch (err) {
      console.error(err);
    } finally {
      setUploading((u) => ({ ...u, resource: false }));
    }
  };

  const handleSave = async () => {
    if (!form.title) return;

    const data = {
      ...form,
      week: parseInt(form.week),
      order: parseInt(form.order),
    };

    try {
      if (editId) {
        const res = await API.put(`/modules/${editId}`, data);
        setModules((prev) =>
          prev.map((m) => (m.id === editId ? res.data : m))
        );
      } else {
        const res = await API.post("/modules", data);
        setModules((prev) => [...prev, res.data]);
      }

      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setForm(EMPTY);
    setEditId(null);
    setOpen(false);
  };

  const handleActivate = async (mod, activate) => {
    try {
      const res = await API.patch(`/modules/${mod.id}`, {
        is_activated: activate,
      });

      setModules((prev) =>
        prev.map((m) => (m.id === mod.id ? res.data : m))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (mod) => {
    setForm({ ...mod });
    setEditId(mod.id);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    await API.delete(`/modules/${id}`);
    setModules((prev) => prev.filter((m) => m.id !== id));
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );

  return (
    <div>
      <div className="mb-4">
        <Dialog open={open} onOpenChange={(v) => (!v ? resetForm() : setOpen(v))}>
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
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Title"
              />

              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Description"
              />

              <Textarea
                value={form.content}
                onChange={(e) =>
                  setForm({ ...form, content: e.target.value })
                }
                rows={6}
              />

              <Input type="file" onChange={handleVideoUpload} />
              <Input
                value={form.video_url}
                onChange={(e) =>
                  setForm({ ...form, video_url: e.target.value })
                }
                placeholder="Video URL"
              />

              <Input type="file" onChange={handleResourceUpload} />
              <Input
                value={form.resource_url}
                onChange={(e) =>
                  setForm({ ...form, resource_url: e.target.value })
                }
                placeholder="Resource URL"
              />

              <Input
                value={form.resource_label}
                onChange={(e) =>
                  setForm({ ...form, resource_label: e.target.value })
                }
                placeholder="Resource Label"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  value={form.week}
                  onChange={(e) =>
                    setForm({ ...form, week: e.target.value })
                  }
                />
                <Input
                  type="number"
                  value={form.order}
                  onChange={(e) =>
                    setForm({ ...form, order: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-2">
                <Switch
                  checked={form.is_published}
                  onCheckedChange={(v) =>
                    setForm({ ...form, is_published: v })
                  }
                />
                <Label>Published</Label>
              </div>

              <div className="flex gap-2">
                <Switch
                  checked={form.is_activated}
                  onCheckedChange={(v) =>
                    setForm({ ...form, is_activated: v })
                  }
                />
                <Label>Activated</Label>
              </div>

              <Button onClick={handleSave} className="w-full">
                {editId ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {modules.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 p-3 bg-card rounded-xl border"
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{m.title}</p>
              <p className="text-xs text-muted-foreground">
                W{m.week} • #{m.order}
              </p>
            </div>

            {m.is_activated ? (
              <Button
                size="sm"
                onClick={() => handleActivate(m, false)}
              >
                <Lock className="w-3 h-3 mr-1" /> Lock
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => handleActivate(m, true)}
              >
                <Unlock className="w-3 h-3 mr-1" /> Activate
              </Button>
            )}

            <Button size="icon" onClick={() => handleEdit(m)}>
              <Edit className="w-4 h-4" />
            </Button>

            <Button size="icon" onClick={() => handleDelete(m.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
