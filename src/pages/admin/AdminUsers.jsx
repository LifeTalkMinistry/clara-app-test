import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ChevronRight,
  RefreshCw,
  Shield,
  User,
  RotateCcw,
} from "lucide-react";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { resetUserAccount } from "@/lib/admin-user-reset";
import { CURRENT_PLAN_KEYS, PLAN_LABELS, normalizePlanKey } from "@/lib/plan-config";

const CLARA_TIERS = CURRENT_PLAN_KEYS;
const USER_ROLES = ["free_user", "paid_user", "admin"];

export default function AdminUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, plan, role");

      if (error) {
        console.error("Load users error:", error);
        setUsers([]);
        return;
      }

      const sortedUsers = [...(data || [])].sort((a, b) => {
        const nameA = (a.full_name || a.email || "").toLowerCase();
        const nameB = (b.full_name || b.email || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setUsers(sortedUsers);
    } catch (error) {
      console.error("Unexpected load users error:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateUser(id, updates) {
    try {
      setActionLoadingId(id);

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", id)
        .select("id, email, full_name, plan, role")
        .single();

      if (error) {
        console.error("Update user error:", error);
        return;
      }

      setUsers((prev) => {
        const updated = prev.map((u) => (u.id === id ? data : u));
        return updated.sort((a, b) => {
          const nameA = (a.full_name || a.email || "").toLowerCase();
          const nameB = (b.full_name || b.email || "").toLowerCase();
          return nameA.localeCompare(nameB);
        });
      });
    } catch (error) {
      console.error("Unexpected update user error:", error);
    } finally {
      setActionLoadingId(null);
    }
  }

  function updateRole(id, role) {
    updateUser(id, { role });
  }

  function updatePlan(id, plan) {
      const normalizedPlan = normalizePlanKey(plan);
      const role = normalizedPlan === "free" ? "free_user" : "paid_user";

      updateUser(id, {
      plan: normalizedPlan,
      role,
    });
  }

  async function resetUser(id) {
    const selectedUser = users.find((user) => user.id === id);
    const confirmReset = window.confirm(
      "FULL RESET this user?\n\nThis will:\n- Reset onboarding and program onboarding\n- Remove enrollment and paid/program access\n- Delete tracked progress, wallets, goals, submissions, notes, referrals, and coaching history\n- Mark the account for forced re-login"
    );

    if (!confirmReset) return;

    try {
      setActionLoadingId(id);
      await resetUserAccount({
        userId: id,
        email: selectedUser?.email || null,
      });
      await loadUsers();
    } catch (err) {
      console.error("Unexpected reset error:", err);
      alert(err.message || "Failed to reset user.");
    } finally {
      setActionLoadingId(null);
    }
  }

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return users;

    return users.filter((user) => {
      const fullName = (user.full_name || "").toLowerCase();
      const email = (user.email || "").toLowerCase();
      const role = (user.role || "").toLowerCase();
      const plan = (user.plan || "").toLowerCase();

      return (
        fullName.includes(keyword) ||
        email.includes(keyword) ||
        role.includes(keyword) ||
        plan.includes(keyword)
      );
    });
  }, [users, search]);

  function getDisplayName(user) {
    return user.full_name || user.email || "No name";
  }

  function getInitial(user) {
    const source = user.full_name || user.email || "?";
    return source.charAt(0).toUpperCase();
  }

  function getRoleLabel(role) {
    if (role === "admin") return "Admin";
    if (role === "paid_user") return "Paid User";
    return "Free User";
  }

  function getPlanLabel(plan) {
    return PLAN_LABELS[normalizePlanKey(plan)] || "Free";
  }

  if (loading) {
    return (
      <div className="flex justify-center h-32 items-center">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, email, role, or plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Button variant="outline" onClick={loadUsers}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
      </p>

      {filteredUsers.length === 0 ? (
        <div className="border rounded-2xl p-6 text-center text-sm text-muted-foreground">
          No users found.
        </div>
      ) : (
        filteredUsers.map((user) => {
          const isBusy = actionLoadingId === user.id;

          return (
            <div key={user.id} className="p-4 border rounded-2xl space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold text-sm">
                    {getInitial(user)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {getDisplayName(user)}
                  </p>

                  <p className="text-xs text-muted-foreground truncate">
                    {user.email || "No email"}
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

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border p-2">
                  <p className="text-muted-foreground">Role</p>
                  <p className="font-medium">{getRoleLabel(user.role)}</p>
                </div>

                <div className="rounded-xl border p-2">
                  <p className="text-muted-foreground">Plan</p>
                  <p className="font-medium capitalize">
                    {getPlanLabel(user.plan)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Select
                  value={user.role || "free_user"}
                  onValueChange={(value) => updateRole(user.id, value)}
                  disabled={isBusy}
                >
                  <SelectTrigger className="h-9 text-xs w-[150px]">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={normalizePlanKey(user.plan || "free")}
                  onValueChange={(value) => updatePlan(user.id, value)}
                  disabled={isBusy}
                >
                  <SelectTrigger className="h-9 text-xs w-[170px]">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLARA_TIERS.map((tier) => (
                      <SelectItem key={tier} value={tier}>
                        {PLAN_LABELS[tier]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => resetUser(user.id)}
                  disabled={isBusy}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>

                <div className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs text-muted-foreground">
                  {user.role === "admin" ? (
                    <Shield className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  {normalizePlanKey(user.plan) === "free" ? "Free access" : "Program access"}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
