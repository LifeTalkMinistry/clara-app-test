import { useState, useEffect } from "react";
import { Plus, Edit3, Trash2, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "../../components/PageHeader";
import useUserRole from "../../hooks/useUserRole";
import { toast } from "sonner";
import axios from "axios";

const API = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

const CATEGORIES = ["mindset","budgeting","savings","spending","investing","habits","system"];
const AUDIENCES = ["all","free","pending","paid"];

const BLANK = {
  text: "",
  category: "mindset",
  audience: "all",
  status: "active",
  source: "admin",
  scheduled_date: ""
};

export default function AdminDailyTips() {
  const { isAdmin, user } = useUserRole();

  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK);

  useEffect(() => {
    if (isAdmin) loadTips();
  }, [isAdmin]);

  const loadTips = async () => {
    try {
      const res = await API.get("/daily-tips");
      setTips(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.text.trim()) return toast.error("Tip required");

    const data = {
      ...form,
      approved_by: form.status === "active" ? user?.email : null,
    };

    try {
      if (editingId) {
        await API.put(`/daily-tips/${editingId}`, data);
        toast.success("Updated");
      } else {
        await API.post("/daily-tips", data);
        toast.success("Created");
      }

      setDialogOpen(false);
      setEditingId(null);
      setForm(BLANK);
      loadTips();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete?")) return;
    await API.delete(`/daily-tips/${id}`);
    loadTips();
  };

  const handleApprove = async (tip) => {
    await API.patch(`/daily-tips/${tip.id}`, {
      status: "active",
      approved_by: user?.email,
    });
    loadTips();
  };

  const handleReject = async (tip) => {
    await API.patch(`/daily-tips/${tip.id}`, {
      status: "inactive",
    });
    loadTips();
  };

  const handleToggle = async (tip) => {
    await API.patch(`/daily-tips/${tip.id}`, {
      status: tip.status === "active" ? "inactive" : "active",
    });
    loadTips();
  };

  const openEdit = (tip) => {
    setForm(tip);
    setEditingId(tip.id);
    setDialogOpen(true);
  };

  if (!isAdmin) return <div className="p-6 text-center">Admin only</div>;

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );

  const adminTips = tips.filter(t => t.source === "admin");
  const studentTips = tips.filter(t => t.source === "student");
  const pendingStudentTips = studentTips.filter(t => t.status === "pending");

  const TipRow = ({ tip, showApprove }) => (
    <div className="bg-white rounded-xl border p-4 flex justify-between gap-3">
      <div className="flex-1">
        <p className="text-sm font-medium">"{tip.text}"</p>
        <div className="text-xs mt-1 flex gap-1">
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
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Tip
          </Button>
        }
      />

      <Tabs defaultValue="admin">
        <TabsList>
          <TabsTrigger value="admin">Admin</TabsTrigger>
          <TabsTrigger value="student">Student</TabsTrigger>
        </TabsList>

        <TabsContent value="admin">
          {adminTips.map(tip => (
            <TipRow key={tip.id} tip={tip} showApprove={false} />
          ))}
        </TabsContent>

        <TabsContent value="student">
          {pendingStudentTips.map(tip => (
            <TipRow key={tip.id} tip={tip} showApprove={true} />
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Add"} Tip</DialogTitle>
          </DialogHeader>

          <Textarea
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
          />

          <Button onClick={handleSave}>Save</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}