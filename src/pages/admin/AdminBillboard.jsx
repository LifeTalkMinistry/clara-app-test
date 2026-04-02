import { useState, useEffect } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
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
  body: "",
  media_url: "",
  media_type: "none",
  file_name: "",
  is_active: true,
  sort_order: 1,
};

export default function AdminBillboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await API.get("/billboards");
      setItems(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await API.post("/upload", formData);
      const file_url = res.data.url;

      let media_type = "file";
      if (file.type.startsWith("video/")) media_type = "video";
      else if (file.type.startsWith("image/")) media_type = "image";
      else if (file.type === "application/pdf") media_type = "pdf";

      setForm((f) => ({
        ...f,
        media_url: file_url,
        media_type,
        file_name: file.name,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title) return;

    const data = {
      ...form,
      sort_order: parseInt(form.sort_order) || 1,
    };

    try {
      if (editId) {
        const res = await API.put(`/billboards/${editId}`, data);
        setItems(items.map((i) => (i.id === editId ? res.data : i)));
      } else {
        const res = await API.post("/billboards", data);
        setItems([...items, res.data]);
      }

      setForm(EMPTY);
      setEditId(null);
      setOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (item) => {
    setForm({ ...item });
    setEditId(item.id);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/billboards/${id}`);
      setItems(items.filter((i) => i.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleActive = async (item) => {
    try {
      const res = await API.patch(`/billboards/${item.id}`, {
        is_active: !item.is_active,
      });
      setItems(items.map((i) => (i.id === item.id ? res.data : i)));
    } catch (err) {
      console.error(err);
    }
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
        <Dialog
          open={open}
          onOpenChange={(v) => {
            if (!v) {
              setForm(EMPTY);
              setEditId(null);
            }
            setOpen(v);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Announcement
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editId ? "Edit" : "New"} Announcement
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Body</Label>
                <Textarea
                  value={form.body}
                  onChange={(e) =>
                    setForm({ ...form, body: e.target.value })
                  }
                />
              </div>

              <Input type="file" onChange={handleUpload} disabled={uploading} />

              <Input
                value={form.media_url}
                onChange={(e) =>
                  setForm({ ...form, media_url: e.target.value })
                }
                placeholder="Paste URL"
              />

              {form.media_url && (
                <Select
                  value={form.media_type}
                  onValueChange={(v) =>
                    setForm({ ...form, media_type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="file">File</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Button onClick={handleSave} className="w-full">
                {editId ? "Update" : "Post"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 bg-card rounded-xl border"
          >
            <div className="flex-1">
              <p className="font-semibold text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {item.body}
              </p>
            </div>

            <Switch
              checked={item.is_active}
              onCheckedChange={() => toggleActive(item)}
            />

            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleEdit(item)}
            >
              <Edit className="w-4 h-4" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleDelete(item.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}