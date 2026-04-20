import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const getInitials = (name = "") => {
  const safeName = String(name || "").trim();
  if (!safeName) return "U";

  const parts = safeName.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return safeName.slice(0, 2).toUpperCase();
};

export default function ClaraPeople() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchUsers = async () => {
    setLoading(true);

    // ✅ SAFE QUERY (only real columns)
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Fetch users error:", error);
      setUsers([]);
    } else {
      setUsers(Array.isArray(data) ? data : []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;

    return users.filter((u) => {
      const fullName = String(u.full_name || "").toLowerCase();
      const email = String(u.email || "").toLowerCase();

      return fullName.includes(term) || email.includes(term);
    });
  }, [users, search]);

  return (
    <div className="min-h-screen bg-[#061018] text-white px-4 pb-24">
      <div className="pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-400/10 p-2">
            <Users className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">CLARA People</h1>
            <p className="text-xs text-white/60">
              Connect with all users in CLARA
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <Search className="h-4 w-4 text-white/50" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-white/40"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="mb-2 h-8 w-8 text-white/30" />
          <p className="text-sm text-white/50">No users found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((user) => {
            const displayName = user.full_name || "Unnamed User";

            return (
              <button
                key={user.id}
                type="button"
                onClick={() => navigate(`/user/${user.id}`)}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition hover:border-emerald-400/20 hover:bg-white/10"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/30 to-emerald-600/20 text-sm font-semibold text-white">
                  {getInitials(displayName)}
                </div>

                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">{displayName}</p>
                  <p className="truncate text-xs text-white/50">
                    {user.email || "No email"}
                  </p>
                </div>

                <div className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-400">
                  CLARA
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}