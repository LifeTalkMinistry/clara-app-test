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
import useUserRole from "../hooks/useUserRole";

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

function EmptyCoachingState({ isPaid, onBook }) {
  if (!isPaid) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-8 text-center text-white">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
          <GraduationCap className="w-7 h-7 text-emerald-400" />
        </div>

        <h3 className="text-lg font-semibold text-white mb-2">
          Coaching is for paid members
        </h3>

        <p className="text-sm text-white/60 max-w-md mx-auto">
          Upgrade to book 1-on-1 coaching sessions.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-8 text-center text-white">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
        <GraduationCap className="w-7 h-7 text-emerald-400" />
      </div>

      <h3 className="text-lg font-semibold text-white mb-2">
        No coaching sessions
      </h3>

      <p className="text-sm text-white/60 max-w-md mx-auto mb-5">
        Book your first session to get personalized financial guidance.
      </p>

      <Button onClick={onBook}>
        <Plus className="w-4 h-4 mr-1" />
        Book Session
      </Button>
    </div>
  );
}

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

    fetch(`/api/coaching?email=${encodeURIComponent(user.email)}`)
      .then((res) => res.json())
      .then((data) => {
        setRequests(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.email, isPaid]);

  const handleSubmit = async () => {
    if (!form.date || !form.topic.trim()) return;

    try {
      const res = await fetch("/api/coaching", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          topic: form.topic.trim(),
          user_email: user.email,
          user_name: user.full_name || "User",
          status: "pending",
        }),
      });

      const newReq = await res.json();
      setRequests((prev) => [newReq, ...prev]);
      setForm({ date: "", time: "9:00 AM", topic: "", notes: "" });
      setOpen(false);
    } catch (error) {
      console.error("Failed to submit coaching request:", error);
    }
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
      if (/^https?:\/\/[^\s]+$/.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-emerald-400 font-medium underline underline-offset-2 break-all"
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
        <div className="w-6 h-6 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto text-white">
      <PageHeader
        title="Coaching"
        subtitle="Book a 1-on-1 session"
        action={
          isPaid ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Book
                </Button>
              </DialogTrigger>

              <DialogContent className="bg-[#0F172A] border border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle>Book Coaching Session</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label>Preferred Date</Label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) =>
                        setForm({ ...form, date: e.target.value })
                      }
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
                      onChange={(e) =>
                        setForm({ ...form, topic: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label>Notes (optional)</Label>
                    <Textarea
                      placeholder="Any additional details..."
                      value={form.notes}
                      onChange={(e) =>
                        setForm({ ...form, notes: e.target.value })
                      }
                      rows={3}
                    />
                  </div>

                  <Button
                    onClick={handleSubmit}
                    className="w-full"
                    disabled={!form.date || !form.topic.trim()}
                  >
                    Request Session
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      {requests.length === 0 ? (
        <EmptyCoachingState isPaid={isPaid} onBook={() => setOpen(true)} />
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className="rounded-2xl border border-white/10 bg-[#0F172A] p-4 md:p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="font-semibold text-base break-words text-white">
                    {req.topic}
                  </p>

                  {req.session_name && (
                    <p className="text-sm text-emerald-400 font-medium mt-1">
                      {req.session_name}
                    </p>
                  )}
                </div>

                <span
                  className={`shrink-0 text-xs px-3 py-1 rounded-full font-medium capitalize ${
                    statusColors[req.status] ||
                    "bg-white/10 text-white/70 border border-white/10"
                  }`}
                >
                  {req.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-white/60 mb-3">
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
                  <p className="text-sm text-white/60 whitespace-pre-wrap break-words">
                    {req.notes}
                  </p>
                </div>
              )}

              {req.admin_notes && (
                <div className="mt-3 rounded-xl border border-emerald-400/10 bg-emerald-400/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-white">
                      Coach Response
                    </span>
                  </div>

                  <div className="text-sm leading-7 text-white whitespace-pre-wrap break-words space-y-2">
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