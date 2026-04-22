import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Send,
  MessageSquare,
  ArrowLeft,
  Search,
  Plus,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import FeaturePageLoader from "../components/FeaturePageLoader";
import useUserRole from "../hooks/useUserRole";
import { supabase } from "../lib/supabaseClient";

const getInitials = (nameOrEmail = "") => {
  const value = String(nameOrEmail || "").trim();
  if (!value) return "?";
  const parts = value.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return value.slice(0, 2).toUpperCase();
};

const formatChatTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (isYesterday) return "Yesterday";

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
};

const formatBubbleTime = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function Messages() {
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    user,
    isAdmin,
    access,
    getFeatureAccessMode,
    loading: accessLoading,
  } = useUserRole();

  const messageMode = getFeatureAccessMode("messages");

  const hasFullMessaging = isAdmin || !!access?.messagingFull;
  const canMessageAdmins = isAdmin || !!access?.messagingAdminOnly;
  const hasMessagingAccess =
    (hasFullMessaging || canMessageAdmins) && !user?.messaging_disabled;

  const currentUserId = user?.id || null;
  const currentUserEmail = user?.email || "";
  const currentUserName =
    user?.full_name ||
    user?.nickname ||
    user?.display_name ||
    user?.email ||
    "You";

  const targetUserIdFromUrl = searchParams.get("userId") || "";

  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [selectedConvo, setSelectedConvo] = useState(null);
  const [newMsg, setNewMsg] = useState("");
  const [search, setSearch] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);

  const messagesEndRef = useRef(null);

  const fetchUsers = useCallback(async () => {
    if (!currentUserId) {
      setUsers([]);
      return;
    }

    const { data: baseProfiles, error: baseError } = await supabase
      .from("profiles")
      .select("id,email,full_name");

    if (baseError) {
      console.error("[Messages] base profiles fetch failed:", {
        message: baseError.message,
        details: baseError.details,
        hint: baseError.hint,
        code: baseError.code,
      });
      setUsers([]);
      return;
    }

    let optionalProfiles = [];
    const { data: extraProfiles, error: extraError } = await supabase
      .from("profiles")
      .select("id,nickname,display_name,role");

    if (extraError) {
      console.warn("[Messages] optional profile fields unavailable:", {
        message: extraError.message,
        details: extraError.details,
        hint: extraError.hint,
        code: extraError.code,
      });
    } else {
      optionalProfiles = Array.isArray(extraProfiles) ? extraProfiles : [];
    }

    const optionalMap = optionalProfiles.reduce((acc, item) => {
      if (item?.id) acc[item.id] = item;
      return acc;
    }, {});

    const mergedProfiles = (Array.isArray(baseProfiles) ? baseProfiles : []).map(
      (profile) => {
        const extra = optionalMap[profile.id] || {};

        const displayName =
          extra?.nickname ||
          extra?.display_name ||
          profile?.full_name ||
          profile?.email ||
          "CLARA User";

        return {
          id: profile?.id || null,
          email: profile?.email || "",
          full_name: displayName,
          role: String(extra?.role || "user").toLowerCase(),
        };
      }
    );

    let filtered = mergedProfiles.filter((profile) => {
      if (!profile?.id) return false;
      if (profile.id === currentUserId) return false;

      if (
        currentUserEmail &&
        profile.email &&
        profile.email.toLowerCase() === currentUserEmail.toLowerCase()
      ) {
        return false;
      }

      return true;
    });

    if (!hasFullMessaging && canMessageAdmins) {
      filtered = filtered.filter((profile) => profile.role === "admin");
    }

    setUsers(filtered);
  }, [
    currentUserId,
    currentUserEmail,
    hasFullMessaging,
    canMessageAdmins,
  ]);

  const fetchMessages = useCallback(async () => {
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Messages] messages fetch failed:", error);
      return;
    }

    setMessages(Array.isArray(data) ? data : []);
  }, [currentUserId]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!currentUserId || !hasMessagingAccess) {
        if (mounted) {
          setUsers([]);
          setMessages([]);
          setLoading(false);
        }
        return;
      }

      if (mounted) setLoading(true);

      try {
        await Promise.all([fetchUsers(), fetchMessages()]);
      } catch (error) {
        console.error("[Messages] initial load failed:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [currentUserId, hasMessagingAccess, fetchUsers, fetchMessages]);

  useEffect(() => {
    if (!currentUserId || !hasMessagingAccess) return;

    const channel = supabase
      .channel(`direct-messages-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
        },
        async () => {
          await fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, hasMessagingAccess, fetchMessages]);

  useEffect(() => {
    if (selectedConvo && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedConvo, messages]);

  const usersById = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      if (u?.id) map[u.id] = u;
    });
    return map;
  }, [users]);

  const convoMap = useMemo(() => {
    const convos = {};

    messages.forEach((m) => {
      const isMine = m.sender_id === currentUserId;
      const otherId = isMine ? m.recipient_id : m.sender_id;
      const otherEmail = isMine ? m.recipient_email : m.sender_email;
      const otherName = isMine
        ? m.recipient_name || usersById[m.recipient_id]?.full_name || otherEmail
        : m.sender_name || usersById[m.sender_id]?.full_name || otherEmail;

      if (!otherId) return;

      if (!convos[otherId]) {
        convos[otherId] = {
          id: otherId,
          email: otherEmail || "",
          name: otherName || "CLARA User",
          messages: [],
          lastMessage: null,
          unreadCount: 0,
        };
      }

      convos[otherId].messages.push(m);

      if (m.recipient_id === currentUserId && !m.is_read) {
        convos[otherId].unreadCount += 1;
      }
    });

    Object.values(convos).forEach((c) => {
      c.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      c.lastMessage = c.messages[c.messages.length - 1] || null;
    });

    return convos;
  }, [messages, currentUserId, usersById]);

  const convoList = useMemo(() => {
    return Object.values(convoMap).sort(
      (a, b) =>
        new Date(b.lastMessage?.created_at || 0) -
        new Date(a.lastMessage?.created_at || 0)
    );
  }, [convoMap]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;

    return users.filter((u) => {
      const fullName = (u.full_name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return fullName.includes(term) || email.includes(term);
    });
  }, [users, search]);

  const filteredConvos = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return convoList;

    return convoList.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      const preview = (c.lastMessage?.content || "").toLowerCase();
      return name.includes(term) || email.includes(term) || preview.includes(term);
    });
  }, [convoList, search]);

  const activeConvo = useMemo(() => {
    if (!selectedConvo) return null;

    if (convoMap[selectedConvo]) return convoMap[selectedConvo];

    const foundUser = users.find((u) => u.id === selectedConvo);
    if (!foundUser) return null;

    return {
      id: foundUser.id,
      email: foundUser.email || "",
      name: foundUser.full_name || foundUser.email || "CLARA User",
      messages: [],
      lastMessage: null,
      unreadCount: 0,
    };
  }, [selectedConvo, convoMap, users]);

  useEffect(() => {
    if (!targetUserIdFromUrl || !users.length) return;

    const matchedUser = users.find((u) => u.id === targetUserIdFromUrl);
    if (!matchedUser) return;

    setSelectedConvo(targetUserIdFromUrl);
    setComposerOpen(false);
  }, [targetUserIdFromUrl, users]);

  useEffect(() => {
    const markConversationAsRead = async () => {
      if (!activeConvo?.id || !currentUserId) return;

      const unreadIds = activeConvo.messages
        .filter((m) => m.recipient_id === currentUserId && !m.is_read)
        .map((m) => m.id);

      if (!unreadIds.length) return;

      const { error } = await supabase
        .from("direct_messages")
        .update({ is_read: true })
        .in("id", unreadIds);

      if (error) {
        console.error("[Messages] mark as read failed:", error);
        return;
      }

      setMessages((prev) =>
        prev.map((m) => (unreadIds.includes(m.id) ? { ...m, is_read: true } : m))
      );
    };

    markConversationAsRead();
  }, [activeConvo, currentUserId]);

  const openConversation = (userId) => {
    setSelectedConvo(userId);
    setComposerOpen(false);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("userId", userId);
    setSearchParams(nextParams, { replace: true });
  };

  const openNewChat = (userId) => {
    setSelectedConvo(userId);
    setComposerOpen(false);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("userId", userId);
    setSearchParams(nextParams, { replace: true });
  };

  const handleBackFromConversation = () => {
    setSelectedConvo(null);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("userId");
    setSearchParams(nextParams, { replace: true });
  };

  const handleSend = async () => {
    if (!newMsg.trim() || !selectedConvo || !currentUserId || sending) return;

    const recipientUser = users.find((u) => u.id === selectedConvo);
    if (!recipientUser) return;

    setSending(true);

    const payload = {
      conversation_id: [String(currentUserId), String(recipientUser.id)]
        .sort()
        .join("_"),
      sender_id: currentUserId,
      sender_email: currentUserEmail,
      sender_name: currentUserName,
      recipient_id: recipientUser.id,
      recipient_email: recipientUser.email || "",
      recipient_name: recipientUser.full_name || recipientUser.email || "CLARA User",
      content: newMsg.trim(),
      is_read: false,
    };

    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: optimisticId,
      ...payload,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [optimisticMessage, ...prev]);
    setNewMsg("");

    const { data, error } = await supabase
      .from("direct_messages")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("[Messages] send failed:", error);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setNewMsg(payload.content);
      setSending(false);
      return;
    }

    setMessages((prev) => {
      const withoutTemp = prev.filter((m) => m.id !== optimisticId);
      return data ? [data, ...withoutTemp] : withoutTemp;
    });

    setSending(false);
  };

  if (accessLoading) {
    return <FeaturePageLoader label="Preparing messages..." />;
  }

  if (!hasMessagingAccess) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <EmptyState
          icon={MessageSquare}
          title="Messages are currently locked"
          description="Turn on messages for this plan or upgrade for access."
        />
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <EmptyState
          icon={MessageSquare}
          title="User session not ready"
          description="The logged-in user id is missing."
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (activeConvo) {
    return (
      <div className="h-full flex flex-col bg-[radial-gradient(circle_at_top,#0d3b2f_0%,#031b2d_35%,#020817_75%)]">
        <div className="sticky top-0 z-20 border-b border-white/10 bg-black/20 backdrop-blur-xl px-4 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackFromConversation}
              className="rounded-2xl bg-white/5 hover:bg-white/10 text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400/20 via-cyan-400/10 to-blue-500/20 border border-white/10 flex items-center justify-center text-white font-semibold shadow-lg">
                {getInitials(activeConvo.name)}
              </div>
              <span className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-white font-semibold truncate">
                {activeConvo.name}
              </p>
              <p className="text-xs text-white/55 truncate">
                {messageMode === "admin_only" && !isAdmin
                  ? "CLARA Admin"
                  : "Private conversation"}
              </p>
            </div>

            <button className="w-10 h-10 rounded-2xl border border-white/10 bg-white/5 text-white/70 flex items-center justify-center">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {activeConvo.messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/8 mx-auto mb-4 flex items-center justify-center">
                  <MessageSquare className="w-7 h-7 text-white/70" />
                </div>
                <p className="text-white font-semibold mb-1">
                  Start your conversation
                </p>
                <p className="text-sm text-white/45">
                  Send your first message to {activeConvo.name}.
                </p>
              </div>
            </div>
          ) : (
            activeConvo.messages.map((m, index) => {
              const isMine = m.sender_id === currentUserId;
              const prevMsg = activeConvo.messages[index - 1];
              const showTime =
                !prevMsg ||
                new Date(m.created_at) - new Date(prevMsg.created_at) >
                  1000 * 60 * 30;

              return (
                <div key={m.id}>
                  {showTime ? (
                    <div className="flex justify-center my-3">
                      <span className="px-3 py-1 rounded-full text-[10px] tracking-[0.18em] uppercase bg-white/6 border border-white/10 text-white/45 backdrop-blur-md">
                        {formatChatTime(m.created_at)}
                      </span>
                    </div>
                  ) : null}

                  <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={[
                        "max-w-[82%] rounded-[22px] px-4 py-3 shadow-lg",
                        isMine
                          ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-md"
                          : "bg-white/8 border border-white/10 text-white rounded-bl-md backdrop-blur-xl",
                      ].join(" ")}
                    >
                      <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                        {m.content}
                      </p>
                      <div
                        className={`mt-1.5 text-[10px] ${
                          isMine ? "text-white/70" : "text-white/40"
                        }`}
                      >
                        {formatBubbleTime(m.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="sticky bottom-0 z-20 border-t border-white/10 bg-black/20 backdrop-blur-xl px-4 py-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 rounded-[24px] border border-white/10 bg-white/5 backdrop-blur-xl px-3 py-2">
              <Input
                placeholder={selectedConvo ? "Type a message..." : "Select a person first..."}
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={!selectedConvo || sending}
                className="border-0 bg-transparent text-white placeholder:text-white/35 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
              />
            </div>

            <Button
              onClick={handleSend}
              disabled={!newMsg.trim() || !selectedConvo || sending}
              className="h-12 w-12 rounded-full shrink-0 bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 hover:opacity-95 shadow-[0_12px_30px_rgba(16,185,129,0.35)]"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,#0d3b2f_0%,#031b2d_35%,#020817_75%)] px-4 pb-24 pt-4">
      <div className="max-w-3xl mx-auto">
        <PageHeader title="Messages" subtitle="Private conversations" />

        {messageMode === "admin_only" && !isAdmin ? (
          <div className="mb-4 rounded-3xl border border-emerald-400/15 bg-emerald-500/10 backdrop-blur-xl px-4 py-3 text-sm text-emerald-50 shadow-lg">
            You can message CLARA admins from here.
          </div>
        ) : null}

        <div className="mb-4">
          <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
            <div className="flex items-center gap-2 text-white/70">
              <Search className="w-4 h-4" />
              <Input
                placeholder="Search people or conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-0 bg-transparent text-white placeholder:text-white/35 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
              />
            </div>
          </div>
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-white font-semibold">CLARA People</p>
              <p className="text-xs text-white/45">
                Start a private conversation
              </p>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setComposerOpen((prev) => !prev)}
              className="shrink-0 w-[76px] rounded-[24px] border border-dashed border-emerald-300/35 bg-emerald-400/10 backdrop-blur-xl px-3 py-3 flex flex-col items-center justify-center gap-2 shadow-lg"
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-slate-950 shadow-[0_10px_25px_rgba(16,185,129,0.35)]">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium text-white">New</span>
            </button>

            {filteredUsers.map((u) => {
              const hasConversation = !!convoMap[u.id];
              const isTargetFromUrl = targetUserIdFromUrl === u.id;

              return (
                <button
                  key={u.id}
                  onClick={() => (hasConversation ? openConversation(u.id) : openNewChat(u.id))}
                  className={`shrink-0 w-[84px] rounded-[24px] border bg-white/5 backdrop-blur-xl px-3 py-3 flex flex-col items-center justify-center gap-2 shadow-lg transition-all ${
                    isTargetFromUrl
                      ? "border-emerald-400/35 bg-emerald-400/10"
                      : "border-white/10"
                  }`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400/20 via-blue-500/15 to-emerald-400/20 border border-white/10 flex items-center justify-center text-white font-semibold">
                      {getInitials(u.full_name || u.email)}
                    </div>
                    <span className="absolute -right-1 -bottom-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900" />
                  </div>

                  <div className="w-full">
                    <p className="text-[11px] font-medium text-white truncate text-center">
                      {u.full_name || u.email || "CLARA User"}
                    </p>
                    <p className="text-[10px] text-white/40 truncate text-center">
                      {u.role === "admin" ? "Admin" : "Member"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {composerOpen ? (
          <div className="mb-5 rounded-[28px] border border-white/10 bg-white/6 backdrop-blur-xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
            <p className="text-white font-semibold mb-1">Start new chat</p>
            <p className="text-xs text-white/45 mb-4">
              Choose who you want to message first
            </p>

            <div className="grid gap-2">
              {filteredUsers.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/55">
                  No people found.
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => openNewChat(u.id)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400/15 to-cyan-400/15 border border-white/10 flex items-center justify-center text-white font-semibold">
                        {getInitials(u.full_name || u.email)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">
                          {u.full_name || u.email || "CLARA User"}
                        </p>
                        <p className="text-xs text-white/40 truncate">
                          {u.email || "Registered user"}
                        </p>
                      </div>

                      <div className="text-emerald-300 text-xs font-medium">
                        Chat
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}

        <div className="mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">Recent chats</p>
              <p className="text-xs text-white/45">
                Your latest private conversations
              </p>
            </div>
          </div>
        </div>

        {filteredConvos.length === 0 ? (
          <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl px-5 py-8 shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
            <EmptyState
              icon={MessageSquare}
              title="No messages yet"
              description="Start a conversation with CLARA People."
            />
          </div>
        ) : (
          <div className="space-y-3">
            {filteredConvos.map((c) => {
              const last = c.lastMessage;
              const isFromMe = last?.sender_id === currentUserId;

              return (
                <button
                  key={c.id}
                  onClick={() => openConversation(c.id)}
                  className="w-full text-left rounded-[28px] border border-white/10 bg-white/5 hover:bg-white/8 backdrop-blur-xl px-4 py-4 shadow-[0_10px_40px_rgba(0,0,0,0.22)] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-cyan-400/20 via-blue-500/15 to-emerald-400/20 border border-white/10 flex items-center justify-center text-white font-semibold shadow-lg">
                        {getInitials(c.name)}
                      </div>
                      <span className="absolute -right-1 -bottom-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-white truncate">
                          {c.name}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-white/45">
                            {formatChatTime(last?.created_at)}
                          </span>
                          {c.unreadCount > 0 ? (
                            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                              {c.unreadCount > 9 ? "9+" : c.unreadCount}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-white/50">
                        {isFromMe ? <span className="text-white/35">You:</span> : null}
                        <p className="truncate">{last?.content || "Start chatting"}</p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
