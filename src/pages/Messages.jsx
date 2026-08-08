import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EmptyState from "../components/EmptyState";
import FeaturePageLoader from "../components/FeaturePageLoader";
import useUserRole from "../hooks/useUserRole";
import { supabase } from "../lib/supabaseClient";
import {
  formatBubbleTime,
  formatChatTime,
  getMessageInitials,
} from "@/components/fresh/messages/messagesUtils";

export default function Messages() {
  const navigate = useNavigate();
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

    const mergedProfiles = (Array.isArray(baseProfiles) ? baseProfiles : []).map(
      (profile) => ({
        id: profile?.id || null,
        email: profile?.email || "",
        full_name:
          profile?.nickname ||
          profile?.display_name ||
          profile?.full_name ||
          profile?.email ||
          "CLARA User",
        role: String(profile?.role || "user").toLowerCase(),
      })
    );

    let filtered = mergedProfiles.filter((profile) => {
      if (!profile?.id || profile.id === currentUserId) return false;
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages" },
        fetchMessages
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [currentUserId, hasMessagingAccess, fetchMessages]);

  useEffect(() => {
    if (selectedConvo && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedConvo, messages]);

  const usersById = useMemo(() => {
    const map = {};
    users.forEach((person) => {
      if (person?.id) map[person.id] = person;
    });
    return map;
  }, [users]);

  const convoMap = useMemo(() => {
    const convos = {};

    messages.forEach((message) => {
      const isMine = message.sender_id === currentUserId;
      const otherId = isMine ? message.recipient_id : message.sender_id;
      const otherEmail = isMine
        ? message.recipient_email
        : message.sender_email;
      const otherName = isMine
        ? message.recipient_name ||
          usersById[message.recipient_id]?.full_name ||
          otherEmail
        : message.sender_name ||
          usersById[message.sender_id]?.full_name ||
          otherEmail;

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

      convos[otherId].messages.push(message);
      if (message.recipient_id === currentUserId && !message.is_read) {
        convos[otherId].unreadCount += 1;
      }
    });

    Object.values(convos).forEach((conversation) => {
      conversation.messages.sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
      conversation.lastMessage =
        conversation.messages[conversation.messages.length - 1] || null;
    });

    return convos;
  }, [messages, currentUserId, usersById]);

  const convoList = useMemo(
    () =>
      Object.values(convoMap).sort(
        (a, b) =>
          new Date(b.lastMessage?.created_at || 0) -
          new Date(a.lastMessage?.created_at || 0)
      ),
    [convoMap]
  );

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;

    return users.filter(
      (person) =>
        (person.full_name || "").toLowerCase().includes(term) ||
        (person.email || "").toLowerCase().includes(term)
    );
  }, [users, search]);

  const filteredConvos = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return convoList;

    return convoList.filter(
      (conversation) =>
        (conversation.name || "").toLowerCase().includes(term) ||
        (conversation.email || "").toLowerCase().includes(term) ||
        (conversation.lastMessage?.content || "").toLowerCase().includes(term)
    );
  }, [convoList, search]);

  const activeConvo = useMemo(() => {
    if (!selectedConvo) return null;
    if (convoMap[selectedConvo]) return convoMap[selectedConvo];

    const foundUser = users.find((person) => person.id === selectedConvo);
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
    if (!users.find((person) => person.id === targetUserIdFromUrl)) return;

    setSelectedConvo(targetUserIdFromUrl);
    setComposerOpen(false);
  }, [targetUserIdFromUrl, users]);

  useEffect(() => {
    const markConversationAsRead = async () => {
      if (!activeConvo?.id || !currentUserId) return;

      const unreadIds = activeConvo.messages
        .filter(
          (message) =>
            message.recipient_id === currentUserId && !message.is_read
        )
        .map((message) => message.id);

      if (!unreadIds.length) return;

      const { error } = await supabase
        .from("direct_messages")
        .update({ is_read: true })
        .in("id", unreadIds);

      if (error) {
        console.error("[Messages] mark as read failed:", error);
        return;
      }

      setMessages((current) =>
        current.map((message) =>
          unreadIds.includes(message.id)
            ? { ...message, is_read: true }
            : message
        )
      );
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

    const recipientUser = users.find(
      (person) => person.id === selectedConvo
    );
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
      recipient_name:
        recipientUser.full_name || recipientUser.email || "CLARA User",
      content: newMsg.trim(),
      is_read: false,
    };

    const optimisticId = `temp-${Date.now()}`;
    setMessages((current) => [
      {
        id: optimisticId,
        ...payload,
        created_at: new Date().toISOString(),
      },
      ...current,
    ]);
    setNewMsg("");

    const { data, error } = await supabase
      .from("direct_messages")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("[Messages] send failed:", error);
      setMessages((current) =>
        current.filter((message) => message.id !== optimisticId)
      );
      setNewMsg(payload.content);
      setSending(false);
      return;
    }

    setMessages((current) => {
      const withoutTemp = current.filter(
        (message) => message.id !== optimisticId
      );
      return data ? [data, ...withoutTemp] : withoutTemp;
    });
    setSending(false);
  };

  if (accessLoading) {
    return <FeaturePageLoader label="Preparing messages..." />;
  }

  if (!hasMessagingAccess) {
    return (
      <div className="mx-auto max-w-4xl p-4 md:p-6">
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
      <div className="mx-auto max-w-4xl p-4 md:p-6">
        <EmptyState
          icon={MessageSquare}
          title="User session not ready"
          description="The logged-in user id is missing."
        />
      </div>
    );
  }

  if (activeConvo) {
    return (
      <div className="fixed inset-0 z-[100] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#0d3b2f_0%,#031b2d_35%,#020817_75%)] text-white">
        <div className="relative z-20 shrink-0 border-b border-white/10 bg-black/25 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.85rem)] backdrop-blur-2xl">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackFromConversation}
              className="h-11 w-11 shrink-0 rounded-2xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="relative shrink-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-400/20 via-cyan-400/10 to-blue-500/20 font-semibold text-white shadow-lg">
                {getMessageInitials(activeConvo.name)}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-white">
                {activeConvo.name}
              </p>
              <p className="truncate text-xs text-white/55">
                {messageMode === "admin_only" && !isAdmin
                  ? "CLARA Admin"
                  : "Private conversation"}
              </p>
            </div>

            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70"
              aria-label="Conversation options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-end space-y-3">
            {activeConvo.messages.length === 0 ? (
              <div className="flex min-h-[56dvh] items-center justify-center">
                <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-white/5 p-6 text-center shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/8">
                    <MessageSquare className="h-7 w-7 text-white/70" />
                  </div>
                  <p className="mb-1 font-semibold text-white">
                    Start your conversation
                  </p>
                  <p className="text-sm text-white/45">
                    Send your first message to {activeConvo.name}.
                  </p>
                </div>
              </div>
            ) : (
              activeConvo.messages.map((message, index) => {
                const isMine = message.sender_id === currentUserId;
                const previousMessage = activeConvo.messages[index - 1];
                const showTime =
                  !previousMessage ||
                  new Date(message.created_at) -
                    new Date(previousMessage.created_at) >
                    1000 * 60 * 30;

                return (
                  <div key={message.id}>
                    {showTime ? (
                      <div className="my-3 flex justify-center">
                        <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/45 backdrop-blur-md">
                          {formatChatTime(message.created_at)}
                        </span>
                      </div>
                    ) : null}

                    <div
                      className={`flex ${
                        isMine ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={[
                          "max-w-[82%] rounded-[22px] px-4 py-3 shadow-lg",
                          isMine
                            ? "rounded-br-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                            : "rounded-bl-md border border-white/10 bg-white/8 text-white backdrop-blur-xl",
                        ].join(" ")}
                      >
                        <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">
                          {message.content}
                        </p>
                        <div
                          className={`mt-1.5 text-[10px] ${
                            isMine ? "text-white/70" : "text-white/40"
                          }`}
                        >
                          {formatBubbleTime(message.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="relative z-20 shrink-0 border-t border-white/10 bg-black/25 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <div className="flex-1 rounded-[24px] border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-xl">
              <Input
                placeholder={
                  selectedConvo
                    ? "Type a message..."
                    : "Select a person first..."
                }
                value={newMsg}
                onChange={(event) => setNewMsg(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                disabled={!selectedConvo || sending}
                className="border-0 bg-transparent px-0 text-white placeholder:text-white/35 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <Button
              onClick={handleSend}
              disabled={!newMsg.trim() || !selectedConvo || sending}
              className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-[0_12px_30px_rgba(16,185,129,0.35)] hover:opacity-95"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(13,148,136,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(79,70,229,0.14),transparent_36%),#020817] text-white">
      <header className="shrink-0 border-b border-white/[0.08] bg-[#020817]/88 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/community")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-white/80 transition hover:bg-white/[0.09]"
            aria-label="Back to Community"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-black tracking-[-0.025em] text-white">
              Messages
            </h1>
            <p className="text-[11px] font-semibold text-white/42">
              Private conversations
            </p>
          </div>

          <button
            type="button"
            onClick={() => setComposerOpen((current) => !current)}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition ${
              composerOpen
                ? "border-emerald-300/25 bg-emerald-400/15 text-emerald-100"
                : "border-white/10 bg-white/[0.055] text-white/80 hover:bg-white/[0.09]"
            }`}
            aria-label="Start a new conversation"
            title="New conversation"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[calc(env(safe-area-inset-bottom)+28px)] pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto w-full max-w-3xl space-y-5">
          <div className="flex h-12 items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.055] px-4">
            <Search className="h-4 w-4 shrink-0 text-white/38" />
            <Input
              placeholder="Search messages"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 border-0 bg-transparent px-0 text-sm font-semibold text-white placeholder:text-white/30 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          {messageMode === "admin_only" && !isAdmin ? (
            <div className="rounded-[18px] border border-emerald-300/15 bg-emerald-400/[0.08] px-4 py-3 text-xs font-semibold text-emerald-50/80">
              You can message CLARA admins from here.
            </div>
          ) : null}

          {composerOpen ? (
            <section className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.045]">
              <div className="border-b border-white/[0.07] px-4 py-3">
                <p className="text-sm font-black text-white">New conversation</p>
                <p className="mt-0.5 text-[11px] font-semibold text-white/38">
                  Choose a member to message privately.
                </p>
              </div>

              <div className="divide-y divide-white/[0.07]">
                {filteredUsers.length === 0 ? (
                  <div className="px-4 py-5 text-sm font-semibold text-white/42">
                    No people found.
                  </div>
                ) : (
                  filteredUsers.map((person) => (
                    <button
                      type="button"
                      key={person.id}
                      onClick={() => openConversation(person.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.045]"
                    >
                      <div className="relative shrink-0">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-400/18 via-blue-500/12 to-emerald-400/16 text-sm font-black text-white">
                          {getMessageInitials(person.full_name || person.email)}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#071120] bg-emerald-400" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">
                          {person.full_name || person.email || "CLARA User"}
                        </p>
                        <p className="truncate text-[11px] font-semibold text-white/38">
                          {person.role === "admin" ? "CLARA Admin" : "Member"}
                        </p>
                      </div>

                      <span className="text-[11px] font-black text-emerald-200/80">
                        Chat
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>
          ) : null}

          {!composerOpen && filteredUsers.length > 0 ? (
            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">People</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-white/36">
                    Tap a member to start a chat
                  </p>
                </div>
              </div>

              <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
                {filteredUsers.slice(0, 12).map((person) => (
                  <button
                    type="button"
                    key={person.id}
                    onClick={() => openConversation(person.id)}
                    className="w-[62px] shrink-0 text-center"
                  >
                    <div className="relative mx-auto w-fit">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-xs font-black text-white transition hover:bg-white/[0.1]">
                        {getMessageInitials(person.full_name || person.email)}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#071120] bg-emerald-400" />
                    </div>
                    <p className="mt-1.5 truncate text-[10px] font-bold text-white/65">
                      {person.full_name || person.email || "Member"}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-black text-white">Recent chats</p>
                <p className="mt-0.5 text-[11px] font-semibold text-white/36">
                  Your latest private conversations
                </p>
              </div>
              {loading ? (
                <span className="text-[10px] font-semibold text-white/30">
                  Syncing...
                </span>
              ) : null}
            </div>

            {filteredConvos.length === 0 ? (
              <div className="rounded-[22px] border border-white/10 bg-white/[0.035] px-4 py-7">
                <EmptyState
                  icon={MessageSquare}
                  title="No messages yet"
                  description="Start a private conversation with someone in the community."
                />
              </div>
            ) : (
              <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.035]">
                <div className="divide-y divide-white/[0.07]">
                  {filteredConvos.map((conversation) => {
                    const last = conversation.lastMessage;
                    const isFromMe = last?.sender_id === currentUserId;

                    return (
                      <button
                        type="button"
                        key={conversation.id}
                        onClick={() => openConversation(conversation.id)}
                        className="flex w-full items-center gap-3 px-3 py-3.5 text-left transition hover:bg-white/[0.045]"
                      >
                        <div className="relative shrink-0">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-400/16 via-blue-500/10 to-emerald-400/14 text-sm font-black text-white">
                            {getMessageInitials(conversation.name)}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#071120] bg-emerald-400" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="min-w-0 flex-1 truncate text-sm font-black text-white">
                              {conversation.name}
                            </p>
                            <span className="shrink-0 text-[10px] font-semibold text-white/35">
                              {formatChatTime(last?.created_at)}
                            </span>
                          </div>

                          <div className="mt-1 flex items-center gap-1.5">
                            <p className="min-w-0 flex-1 truncate text-xs font-semibold text-white/42">
                              {isFromMe ? "You: " : ""}
                              {last?.content || "Start chatting"}
                            </p>

                            {conversation.unreadCount > 0 ? (
                              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400 px-1.5 text-[10px] font-black text-slate-950">
                                {conversation.unreadCount > 9
                                  ? "9+"
                                  : conversation.unreadCount}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
