import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, MessageSquare, ArrowLeft, Search, Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import FeaturePageLoader from "../components/FeaturePageLoader";
import useUserRole from "../hooks/useUserRole";
import { supabase } from "../lib/supabaseClient";
import { formatBubbleTime, formatChatTime, getMessageInitials } from "@/components/fresh/messages/messagesUtils";

export default function Messages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAdmin, access, getFeatureAccessMode, loading: accessLoading } = useUserRole();

  const messageMode = getFeatureAccessMode("messages");
  const hasFullMessaging = isAdmin || !!access?.messagingFull;
  const canMessageAdmins = isAdmin || !!access?.messagingAdminOnly;
  const hasMessagingAccess = (hasFullMessaging || canMessageAdmins) && !user?.messaging_disabled;
  const currentUserId = user?.id || null;
  const currentUserEmail = user?.email || "";
  const currentUserName = user?.full_name || user?.nickname || user?.display_name || user?.email || "You";
  const targetUserIdFromUrl = searchParams.get("userId") || "";

  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
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
      .select("id,email,full_name,role,nickname,display_name");

    if (baseError) {
      console.error("[Messages] profiles fetch failed:", baseError);
      setUsers([]);
      return;
    }

    const mergedProfiles = (Array.isArray(baseProfiles) ? baseProfiles : []).map((profile) => ({
      id: profile?.id || null,
      email: profile?.email || "",
      full_name: profile?.nickname || profile?.display_name || profile?.full_name || profile?.email || "CLARA User",
      role: String(profile?.role || "user").toLowerCase(),
    }));

    let filtered = mergedProfiles.filter((profile) => {
      if (!profile?.id || profile.id === currentUserId) return false;
      if (currentUserEmail && profile.email && profile.email.toLowerCase() === currentUserEmail.toLowerCase()) return false;
      return true;
    });

    if (!hasFullMessaging && canMessageAdmins) filtered = filtered.filter((profile) => profile.role === "admin");
    setUsers(filtered);
  }, [currentUserEmail, currentUserId, hasFullMessaging, canMessageAdmins]);

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
      setLoading(true);
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
    if (!currentUserId || !hasMessagingAccess) return undefined;
    const channel = supabase
      .channel(`direct-messages-${currentUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, async () => fetchMessages())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [currentUserId, hasMessagingAccess, fetchMessages]);

  useEffect(() => {
    if (selectedConvo && messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
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
        convos[otherId] = { id: otherId, email: otherEmail || "", name: otherName || "CLARA User", messages: [], lastMessage: null, unreadCount: 0 };
      }
      convos[otherId].messages.push(m);
      if (m.recipient_id === currentUserId && !m.is_read) convos[otherId].unreadCount += 1;
    });
    Object.values(convos).forEach((c) => {
      c.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      c.lastMessage = c.messages[c.messages.length - 1] || null;
    });
    return convos;
  }, [messages, currentUserId, usersById]);

  const convoList = useMemo(() => Object.values(convoMap).sort((a, b) => new Date(b.lastMessage?.created_at || 0) - new Date(a.lastMessage?.created_at || 0)), [convoMap]);
  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => (u.full_name || "").toLowerCase().includes(term) || (u.email || "").toLowerCase().includes(term));
  }, [users, search]);
  const filteredConvos = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return convoList;
    return convoList.filter((c) => (c.name || "").toLowerCase().includes(term) || (c.email || "").toLowerCase().includes(term) || (c.lastMessage?.content || "").toLowerCase().includes(term));
  }, [convoList, search]);

  const activeConvo = useMemo(() => {
    if (!selectedConvo) return null;
    if (convoMap[selectedConvo]) return convoMap[selectedConvo];
    const foundUser = users.find((u) => u.id === selectedConvo);
    if (!foundUser) return null;
    return { id: foundUser.id, email: foundUser.email || "", name: foundUser.full_name || foundUser.email || "CLARA User", messages: [], lastMessage: null, unreadCount: 0 };
  }, [selectedConvo, convoMap, users]);

  useEffect(() => {
    if (!targetUserIdFromUrl || !users.length) return;
    if (!users.find((u) => u.id === targetUserIdFromUrl)) return;
    setSelectedConvo(targetUserIdFromUrl);
    setComposerOpen(false);
  }, [targetUserIdFromUrl, users]);

  useEffect(() => {
    const markConversationAsRead = async () => {
      if (!activeConvo?.id || !currentUserId) return;
      const unreadIds = activeConvo.messages.filter((m) => m.recipient_id === currentUserId && !m.is_read).map((m) => m.id);
      if (!unreadIds.length) return;
      const { error } = await supabase.from("direct_messages").update({ is_read: true }).in("id", unreadIds);
      if (error) {
        console.error("[Messages] mark as read failed:", error);
        return;
      }
      setMessages((prev) => prev.map((m) => (unreadIds.includes(m.id) ? { ...m, is_read: true } : m)));
    };
    markConversationAsRead();
  }, [activeConvo, currentUserId]);

  const setConversationParam = (userId) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("userId", userId);
    setSearchParams(nextParams, { replace: true });
  };
  const openConversation = (userId) => {
    setSelectedConvo(userId);
    setComposerOpen(false);
    setConversationParam(userId);
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
      conversation_id: [String(currentUserId), String(recipientUser.id)].sort().join("_"),
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
    setMessages((prev) => [{ id: optimisticId, ...payload, created_at: new Date().toISOString() }, ...prev]);
    setNewMsg("");
    const { data, error } = await supabase.from("direct_messages").insert(payload).select().single();
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

  if (accessLoading) return <FeaturePageLoader label="Preparing messages..." />;
  if (!hasMessagingAccess) return <div className="p-4 md:p-6 max-w-4xl mx-auto"><EmptyState icon={MessageSquare} title="Messages are currently locked" description="Turn on messages for this plan or upgrade for access." /></div>;
  if (!currentUserId) return <div className="p-4 md:p-6 max-w-4xl mx-auto"><EmptyState icon={MessageSquare} title="User session not ready" description="The logged-in user id is missing." /></div>;

  if (activeConvo) {
    return (
      <div className="fixed inset-0 z-[100] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#0d3b2f_0%,#031b2d_35%,#020817_75%)] text-white">
        <div className="relative z-20 shrink-0 border-b border-white/10 bg-black/25 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.85rem)] backdrop-blur-2xl">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBackFromConversation} className="h-11 w-11 shrink-0 rounded-2xl border border-white/10 bg-white/5 text-white hover:bg-white/10"><ArrowLeft className="h-4 w-4" /></Button>
            <div className="relative shrink-0"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-400/20 via-cyan-400/10 to-blue-500/20 font-semibold text-white shadow-lg">{getMessageInitials(activeConvo.name)}</div><span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" /></div>
            <div className="min-w-0 flex-1"><p className="truncate font-semibold text-white">{activeConvo.name}</p><p className="truncate text-xs text-white/55">{messageMode === "admin_only" && !isAdmin ? "CLARA Admin" : "Private conversation"}</p></div>
            <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70"><MoreHorizontal className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4" style={{ WebkitOverflowScrolling: "touch" }}>
          <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-end space-y-3">
            {activeConvo.messages.length === 0 ? (
              <div className="flex min-h-[56dvh] items-center justify-center"><div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-white/5 p-6 text-center shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/8"><MessageSquare className="h-7 w-7 text-white/70" /></div><p className="mb-1 font-semibold text-white">Start your conversation</p><p className="text-sm text-white/45">Send your first message to {activeConvo.name}.</p></div></div>
            ) : activeConvo.messages.map((m, index) => {
              const isMine = m.sender_id === currentUserId;
              const prevMsg = activeConvo.messages[index - 1];
              const showTime = !prevMsg || new Date(m.created_at) - new Date(prevMsg.created_at) > 1000 * 60 * 30;
              return (
                <div key={m.id}>
                  {showTime ? <div className="my-3 flex justify-center"><span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/45 backdrop-blur-md">{formatChatTime(m.created_at)}</span></div> : null}
                  <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}><div className={["max-w-[82%] rounded-[22px] px-4 py-3 shadow-lg", isMine ? "rounded-br-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white" : "rounded-bl-md border border-white/10 bg-white/8 text-white backdrop-blur-xl"].join(" ")}><p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">{m.content}</p><div className={`mt-1.5 text-[10px] ${isMine ? "text-white/70" : "text-white/40"}`}>{formatBubbleTime(m.created_at)}</div></div></div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="relative z-20 shrink-0 border-t border-white/10 bg-black/25 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-3xl items-end gap-2"><div className="flex-1 rounded-[24px] border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-xl"><Input placeholder={selectedConvo ? "Type a message..." : "Select a person first..."} value={newMsg} onChange={(e) => setNewMsg(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} disabled={!selectedConvo || sending} className="border-0 bg-transparent px-0 text-white placeholder:text-white/35 focus-visible:ring-0 focus-visible:ring-offset-0" /></div><Button onClick={handleSend} disabled={!newMsg.trim() || !selectedConvo || sending} className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-[0_12px_30px_rgba(16,185,129,0.35)] hover:opacity-95"><Send className="h-4 w-4" /></Button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,#0d3b2f_0%,#031b2d_35%,#020817_75%)] px-4 pb-24 pt-4">
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Messages" subtitle="Private conversations" />
        {messageMode === "admin_only" && !isAdmin ? <div className="mb-4 rounded-3xl border border-emerald-400/15 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50 shadow-lg backdrop-blur-xl">You can message CLARA admins from here.</div> : null}
        <div className="mb-4"><div className="rounded-[28px] border border-white/10 bg-white/5 px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl"><div className="flex items-center gap-2 text-white/70"><Search className="h-4 w-4" /><Input placeholder="Search people or conversations..." value={search} onChange={(e) => setSearch(e.target.value)} className="border-0 bg-transparent px-0 text-white placeholder:text-white/35 focus-visible:ring-0 focus-visible:ring-offset-0" /></div></div></div>
        <div className="mb-5"><div className="mb-3 flex items-center justify-between"><div><p className="font-semibold text-white">CLARA People</p><p className="text-xs text-white/45">Start a private conversation</p></div></div><div className="no-scrollbar flex gap-3 overflow-x-auto pb-1"><button type="button" onClick={() => setComposerOpen((prev) => !prev)} className="flex w-[76px] shrink-0 flex-col items-center justify-center gap-2 rounded-[24px] border border-dashed border-emerald-300/35 bg-emerald-400/10 px-3 py-3 shadow-lg backdrop-blur-xl"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-[0_10px_25px_rgba(16,185,129,0.35)]"><Plus className="h-5 w-5" /></div><span className="text-[11px] font-medium text-white">New</span></button>{filteredUsers.map((u) => <button type="button" key={u.id} onClick={() => openConversation(u.id)} className={`flex w-[84px] shrink-0 flex-col items-center justify-center gap-2 rounded-[24px] border bg-white/5 px-3 py-3 shadow-lg backdrop-blur-xl transition-all ${targetUserIdFromUrl === u.id ? "border-emerald-400/35 bg-emerald-400/10" : "border-white/10"}`}><div className="relative"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-400/20 via-blue-500/15 to-emerald-400/20 font-semibold text-white">{getMessageInitials(u.full_name || u.email)}</div><span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-400" /></div><div className="w-full"><p className="truncate text-center text-[11px] font-medium text-white">{u.full_name || u.email || "CLARA User"}</p><p className="truncate text-center text-[10px] text-white/40">{u.role === "admin" ? "Admin" : "Member"}</p></div></button>)}</div></div>
        {composerOpen ? <div className="mb-5 rounded-[28px] border border-white/10 bg-white/6 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl"><p className="mb-1 font-semibold text-white">Start new chat</p><p className="mb-4 text-xs text-white/45">Choose who you want to message first</p><div className="grid gap-2">{filteredUsers.length === 0 ? <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/55">No people found.</div> : filteredUsers.map((u) => <button type="button" key={u.id} onClick={() => openConversation(u.id)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-all hover:bg-white/10"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-400/15 to-cyan-400/15 font-semibold text-white">{getMessageInitials(u.full_name || u.email)}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{u.full_name || u.email || "CLARA User"}</p><p className="truncate text-xs text-white/40">{u.email || "Registered user"}</p></div><div className="text-xs font-medium text-emerald-300">Chat</div></div></button>)}</div></div> : null}
        <div className="mb-3"><div className="flex items-center justify-between"><div><p className="font-semibold text-white">Recent chats</p><p className="text-xs text-white/45">Your latest private conversations</p></div>{loading ? <span className="text-[11px] text-white/35">Syncing...</span> : null}</div></div>
        {filteredConvos.length === 0 ? <div className="rounded-[32px] border border-white/10 bg-white/5 px-5 py-8 shadow-[0_10px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl"><EmptyState icon={MessageSquare} title="No messages yet" description="Start a conversation with CLARA People." /></div> : <div className="space-y-3">{filteredConvos.map((c) => { const last = c.lastMessage; const isFromMe = last?.sender_id === currentUserId; return <button type="button" key={c.id} onClick={() => openConversation(c.id)} className="w-full rounded-[28px] border border-white/10 bg-white/5 px-4 py-4 text-left shadow-[0_10px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl transition-all hover:bg-white/8"><div className="flex items-center gap-3"><div className="relative shrink-0"><div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-gradient-to-br from-cyan-400/20 via-blue-500/15 to-emerald-400/20 font-semibold text-white shadow-lg">{getMessageInitials(c.name)}</div><span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-emerald-400" /></div><div className="min-w-0 flex-1"><div className="mb-1 flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold text-white">{c.name}</p><div className="flex shrink-0 items-center gap-2"><span className="text-[11px] text-white/45">{formatChatTime(last?.created_at)}</span>{c.unreadCount > 0 ? <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-400 px-1.5 text-[10px] font-bold text-slate-950">{c.unreadCount > 9 ? "9+" : c.unreadCount}</span> : null}</div></div><div className="flex items-center gap-1 text-xs text-white/50">{isFromMe ? <span className="text-white/35">You:</span> : null}<p className="truncate">{last?.content || "Start chatting"}</p></div></div></div></button>; })}</div>}
      </div>
    </div>
  );
}
