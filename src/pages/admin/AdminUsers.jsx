import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertTriangle
} from "lucide-react";

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import axios from "axios";

const API = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

const CLARA_TIERS = ["free", "basic", "transformation", "elite", "student"];

export default function AdminUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetConfirm, setResetConfirm] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await API.get("/users");
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (id, data) => {
    const res = await API.patch(`/users/${id}`, data);
    setUsers(prev => prev.map(u => u.id === id ? res.data : u));
  };

  const updateRole = (id, role) => {
    updateUser(id, { role });
  };

  const updatePlan = (id, plan) => {
    const role = plan !== "free" ? "paid_user" : "free_user";
    updateUser(id, { plan, role });
  };

  const startJourney = (id) => {
    const today = new Date().toISOString().split("T")[0];
    const end = new Date();
    end.setFullYear(end.getFullYear() + 1);

    updateUser(id, {
      challenge_start_date: today,
      challenge_end_date: end.toISOString().split("T")[0],
      journey_status: "active",
    });
  };

  const resetJourney = async (id) => {
    await updateUser(id, {
      challenge_start_date: null,
      challenge_end_date: null,
      journey_status: null,
    });
    setResetConfirm(null);
  };

  const filtered = users.filter(u =>
    (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading)
    return (
      <div className="flex justify-center h-32 items-center">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-3">
      {/* SEARCH */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} users
      </p>

      {filtered.map(user => (
        <div key={user.id} className="p-3 border rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">
                {(user.full_name || user.email || "?")[0].toUpperCase()}
              </span>
            </div>

            <div className="flex-1">
              <p className="text-sm font-medium">
                {user.full_name || "No name"}
              </p>
              <p className="text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/admin/student/${user.id}`)}
            >
              View <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>

          <div className="flex gap-2 mt-2">
            <Select value={user.role || "free_user"} onValueChange={(v) => updateRole(user.id, v)}>
              <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free_user">Free</SelectItem>
                <SelectItem value="paid_user">Paid</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>

            <Select value={user.plan || "free"} onValueChange={(v) => updatePlan(user.id, v)}>
              <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLARA_TIERS.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* JOURNEY */}
          <div className="mt-2 text-xs flex items-center gap-2">
            {user.challenge_start_date ? (
              <>
                <CheckCircle className="w-3 h-3 text-primary" />
                Active
              </>
            ) : (
              <>
                <Clock className="w-3 h-3 text-muted-foreground" />
                Not started
              </>
            )}
          </div>
        </div>
      ))}

      {/* RESET */}
      <Dialog open={!!resetConfirm} onOpenChange={() => setResetConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Journey</DialogTitle>
          </DialogHeader>

          <div className="flex gap-3">
            <Button onClick={() => setResetConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => resetJourney(resetConfirm)}
            >
              Reset
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}