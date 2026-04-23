import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ChevronRight,
  RefreshCw,
  Shield,
  User,
  RotateCcw,
  CheckCircle2,
  XCircle,
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

const USER_ROLES = ["free_user", "paid_user", "admin"];

const ADMIN_PLAN_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro 99" },
  { value: "core", label: "Core 199" },
  { value: "life_os", label: "Life OS 499" },
];

function normalizeAdminPlan(value) {
  const raw = String(value || "").toLowerCase().trim();

  if (
    raw === "life_os" ||
    raw === "lifeos" ||
    raw === "coaching_1299" ||
    raw === "coaching" ||
    raw === "life os"
  ) {
    return "life_os";
  }

  if (raw === "core" || raw === "core_599") {
    return "core";
  }

  if (raw === "pro" || raw === "pro_99") {
    return "pro";
  }

  return "free";
}

function getPlanLabel(value) {
  const normalized = normalizeAdminPlan(value);
  return (
    ADMIN_PLAN_OPTIONS.find((item) => item.value === normalized)?.label || "Free"
  );
}

function getRoleLabel(role) {
  if (role === "admin") return "Admin";
  if (role === "paid_user") return "Paid User";
  return "Free User";
}

export default function AdminUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          role,
          plan,
          access_level,
          access_source,
          subscription_status,
          admin_plan_override,
          activation_status,
          is_activated,
          suspended_at,
          messaging_disabled,
          updated_at
        `)
        .order("full_name", { ascending: true });

      if (error) {
        console.error("Load users error:", error);
        setUsers([]);
        setLoadError(error.message || "Failed to load users.");
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
      setLoadError(error?.message || "Unexpected error while loading users.");
    } finally {
      setLoading(false);
    }
  }

  async function updateUser(id, updates) {
    try {
      setActionLoadingId(id);

      const payload = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", id)
        .select(`
          id,
          email,
          full_name,
          role,
          plan,
          access_level,
          access_source,
          subscription_status,
          admin_plan_override,
          activation_status,
          is_activated,
          suspended_at,
          messaging_disabled,
          updated_at
        `)
        .single();

      if (error) {
        console.error("Update user error:", error);
        alert(error.message || "Failed to update user.");
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
      alert(error?.message || "Unexpected error while updating user.");
    } finally {
      setActionLoadingId(null);
    }
  }

  function updateRole(id, role) {
    updateUser(id, { role });
  }

  function updatePlan(id, selectedPlan) {
    const normalizedPlan = normalizeAdminPlan(selectedPlan);
    const isFree = normalizedPlan === "free";
    const isPro = normalizedPlan === "pro";
    const isCore = normalizedPlan === "core";
    const isLifeOS = normalizedPlan === "life_os";

    const role = isFree ? "free_user" : "paid_user";
    const subscriptionStatus = isFree ? "free" : "active";

    const updates = {
      plan: normalizedPlan === "life_os" ? "lifeos" : normalizedPlan,
      role,
      access_level: normalizedPlan,
      access_source: "admin",
      admin_plan_override: true,
      subscription_status: subscriptionStatus,
      entitlement_status: isFree ? "free" : "admin_override",
      purchase_source: "admin",
      program_active: isCore || isLifeOS,
      is_enrolled: isCore || isLifeOS,
      activation_status: isCore || isLifeOS ? "pending" : "not_required",
      is_activated: isPro || isCore || isLifeOS,
      pro_subscription_status: isFree ? "inactive" : "active",
    };

    if (isFree) {
      updates.purchase_source = null;
      updates.play_product_id = null;
      updates.play_purchase_token = null;
      updates.program_active = false;
      updates.is_enrolled = false;
      updates.is_activated = false;
      updates.activation_status = "not_required";
    }

    updateUser(id, updates);
  }

  function grantFreeAccess(id) {
    updatePlan(id, "free");
  }

  function activatePaidAccess(id) {
    updateUser(id, {
      is_activated: true,
      activation_status: "activated",
      subscription_status: "active",
      admin_plan_override: true,
      access_source: "admin",
    });
  }

  function deactivatePaidAccess(id) {
    updateUser(id, {
      is_activated: false,
      activation_status: "pending",
      admin_plan_override: true,
      access_source: "admin",
    });
  }

  function suspendUser(id, suspended) {
    updateUser(id, {
      suspended_at: suspended ? new Date().toISOString() : null,
      status: suspended ? "suspended" : "active",
      force_reauth: suspended,
    });
  }

  function toggleMessaging(id, disabled) {
    updateUser(id, {
      messaging_disabled: disabled,
    });
  }

  async function resetUser(id) {
    const selectedUser = users.find((user) => user.id === id);
    const confirmReset = window.confirm(
      "FULL RESET this user?\n\nThis will:\n- Reset onboarding and program onboarding\n- Remove enrollment and paid/program access\n- Delete tracked progress, wallets, goals, submissions, notes, referrals, and legacy support history\n- Mark the account for forced re-login"
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
      const plan = normalizeAdminPlan(user.access_level || user.plan);

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

  function getEffectivePlan(user) {
    return normalizeAdminPlan(user.access_level || user.plan);
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

      {loadError ? (
        <div className="border rounded-2xl p-4 text-sm text-red-400 bg-red-500/5">
          Failed to load users: {loadError}
        </div>
      ) : null}

      {!loadError && filteredUsers.length === 0 ? (
        <div className="border rounded-2xl p-6 text-center text-sm text-muted-foreground space-y-2">
          <p>No users found in the <span className="font-medium">profiles</span> table.</p>
          <p className="text-xs">
            If users already signed up, they may exist in Supabase Auth but do not yet have matching profile rows.
          </p>
        </div>
      ) : (
        filteredUsers.map((user) => {
          const isBusy = actionLoadingId === user.id;
          const effectivePlan = getEffectivePlan(user);

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
                  <p className="font-medium">{getPlanLabel(user.plan)}</p>
                </div>

                <div className="rounded-xl border p-2">
                  <p className="text-muted-foreground">Effective Plan</p>
                  <p className="font-medium">{getPlanLabel(effectivePlan)}</p>
                </div>

                <div className="rounded-xl border p-2">
                  <p className="text-muted-foreground">Access Source</p>
                  <p className="font-medium capitalize">
                    {user.access_source || "profile"}
                    {user.admin_plan_override ? " · Override" : ""}
                  </p>
                </div>

                <div className="rounded-xl border p-2">
                  <p className="text-muted-foreground">Activation</p>
                  <p className="font-medium capitalize">
                    {user.is_activated ? "Activated" : user.activation_status || "Not required"}
                  </p>
                </div>

                <div className="rounded-xl border p-2">
                  <p className="text-muted-foreground">Access</p>
                  <p className="font-medium">
                    {user.suspended_at ? "Suspended" : "Active"}
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
                  value={effectivePlan}
                  onValueChange={(value) => updatePlan(user.id, value)}
                  disabled={isBusy}
                >
                  <SelectTrigger className="h-9 text-xs w-[170px]">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {ADMIN_PLAN_OPTIONS.map((tier) => (
                      <SelectItem key={tier.value} value={tier.value}>
                        {tier.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => grantFreeAccess(user.id)}
                  disabled={isBusy}
                >
                  Free Access
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => activatePaidAccess(user.id)}
                  disabled={isBusy}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Activate
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deactivatePaidAccess(user.id)}
                  disabled={isBusy}
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Deactivate
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => resetUser(user.id)}
                  disabled={isBusy}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => suspendUser(user.id, !user.suspended_at)}
                  disabled={isBusy}
                >
                  {user.suspended_at ? "Unsuspend" : "Suspend"}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleMessaging(user.id, !user.messaging_disabled)}
                  disabled={isBusy}
                >
                  {user.messaging_disabled ? "Enable Messages" : "Disable Messages"}
                </Button>

                <div className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs text-muted-foreground">
                  {user.role === "admin" ? (
                    <Shield className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  {effectivePlan === "free" ? "Free access" : "Program access"}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}