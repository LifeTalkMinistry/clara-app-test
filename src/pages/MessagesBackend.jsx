import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  MessageSquare,
  MoreHorizontal,
  Search,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EmptyState from "../components/EmptyState";
import FeaturePageLoader from "../components/FeaturePageLoader";
import useUserRole from "../hooks/useUserRole";
import {
  backendRequest,
  getStoredBackendToken,
  getStoredBackendUser,
} from "@/lib/clara-backend-client";
import {
  formatBubbleTime,
  formatChatTime,
  getMessageInitials,
} from "@/components/fresh/messages/messagesUtils";

export default function MessagesBackend() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, access, getFeatureAccessMode, loading: accessLoading } = useUserRole();
  const messageMode = getFeatureAccessMode("messages");
  const hasFullMessaging = isAdmin || !!access?.messagingFull;
  const canMessageAdmins = isAdmin || !!access?.messagingAdminOnly;
  const hasMessagingAccess = hasFullMessaging || canMessageAdmins;
  const backendUser = getStoredBackendUser();
  const token = getStoredBackendToken();
  const currentUserId = backendUser?.id || null;
  const currentUserEmail = backendUser?.email || "";
  const currentUserName = backendUser?.name || currentUserEmail || "You";
  const targetUserIdFromUrl = searchParams.get("userId") || "";

  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [newMsg, setNewMsg] = useState("");
  const [search, setSearch] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchUsers = useCallback(async () => {
    if (!token || !currentUserId) return setUsers([]);
    try {
      const data = await backendRequest("/api/community/profiles", { token });
      let filtered = (Array.isArray(data) ? data : []).filter(
        (profile) => String(profile?.id || "") !== String(currentUserId)
      );
      if (!hasFullMessaging && canMessageAdmins) {
        filtered = filtered.filter((profile) => String(profile?.role || "").toLowerCase() === "admin");
      }
      setUsers(filtered);
    } catch (error) {
      console.error("[Messages] profile directory failed:", error);
      setUsers([]);
    }
  }, [canMessageAdmins, currentUserId, hasFullMessaging, token]);

  const fetchMessages = useCallback(async () => {
    if (!token || !currentUserId) return setMessages([]);
    try {
      const data = await backendRequest("/api/messages", { token });
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("[Messages] messages fetch failed:", error);
    }
  }, [currentUserId, token]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!hasMessagingAccess || !token || !currentUserId) return;
      setLoading(true);
      try {
        await Promise.all([fetchUsers(), fetchMessages()]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [currentUserId, fetchMessages, fetchUsers, hasMessagingAccess, token]);

  useEffect(() => {
    if (!hasMessagingAccess || !token || !currentUserId) return undefined;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "hidden") fetchMessages();
    }, 5000);
    const onFocus = () => fetchMessages();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [currentUserId, fetchMessages, hasMessagingAccess, token]);

  const usersById = useMemo(() => {
    const map = {};
    users.forEach((person) => {
      if (person?.id) map[String(person.id)] = person;
    });
    return map;
  }, [users]);

  const convoMap = useMemo(() => {
    const convos = {};
    messages.forEach((message) => {
      const isMine = String(message.sender_id) === String(currentUserId);
      const otherId = isMine ? message.recipient_id : message.sender_id;
      if (!otherId) return;
      const otherProfile = usersById[String(otherId)] || {};
      const otherEmail = isMine ? message.recipient_email : message.sender_email;
      const otherName = isMine ? message.recipient_name : message.sender_name;
      const key = String(otherId);
      if (!convos[key]) {
        convos[key] = {
          id: otherId,
          email: otherEmail || otherProfile.email || "",
          name: otherName || otherProfile.display_name || otherProfile.full_name || otherEmail || "CLARA User",
          messages: [],
          lastMessage: null,
          unreadCount: 0,
        };
      }
      convos[key].messages.push(message);
      if (String(message.recipient_id) === String(currentUserId) && !message.is_read) {
        convos[key].unreadCount += 1;
      }
    });
    Object.values(convos).forEach((conversation) => {
      conversation.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      conversation.lastMessage = conversation.messages[conversation.messages.length - 1] || null;
    });
    return convos;
  }, [currentUserId, messages, usersById]);

  const convoList = useMemo(
    () => Object.values(convoMap).sort(
      (a, b) => new Date(b.lastMessage?.created_at || 0) - new Date(a.lastMessage?.created_at || 0)
    ),
    [convoMap]
  );

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((person) =>
      String(person.display_name || person.full_name || "").toLowerCase().includes(term) ||
      String(person.email || "").toLowerCase().includes(term)
    );
  }, [search, users]);

  const filteredConvos = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return convoList;
    return convoList.filter((conversation) =>
      String(conversation.name || "").toLowerCase().includes(term) ||
      String(conversation.lastMessage?.content || "").toLowerCase().includes(term)
    );
  }, [convoList, search]);

  const activeConvo = useMemo(() => {
    if (!selectedConvo) return null;
    const key = String(selectedConvo);
    if (convoMap[key]) return convoMap[key];
    const person = usersById[key];
    if (!person) return null;
    return {
      id: person.id,
      email: person.email || "",
      name: person.display_name || person.full_name || person.email || "CLARA User",
      messages: [],
      lastMessage: null,
      unreadCount: 0,
    };
  }, [convoMap, selectedConvo, usersById]);

  useEffect(() => {
    if (!targetUserIdFromUrl || !users.length) return;
    const person = users.find((item) => String(item.id) === String(targetUserIdFromUrl));
    if (!person) return;
    setSelectedConvo(person.id);
    setSearchActive(false);
  }, [targetUserIdFromUrl, users]);

  useEffect(() => {
    if (activeConvo && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeConvo, messages]);

  useEffect(() => {
    const markRead = async () => {
      if (!activeConvo?.id || !token) return;
      const ids = activeConvo.messages
        .filter((message) => String(message.recipient_id) === String(currentUserId) && !message.is_read)
        .map((message) => message.id);
      if (!ids.length) return;
      try {
        await backendRequest("/api/messages/read", {
          method: "PATCH",
          token,
          body: { ids },
        });
        setMessages((current) => current.map((message) =>
          ids.includes(message.id) ? { ...message, is_read: true } : message
        ));
      } catch (error) {
        console.error("[Messages] mark read failed:", error);
      }
    };
    markRead();
  }, [activeConvo, currentUserId, token]);

  const openConversation = (userId) => {
    setSelectedConvo(userId);
    setSearchActive(false);
    setSearch("");
    const next = new URLSearchParams(searchParams);
    next.set("userId", String(userId));
    setSearchParams(next, { replace: true });
  };

  const handleBackFromConversation = () => {
    setSelectedConvo(null);
    const next = new URLSearchParams(searchParams);
    next.delete("userId");
    setSearchParams(next, { replace: true });
  };

  const handleSend = async () => {
    const content = newMsg.trim();
    if (!content || !activeConvo?.id || sending || !token) return;
    setSending(true);
    const optimisticId = `temp-${Date.now()}`;
    const optimistic = {
      id: optimisticId,
      sender_id: currentUserId,
      sender_email: currentUserEmail,
      sender_name: currentUserName,
      recipient_id: activeConvo.id,
      recipient_email: activeConvo.email,
      recipient_name: activeConvo.name,
      content,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [optimistic, ...current]);
    setNewMsg("");
    try {
      const saved = await backendRequest("/api/messages", {
        method: "POST",
        token,
        body: { recipient_id: activeConvo.id, content },
      });
      setMessages((current) => [saved, ...current.filter((message) => message.id !== optimisticId)]);
    } catch (error) {
      console.error("[Messages] send failed:", error);
      setMessages((current) => current.filter((message) => message.id !== optimisticId));
      setNewMsg(content);
    } finally {
      setSending(false);
    }
  };

  if (accessLoading) return <FeaturePageLoader label="Preparing messages..." />;
  if (!hasMessagingAccess) {
    return <div className="mx-auto max-w-4xl p-4 md:p-6"><EmptyState icon={MessageSquare} title="Messages are currently locked" description="Turn on messages for this plan or upgrade for access." /></div>;
  }
  if (!currentUserId || !token) {
    return <div className="mx-auto max-w-4xl p-4 md:p-6"><EmptyState icon={MessageSquare} title="Account connection required" description="Sign in again so CLARA can connect your online messages." /></div>;
  }

  if (activeConvo) {
    return (
      <div className="fixed inset-0 z-[100] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#06111f] text-white">
        <header className="shrink-0 border-b border-white/10 bg-[#06111f]/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.85rem)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBackFromConversation} className="h-11 w-11 shrink-0 rounded-2xl border border-white/10 bg-white/5 text-white"><ArrowLeft className="h-4 w-4" /></Button>
            <div className="relative shrink-0"><div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#22c7b8]/20 bg-[#22c7b8]/10 font-black text-[#ccfbf1]">{getMessageInitials(activeConvo.name)}</div><span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#06111f] bg-emerald-400" /></div>
            <div className="min-w-0 flex-1"><p className="truncate font-black text-white">{activeConvo.name}</p><p className="truncate text-xs text-white/45">Private conversation</p></div>
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/60"><MoreHorizontal className="h-4 w-4" /></button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-end space-y-3">
            {activeConvo.messages.length === 0 ? (
              <div className="flex min-h-[56dvh] items-center justify-center"><div className="text-center"><MessageSquare className="mx-auto h-8 w-8 text-[#5eead4]/50" /><p className="mt-3 font-black">Start your conversation</p><p className="mt-1 text-sm text-white/45">Send your first private message to {activeConvo.name}.</p></div></div>
            ) : activeConvo.messages.map((message) => {
              const isMine = String(message.sender_id) === String(currentUserId);
              return <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-[22px] px-4 py-3 ${isMine ? "rounded-br-md bg-[#22c7b8] text-[#042f2e]" : "rounded-bl-md border border-white/10 bg-white/[0.06] text-white"}`}><p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">{message.content}</p><div className={`mt-1.5 text-[10px] ${isMine ? "text-[#042f2e]/65" : "text-white/35"}`}>{formatBubbleTime(message.created_at)}</div></div></div>;
            })}
            <div ref={messagesEndRef} />
          </div>
        </main>

        <footer className="shrink-0 border-t border-white/10 bg-[#06111f]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
          <div className="mx-auto flex max-w-3xl items-end gap-2"><div className="flex-1 rounded-[24px] border border-white/10 bg-white/[0.05] px-3 py-2"><Input placeholder="Type a message..." value={newMsg} onChange={(event) => setNewMsg(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); handleSend(); } }} disabled={sending} className="border-0 bg-transparent px-0 text-white placeholder:text-white/35 focus-visible:ring-0" /></div><Button onClick={handleSend} disabled={!newMsg.trim() || sending} className="h-12 w-12 rounded-full bg-[#22c7b8] text-[#042f2e]"><Send className="h-4 w-4" /></Button></div>
        </footer>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#06111f] text-white">
      <header className="shrink-0 border-b border-white/[0.08] bg-[#06111f]/95 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3"><button type="button" onClick={() => navigate("/community")} className="flex h-10 shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 text-white/80"><ArrowLeft className="h-4 w-4" /><span className="text-[11px] font-black">Community</span></button><div className="min-w-0 flex-1"><h1 className="text-lg font-black tracking-[-0.025em]">Messages</h1></div></div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+28px)] pt-4">
        <div className="mx-auto w-full max-w-3xl space-y-5">
          <div className="flex h-12 items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.05] px-4"><Search className="h-4 w-4 text-white/38" /><Input placeholder="Search members" value={search} onFocus={() => setSearchActive(true)} onBlur={() => window.setTimeout(() => setSearchActive(false), 140)} onChange={(event) => setSearch(event.target.value)} className="min-w-0 border-0 bg-transparent px-0 text-sm font-semibold text-white placeholder:text-white/30 focus-visible:ring-0" /></div>

          {searchActive ? (
            <section className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.035]"><div className="divide-y divide-white/[0.07]">{filteredUsers.length === 0 ? <div className="px-4 py-5 text-sm font-semibold text-white/42">No people found.</div> : filteredUsers.map((person) => <button type="button" key={person.id} onClick={() => openConversation(person.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04]"><div className="relative"><div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#22c7b8]/20 bg-[#22c7b8]/10 text-xs font-black text-[#ccfbf1]">{getMessageInitials(person.display_name || person.full_name || person.email)}</div><span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#06111f] bg-emerald-400" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{person.display_name || person.full_name || person.email}</p><p className="truncate text-[11px] font-semibold text-white/38">{String(person.role).toLowerCase() === "admin" ? "CLARA Admin" : "Community Member"}</p></div><span className="text-[11px] font-black text-[#99f6e4]">Chat</span></button>)}</div></section>
          ) : (
            <section>{filteredConvos.length === 0 ? <div className="rounded-[22px] border border-white/10 bg-white/[0.035] px-4 py-7"><EmptyState icon={MessageSquare} title="No messages yet" description="Tap the search bar to find a community member." /></div> : <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.035]"><div className="divide-y divide-white/[0.07]">{filteredConvos.map((conversation) => { const last = conversation.lastMessage; const isFromMe = String(last?.sender_id) === String(currentUserId); return <button type="button" key={conversation.id} onClick={() => openConversation(conversation.id)} className="flex w-full items-center gap-3 px-3 py-3.5 text-left hover:bg-white/[0.04]"><div className="relative"><div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#22c7b8]/20 bg-[#22c7b8]/10 text-sm font-black text-[#ccfbf1]">{getMessageInitials(conversation.name)}</div><span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#06111f] bg-emerald-400" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="min-w-0 flex-1 truncate text-sm font-black">{conversation.name}</p><span className="shrink-0 text-[10px] text-white/35">{formatChatTime(last?.created_at)}</span></div><div className="mt-1 flex items-center gap-2"><p className="min-w-0 flex-1 truncate text-xs font-semibold text-white/45">{isFromMe ? "You: " : ""}{last?.content || "Start chatting"}</p>{conversation.unreadCount > 0 ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#22c7b8] px-1.5 text-[10px] font-black text-[#042f2e]">{conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}</span> : null}</div></div></button>; })}</div></div>}</section>
          )}
        </div>
      </main>
    </div>
  );
}