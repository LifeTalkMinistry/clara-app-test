import { useState, useEffect } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import axios from "axios";

const API = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export default function AdminEnrollments() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");
  const [newStatus, setNewStatus] = useState("approved");

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    try {
      const res = await API.get("/enrollments");
      setEnrollments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selected) return;

    try {
      const res = await API.put(`/enrollments/${selected.id}`, {
        status: newStatus,
        admin_notes: notes,
      });

      // If approved → update user
      if (newStatus === "approved") {
        await API.patch("/users/update-role", {
          email: selected.created_by,
          role: "paid_user",
          plan: selected.plan,
          enrollment_date: new Date().toISOString().split("T")[0],
          challenge_start_date: new Date().toISOString().split("T")[0],
        });
      }

      setEnrollments((prev) =>
        prev.map((e) => (e.id === selected.id ? res.data : e))
      );

      setSelected(null);
      setNotes("");
    } catch (err) {
      console.error(err);
    }
  };

  const statusColors = {
    pending: "bg-secondary/20 text-secondary-foreground",
    under_review: "bg-accent/20 text-accent-foreground",
    approved: "bg-primary/20 text-primary",
    rejected: "bg-destructive/20 text-destructive",
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-4">
        {enrollments.length} enrollments
      </p>

      {enrollments.map((en) => (
        <div
          key={en.id}
          className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-card rounded-xl border"
        >
          <div className="flex-1">
            <p className="font-medium text-sm">{en.created_by}</p>
            <p className="text-xs text-muted-foreground">
              {en.plan} • {en.payment_method} • ₱{en.amount_paid}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColors[en.status]}`}
            >
              {en.status}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelected(en);
                setNewStatus(en.status);
                setNotes(en.admin_notes || "");
              }}
            >
              <Eye className="w-3 h-3 mr-1" /> Review
            </Button>
          </div>
        </div>
      ))}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Enrollment</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <p>User: {selected.created_by}</p>
                <p>Plan: {selected.plan}</p>
                <p>Method: {selected.payment_method}</p>
                <p>Amount: ₱{selected.amount_paid}</p>
              </div>

              {selected.proof_url && (
                <img
                  src={selected.proof_url}
                  alt="Proof"
                  className="rounded-lg max-h-60 w-full object-contain"
                />
              )}

              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes..."
              />

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