import { useState, useEffect } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import axios from "axios";

const API = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export default function AdminCoaching() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("pending");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await API.get("/coaching-requests");
      setRequests(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selected) return;

    try {
      const res = await API.put(`/coaching-requests/${selected.id}`, {
        status,
        admin_notes: notes,
      });

      setRequests((prev) =>
        prev.map((r) => (r.id === selected.id ? res.data : r))
      );

      setSelected(null);
    } catch (err) {
      console.error(err);
    }
  };

  const statusColors = {
    pending: "bg-secondary/20 text-secondary-foreground",
    approved: "bg-primary/20 text-primary",
    rejected: "bg-destructive/20 text-destructive",
    completed: "bg-muted text-muted-foreground",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-4">
        {requests.length} coaching requests
      </p>

      {requests.map((r) => (
        <div
          key={r.id}
          className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-card rounded-xl border"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">
              {r.user_name || r.created_by}
            </p>

            <p className="text-xs text-muted-foreground">
              {r.topic} • {r.date} at {r.time}
            </p>

            <p className="text-xs font-medium text-primary mt-1">
              {r.session_type === "session_1"
                ? "Session 1: Financial Reset"
                : "Session 2: Progress Review"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[r.status]}`}
            >
              {r.status}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelected(r);
                setStatus(r.status);
                setNotes(r.admin_notes || "");
              }}
            >
              <Eye className="w-3 h-3 mr-1" /> Manage
            </Button>
          </div>
        </div>
      ))}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Coaching Request</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">User:</span>{" "}
                  {selected.user_name || selected.created_by}
                </p>

                <p>
                  <span className="text-muted-foreground">Session:</span>{" "}
                  {selected.session_type === "session_1"
                    ? "Session 1: Financial Reset"
                    : "Session 2: Progress Review"}
                </p>

                <p>
                  <span className="text-muted-foreground">Topic:</span>{" "}
                  {selected.topic}
                </p>

                <p>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  {selected.date} at {selected.time}
                </p>

                {selected.notes && (
                  <p>
                    <span className="text-muted-foreground">Notes:</span>{" "}
                    {selected.notes}
                  </p>
                )}
              </div>

              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Admin Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <Button onClick={handleUpdate} className="w-full">
                Update
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}