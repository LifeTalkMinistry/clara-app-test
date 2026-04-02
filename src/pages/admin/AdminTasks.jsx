import { useState, useEffect } from "react";
import {
  Plus, Edit, Eye, Shield, MicVocal,
  CheckCircle, XCircle, MessageSquare,
  Calendar, FileText, Image, ExternalLink
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import axios from "axios";
import TaskFormModal, { TASK_BLANK } from "../../components/TaskFormModal";

const API = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export default function AdminTasks() {
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [subDialog, setSubDialog] = useState(null);

  const [form, setForm] = useState(TASK_BLANK);
  const [editId, setEditId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tasksRes, subsRes] = await Promise.all([
        API.get("/tasks"),
        API.get("/task-submissions"),
      ]);

      setTasks(tasksRes.data);
      setSubmissions(subsRes.data);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data, duplicate = false) => {
    try {
      if (editId && !duplicate) {
        const res = await API.put(`/tasks/${editId}`, data);
        setTasks(prev => prev.map(t => t.id === editId ? res.data : t));
      } else {
        const res = await API.post("/tasks", data);
        setTasks(prev => [...prev, res.data]);
      }
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setForm(TASK_BLANK);
    setEditId(null);
    setOpen(false);
  };

  const handleEdit = (task) => {
    setForm(task);
    setEditId(task.id);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this task?")) return;
    await API.delete(`/tasks/${id}`);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const updateSubmission = async (id, data) => {
    const res = await API.patch(`/task-submissions/${id}`, data);
    setSubmissions(prev =>
      prev.map(s => s.id === id ? res.data : s)
    );
  };

  const handleSubmissionReview = async (sub, status) => {
    const task = tasks.find(t => t.id === sub.task_id);
    const points = status === "approved" ? (task?.points || 0) : 0;

    await updateSubmission(sub.id, {
      status,
      admin_notes: reviewNotes,
      points_earned: points,
    });

    setSubDialog(null);
    setReviewNotes("");
  };

  if (loading)
    return (
      <div className="flex justify-center h-32 items-center">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );

  return (
    <div>
      <TaskFormModal
        open={open}
        onClose={resetForm}
        editId={editId}
        initialForm={form}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <Tabs defaultValue="tasks">
        <TabsList className="mb-4">
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="subs">Submissions ({submissions.length})</TabsTrigger>
        </TabsList>

        {/* TASKS */}
        <TabsContent value="tasks">
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Task
          </Button>

          <div className="space-y-2 mt-3">
            {tasks.map(t => (
              <div key={t.id} className="flex p-3 border rounded-xl">
                <div className="flex-1">
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Week {t.week}
                  </p>
                </div>

                <Button size="icon" onClick={() => handleEdit(t)}>
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* SUBMISSIONS */}
        <TabsContent value="subs">
          <div className="space-y-2">
            {submissions.map(s => (
              <div key={s.id} className="p-3 border rounded-xl flex justify-between">
                <div>
                  <p className="text-sm">{s.student_name}</p>
                  <p className="text-xs text-muted-foreground">{s.content}</p>
                </div>

                <Button size="sm" onClick={() => setSubDialog(s)}>
                  <Eye className="w-3 h-3 mr-1" /> Review
                </Button>
              </div>
            ))}
          </div>

          <Dialog open={!!subDialog} onOpenChange={() => setSubDialog(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Review</DialogTitle>
              </DialogHeader>

              {subDialog && (
                <div className="space-y-3">
                  <p>{subDialog.content}</p>

                  {subDialog.file_url && (
                    <a href={subDialog.file_url} target="_blank">
                      <Button variant="outline">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Open File
                      </Button>
                    </a>
                  )}

                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Feedback"
                  />

                  <div className="flex gap-2">
                    <Button onClick={() => handleSubmissionReview(subDialog, "approved")}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </Button>

                    <Button variant="outline" onClick={() => handleSubmissionReview(subDialog, "needs_revision")}>
                      <MessageSquare className="w-4 h-4 mr-1" /> Revise
                    </Button>

                    <Button variant="destructive" onClick={() => handleSubmissionReview(subDialog, "rejected")}>
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}