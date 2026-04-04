import { useState, useEffect } from "react";
import {
  Plus,
  GraduationCap,
  Calendar,
  Clock,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import useUserRole from "../hooks/useUserRole";

const STORAGE_KEYS = {
  coachingRequests: "clara_coaching_requests",
};

const timeSlots = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
];

const getStoredData = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setStoredData = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export default function Coaching() {
  const { user, isPaid } = useUserRole();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    date: "",
    time: "9:00 AM",
    topic: "",
    notes: "",
  });

  useEffect(() => {
    if (!user?.email || !isPaid) {
      setLoading(false);
      return;
    }

    const allRequests = getStoredData(STORAGE_KEYS.coachingRequests);

    const userRequests = allRequests
      .filter((item) => item.created_by === user.email)
      .sort((a, b) => {
        const aDate = new Date(a.created_date || a.created_at || 0).getTime();
        const bDate = new Date(b.created_date || b.created_at || 0).getTime();
        return bDate - aDate;
      });

    setRequests(userRequests);
    setLoading(false);
  }, [user?.email, isPaid]);

  if (!isPaid) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <EmptyState
          icon={GraduationCap}
          title="Coaching is for paid members"
          description="Upgrade to book 1-on-1 coaching sessions."
        />
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!form.date || !form.topic || !user?.email) return;

    const newRequest = {
      id: generateId(),
      created_by: user.email,
      user_name: user.full_name || "User",
      date: form.date,
      time: form.time,
      topic: form.topic.trim(),
      notes: form.notes.trim(),
      status: "pending",
      created_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      session_name: "",
      admin_notes: "",
    };

    const allRequests = getStoredData(STORAGE_KEYS.coachingRequests);
    const updatedRequests = [newRequest, ...allRequests];
    setStoredData(STORAGE_KEYS.coachingRequests, updatedRequests);

    const userRequests = updatedRequests
      .filter((item) => item.created_by === user.email)
      .sort((a, b) => {
        const aDate = new Date(a.created_date || a.created_at || 0).getTime();
        const bDate = new Date(b.created_date || b.created_at || 0).getTime();
        return bDate - aDate;
      });

    setRequests(userRequests);
    setForm({ date: "", time: "9:00 AM", topic: "", notes: "" });
    setOpen(false);
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    approved: "bg-green-100 text-green-700 border border-green-200",
    rejected: "bg-red-100 text-red-700 border border-red-200",
    completed: "bg-slate-100 text-slate-700 border border-slate-200",
  };

  const renderFormattedText = (text) => {
    if (!text) return null;

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      const isUrl = /^https?:\/\/[^\s]+$/.test(part);

      if (isUrl) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary font-medium underline underline-offset-2 break-all"
          >
            Open session link
            <ExternalLink className="w-3 h-3" />
          </a>
        );
      }

      return (
        <span key={index} className="whitespace-pre-wrap break-words">
          {part}
        </span>
      );
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Coaching"
        subtitle="Book a 1-on-1 session"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Book
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Book Coaching Session</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Preferred Date</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Preferred Time</Label>
                  <Select
                    value={form.time}
                    onValueChange={(v) => setForm({ ...form, time: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Topic</Label>
                  <Input
                    placeholder="What would you like help with?"
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Notes (optional)</Label>
                  <Textarea
                    placeholder="Any additional details..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  className="w-full"
                  disabled={!form.date || !form.topic}
                >
                  Request Session
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {requests.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No coaching sessions"
          description="Book your first session to get personalized financial guidance."
        />
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-card rounded-2xl border border-border p-4 md:p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="font-semibold text-base break-words">
                    {req.topic}
                  </p>
                  {req.session_name && (
                    <p className="text-sm text-primary font-medium mt-1">
                      {req.session_name}
                    </p>
                  )}
                </div>

                <span
                  className={`shrink-0 text-xs px-3 py-1 rounded-full font-medium capitalize ${
                    statusColors[req.status] ||
                    "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {req.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {req.date}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {req.time}
                </span>
              </div>

              {req.notes && (
                <div className="mb-3">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                    {req.notes}
                  </p>
                </div>
              )}

              {req.admin_notes && (
                <div className="mt-3 rounded-xl border border-primary/10 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">
                      Coach Response
                    </span>
                  </div>

                  <div className="text-sm leading-7 text-foreground whitespace-pre-wrap break-words space-y-2">
                    {renderFormattedText(req.admin_notes)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}