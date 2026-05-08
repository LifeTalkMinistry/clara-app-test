import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ChevronRight,
  MessageCircle,
  Plus,
  Search,
  Send,
} from "lucide-react";

import {
  dashboardPanelFormatTime,
  dashboardPanelInitials,
} from "@/components/fresh/dashboard-panels/feed/utils/feedHelpers";
import useUserRole from "@/hooks/useUserRole";
import { supabase } from "@/lib/supabaseClient";
import { normalizeString, normalizeLower } from "@/utils/dashboard/dashboardHelpers";

export default function DashboardMessagesPanel({ onBack }) {
  const { user, isAdmin, access, getFeatureAccessMode, loading: accessLoading } = useUserRole();

  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [newMsg, setNewMsg] = useState("");
  const [search, setSearch] = useState("");
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");

  const messagesEndRef = useRef(null);

  const currentUserId = user?.id || null;
  const currentUserEmail = user?.email || "";
  const currentUserName =
    user?.full_name ||
    user?.nickname ||
    user?.display_name ||
    user?.email ||
    "You";

  const messageMode = getFeatureAccessMode?.("messages");
  const hasFullMessaging = isAdmin || !!access?.messagingFull;
  const canMessageAdmins = isAdmin || !!access?.messagingAdminOnly;
  const hasMessagingAccess =
    (hasFullMessaging || canMessageAdmins) && !user?.messaging_disabled;

  const fetchUsers = useCallback(async () => {
    if (!currentUserId) {
      setUsers([]);
      return;
    }

    const { data: baseProfiles, error: baseError } = await supabase
      .from("profiles")
      .select("id,email,full_name");

    if (baseError) {
      console.error("[DashboardMessagesPanel] base profiles fetch failed:", baseError);
      setUsers([]);
      return;
    }

    let optionalProfiles = [];
    const { data: extraProfiles, error: extraError } = await supabase
      .from("profiles")
      .select("id,role,username,display_name");

    if (!extraError) {
      optionalProfiles = Array.isArray(extraProfiles) ? extraProfiles : [];
    } else {
      const { data: fallbackProfiles, error: fallbackError } = await supabase
        .from("profiles")
        .select("id,role");

      if (!fallbackError) {
        optionalProfiles = Array.isArray(fallbackProfiles) ? fallbackProfiles : [];
      }
    }

    const optionalMap = optionalProfiles.reduce((acc, item) => {
      if (item?.id) acc[item.id] = item;
      return acc;
    }, {});

    let merged = (Array.isArray(baseProfiles) ? baseProfiles : []).map((profile) => {
      const extra = optionalMap[profile.id] || {};
      const username = normalizeString(extra?.username || "");
      const displayName =
        normalizeString(profile?.full_name) ||
        normalizeString(extra?.display_name) ||
        username ||
        normalizeString(profile?.email) ||
        "CLARA User";

      return {
        id: profile?.id || null,
        email: profile?.email || "",
        full_name: displayName,
        username,
        role: String(extra?.role || "user").toLowerCase(),
      };
    });

    merged = merged.filter((profile) => {
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
      merged = merged.filter((profile) => profile.role === "admin");
    }

    setUsers(merged);
  }, [canMessageAdmins, currentUserEmail, currentUserId, hasFullMessaging]);

  const fetchMessages = useCallback(async () => {
    if (!currentUserId) {
      setMessages([]);
      return;
    }

    const { data, error } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[DashboardMessagesPanel] messages fetch failed:", error);
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
        console.error("[DashboardMessagesPanel] initial load failed:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [currentUserId, fetchMessages, fetchUsers, hasMessagingAccess]);

  useEffect(() => {
    if (!currentUserId || !hasMessagingAccess) return undefined;

    const channel = supabase
      .channel(`dashboard-direct-messages-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages" },
        fetchMessages
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchMessages, hasMessagingAccess]);

  const usersById = useMemo(() => {
    return users.reduce((acc, item) => {
      if (item?.id) acc[item.id] = item;
      return acc;
    }, {});
  }, [users]);

  const getPersonDisplayName = useCallback((person = {}) => {
    return normalizeString(person.full_name || person.name || person.email || person.username || "CLARA User");
  }, []);

  const getPersonSortKey = useCallback(
    (person = {}) => getPersonDisplayName(person).trim().toLowerCase(),
    [getPersonDisplayName]
  );

  const sortPeopleAlphabetically = useCallback(
    (items = []) =>
      [...items].sort((a, b) => {
        const nameA = getPersonSortKey(a);
        const nameB = getPersonSortKey(b);
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        return normalizeLower(a.email).localeCompare(normalizeLower(b.email));
      }),
    [getPersonSortKey]
  );

  const alphabetizedUsers = useMemo(() => {
    const unique = new Map();

    users.forEach((person) => {
      if (person?.id && !unique.has(person.id)) unique.set(person.id, person);
    });

    return sortPeopleAlphabetically(Array.from(unique.values()));
  }, [sortPeopleAlphabetically, users]);

  const conversations = useMemo(() => {
    const map = {};

    messages.forEach((message) => {
      const isMine = message.sender_id === currentUserId;
      const otherId = isMine ? message.recipient_id : message.sender_id;
      if (!otherId) return;

      const otherEmail = isMine ? message.recipient_email : message.sender_email;
      const otherName = isMine
        ? message.recipient_name || usersById[message.recipient_id]?.full_name || otherEmail
        : message.sender_name || usersById[message.sender_id]?.full_name || otherEmail;

      if (!map[otherId]) {
        map[otherId] = {
          id: otherId,
          email: otherEmail || "",
          name: otherName || "CLARA User",
          username: usersById[otherId]?.username || "",
          messages: [],
          lastMessage: null,
          unreadCount: 0,
        };
      }

      map[otherId].messages.push(message);

      if (message.recipient_id === currentUserId && !message.is_read) {
        map[otherId].unreadCount += 1;
      }
    });

    Object.values(map).forEach((convo) => {
      convo.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      convo.lastMessage = convo.messages[convo.messages.length - 1] || null;
    });

    return Object.values(map).sort((a, b) => {
      const nameA = normalizeLower(a.name || a.email || a.username || "CLARA User");
      const nameB = normalizeLower(b.name || b.email || b.username || "CLARA User");
      if (nameA !== nameB) return nameA.localeCompare(nameB);
      return normalizeLower(a.email).localeCompare(normalizeLower(b.email));
    });
  }, [currentUserId, messages, usersById]);

  const filteredPeople = useMemo(() => {
    const term = search.trim().toLowerCase();
    const source = alphabetizedUsers;

    if (!term) return source;

    return source.filter((item) => {
      const name = (item.full_name || item.name || "").trim().toLowerCase();
      const email = (item.email || "").trim().toLowerCase();
      const username = (item.username || "").trim().toLowerCase();
      return name.includes(term) || email.includes(term) || username.includes(term);
    });
  }, [alphabetizedUsers, search]);

  const filteredNewChatPeople = useMemo(() => {
    const term = newChatSearch.trim().toLowerCase();
    const source = alphabetizedUsers;

    if (!term) return source;

    return source.filter((item) => {
      const name = (item.full_name || item.name || "").trim().toLowerCase();
      const email = (item.email || "").trim().toLowerCase();
      const username = (item.username || "").trim().toLowerCase();
      return name.includes(term) || email.includes(term) || username.includes(term);
    });
  }, [alphabetizedUsers, newChatSearch]);

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return conversations;

    return conversations.filter((convo) => {
      const name = (convo.name || "").trim().toLowerCase();
      const email = (convo.email || "").trim().toLowerCase();
      const username = (convo.username || "").trim().toLowerCase();
      return name.includes(term) || email.includes(term) || username.includes(term);
    });
  }, [conversations, search]);

  const activeConvo = useMemo(() => {
    if (!selectedConvo) return null;

    const existing = conversations.find((item) => item.id === selectedConvo);
    if (existing) return existing;

    const foundUser = users.find((item) => item.id === selectedConvo);
    if (!foundUser) return null;

    return {
      id: foundUser.id,
      email: foundUser.email || "",
      name: foundUser.full_name || foundUser.email || "CLARA User",
      username: foundUser.username || "",
      messages: [],
      lastMessage: null,
      unreadCount: 0,
    };
  }, [conversations, selectedConvo, users]);

  useEffect(() => {
    if (activeConvo && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeConvo, messages]);

  useEffect(() => {
    const markRead = async () => {
      if (!activeConvo?.id || !currentUserId) return;

      const unreadIds = activeConvo.messages
        .filter((message) => message.recipient_id === currentUserId && !message.is_read)
        .map((message) => message.id);

      if (!unreadIds.length) return;

      const { error } = await supabase
        .from("direct_messages")
        .update({ is_read: true })
        .in("id", unreadIds);

      if (error) {
        console.error("[DashboardMessagesPanel] mark as read failed:", error);
        return;
      }

      setMessages((prev) =>
        prev.map((message) =>
          unreadIds.includes(message.id) ? { ...message, is_read: true } : message
        )
      );
    };

    markRead();
  }, [activeConvo, currentUserId]);

  const openConversation = useCallback((userId) => {
    setSelectedConvo(userId);
    setPeopleOpen(false);
    setNewChatSearch("");
  }, []);

  const handleSend = useCallback(async () => {
    if (!newMsg.trim() || !selectedConvo || !currentUserId || sending) return;

    const recipientUser = users.find((item) => item.id === selectedConvo);
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
      console.error("[DashboardMessagesPanel] send failed:", error);
      setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
      setNewMsg(payload.content);
      setSending(false);
      return;
    }

    setMessages((prev) => {
      const withoutTemp = prev.filter((message) => message.id !== optimisticId);
      return data ? [data, ...withoutTemp] : withoutTemp;
    });

    setSending(false);
  }, [
    currentUserEmail,
    currentUserId,
    currentUserName,
    newMsg,
    selectedConvo,
    sending,
    users,
  ]);

  if (accessLoading || loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-[30px] border border-white/15 bg-white/[0.055] p-8 text-center backdrop-blur-xl">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-emerald-300" />
          <p className="mt-3 text-sm text-white/55">Preparing messages...</p>
        </div>
      </div>
    );
  }

  if (!currentUserId || !hasMessagingAccess) {
    return (
      <div className="space-y-4">
        <div className="rounded-[30px] border border-white/15 bg-white/[0.055] p-8 text-center backdrop-blur-xl">
          <MessageCircle className="mx-auto h-8 w-8 text-white/55" />
          <p className="mt-3 text-sm font-bold text-white">
            {!currentUserId ? "User session not ready" : "Messages are locked"}
          </p>
          <p className="mt-1 text-xs text-white/55">
            {!currentUserId
              ? "Refresh or log in again."
              : "Enable messaging or upgrade this plan to use conversations."}
          </p>
        </div>
      </div>
    );
  }

  if (activeConvo) {
    const isAdminConversation = messageMode === "admin_only" && !isAdmin;
    const activeMessages = Array.isArray(activeConvo.messages) ? activeConvo.messages : [];

    const conversationOverlay = (
      <section
        className="fixed inset-0 z-[2147483000] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#020817] text-white"
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100dvh",
          maxWidth: "100vw",
          maxHeight: "100dvh",
          margin: 0,
          borderRadius: 0,
          transform: "none",
          isolation: "isolate",
        }}
        aria-label={`Conversation with ${activeConvo.name}`}
      >
        <style>{`
          @keyframes claraDashboardMessageIn {
            from { opacity: 0; transform: translateY(8px) scale(0.985); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }

          .clara-dashboard-message-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(255,255,255,0.16) transparent;
          }

          .clara-dashboard-message-scroll::-webkit-scrollbar { width: 4px; }
          .clara-dashboard-message-scroll::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.16);
            border-radius: 999px;
          }
        `}</style>

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.20),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.10),transparent_42%)]" />

        <header className="relative z-20 shrink-0 border-b border-white/15 bg-[#03151b]/92 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedConvo(null)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.05] text-white/85 transition hover:bg-white/[0.08] active:scale-95"
              aria-label="Back to inbox"
            >
              <ArrowDown className="h-4 w-4 rotate-90" />
            </button>

            <div className="relative shrink-0">
              <div className="grid h-10 w-10 place-items-center rounded-full border border-emerald-300/20 bg-[radial-gradient(circle_at_30%_20%,rgba(45,246,222,0.32),rgba(10,88,86,0.56)_42%,rgba(5,25,35,0.96)_100%)] text-xs font-black tracking-tight text-white shadow-[0_0_24px_rgba(20,184,166,0.16)]">
                {dashboardPanelInitials(activeConvo.name || activeConvo.email || "CL")}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#03111c] bg-emerald-400" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-black leading-tight text-white">{activeConvo.name}</p>
              <p className="truncate text-[11px] font-medium text-white/55">
                {isAdminConversation ? "CLARA Admin" : "Private conversation"}
              </p>
            </div>

          </div>
        </header>

        <main
          className="clara-dashboard-message-scroll relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-4"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end">
            {activeMessages.length === 0 ? (
              <div className="flex min-h-[56dvh] items-center justify-center px-6 text-center">
                <div className="w-full max-w-[280px]">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-emerald-300/20 bg-emerald-400/10 text-emerald-100 shadow-[0_0_28px_rgba(16,185,129,0.16)]">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-lg font-black text-white">Start your conversation</p>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    Send your first message to {activeConvo.name}.
                  </p>
                </div>
              </div>
            ) : (
              activeMessages.map((message, index) => {
                const isMine = message.sender_id === currentUserId;
                const previous = activeMessages[index - 1];
                const next = activeMessages[index + 1];
                const previousIsMine = previous?.sender_id === currentUserId;
                const nextIsMine = next?.sender_id === currentUserId;
                const isFirstInGroup = !previous || previousIsMine !== isMine;
                const isLastInGroup = !next || nextIsMine !== isMine;
                const currentDate = message.created_at ? new Date(message.created_at) : null;
                const previousDate = previous?.created_at ? new Date(previous.created_at) : null;
                const showDateSeparator =
                  !previous ||
                  !currentDate ||
                  !previousDate ||
                  currentDate.toDateString() !== previousDate.toDateString();

                return (
                  <div key={message.id || `message-${index}`}>
                    {showDateSeparator ? (
                      <div className="my-4 flex justify-center">
                        <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
                          {dashboardPanelFormatTime(message.created_at)}
                        </span>
                      </div>
                    ) : null}

                    <div
                      className={`flex w-full animate-[claraDashboardMessageIn_180ms_ease-out_both] ${
                        isMine ? "justify-end" : "justify-start"
                      } ${isFirstInGroup ? "mt-4" : "mt-1.5"}`}
                    >
                      <div className={`flex max-w-[86%] items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                        {!isMine ? (
                          isFirstInGroup ? (
                            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.05] text-[10px] font-black text-white/75">
                              {dashboardPanelInitials(activeConvo.name || "CL")}
                            </div>
                          ) : (
                            <div className="h-7 w-7 shrink-0" />
                          )
                        ) : null}

                        <div className="min-w-0">
                          <div
                            className={`break-words px-4 py-3 text-[14px] leading-6 shadow-[0_10px_30px_rgba(0,0,0,0.18)] ${
                              isMine
                                ? "rounded-[22px] bg-[linear-gradient(135deg,rgba(16,185,129,1),rgba(20,184,166,1))] text-white"
                                : "rounded-[22px] border border-white/15 bg-white/[0.06] text-white/92"
                            } ${isMine && isFirstInGroup ? "rounded-tr-md" : ""} ${
                              isMine && isLastInGroup ? "rounded-br-md" : ""
                            } ${!isMine && isFirstInGroup ? "rounded-tl-md" : ""} ${
                              !isMine && isLastInGroup ? "rounded-bl-md" : ""
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          </div>

                          {isLastInGroup ? (
                            <div className={`mt-1 px-1 text-[10px] font-medium text-white/38 ${isMine ? "text-right" : "text-left"}`}>
                              {dashboardPanelFormatTime(message.created_at)}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} className="h-2" />
          </div>
        </main>

        <footer className="relative z-20 shrink-0 border-t border-white/15 bg-[#020817]/94 px-3 pb-[calc(env(safe-area-inset-bottom)+0.7rem)] pt-2 backdrop-blur-xl">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSend();
            }}
            className="mx-auto flex max-w-3xl items-end gap-2 rounded-[28px] border border-white/15 bg-white/[0.05] p-1.5 shadow-[0_14px_40px_rgba(0,0,0,0.22)]"
          >
            <textarea
              value={newMsg}
              onChange={(event) => setNewMsg(event.target.value)}
              placeholder="Type a message..."
              disabled={sending}
              rows={1}
              className="max-h-28 min-h-[42px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[14px] leading-5 text-white outline-none placeholder:text-white/38 disabled:opacity-60"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              type="submit"
              disabled={!newMsg.trim() || sending}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,rgba(16,185,129,1),rgba(34,211,238,0.92))] text-white shadow-[0_0_24px_rgba(20,184,166,0.28)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </footer>
      </section>
    );

    return createPortal(conversationOverlay, document.body);
  }

  if (peopleOpen) {
    const newChatOverlay = (
      <section
        className="fixed inset-0 z-[2147483000] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#020817] text-white"
        aria-label="New chat"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.10),transparent_42%)]" />

        <header className="relative z-20 shrink-0 border-b border-white/15 bg-[#03151b]/92 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setPeopleOpen(false);
                setNewChatSearch("");
              }}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.05] text-white/85 transition hover:bg-white/[0.08] active:scale-95"
              aria-label="Back to messages"
            >
              <ArrowDown className="h-4 w-4 rotate-90" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-black leading-tight text-white">New Chat</p>
              <p className="truncate text-[11px] font-medium text-white/55">Choose someone from CLARA People</p>
            </div>
          </div>
        </header>

        <div className="relative z-10 shrink-0 border-b border-white/15 bg-[#020817]/86 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.055] px-3 py-2 shadow-[0_12px_34px_rgba(0,0,0,0.18)]">
            <Search className="h-4 w-4 text-white/45" />
            <input
              value={newChatSearch}
              onChange={(event) => setNewChatSearch(event.target.value)}
              placeholder="Search people..."
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              autoFocus
            />
          </div>
        </div>

        <main
          className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="mx-auto grid w-full max-w-3xl gap-2 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            {filteredNewChatPeople.length === 0 ? (
              <div className="rounded-[30px] border border-white/15 bg-white/[0.055] p-8 text-center shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl">
                <MessageCircle className="mx-auto h-8 w-8 text-white/45" />
                <p className="mt-3 text-sm font-bold text-white">No people found.</p>
              </div>
            ) : (
              filteredNewChatPeople.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => openConversation(person.id)}
                  className="w-full rounded-[24px] border border-white/15 bg-white/[0.055] px-4 py-3 text-left shadow-[0_12px_36px_rgba(0,0,0,0.16)] backdrop-blur-xl transition hover:bg-white/[0.075] active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-white/15 bg-white/10 text-sm font-black text-white">
                      {dashboardPanelInitials(person.full_name || person.email || person.username)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">
                        {person.full_name || person.email || person.username || "CLARA User"}
                      </p>
                      <p className="truncate text-xs text-white/45">
                        {person.email || person.username || "CLARA member"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/35" />
                  </div>
                </button>
              ))
            )}
          </div>
        </main>
      </section>
    );

    return createPortal(newChatOverlay, document.body);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[30px] border border-white/15 bg-white/[0.055] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl">
        <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-black/15 px-3 py-2">
          <Search className="h-4 w-4 text-white/45" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search people or conversations..."
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
          />
        </div>

        <button
          type="button"
          onClick={() => setPeopleOpen(true)}
          className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-3 text-left transition hover:bg-emerald-400/15 active:scale-[0.99]"
        >
          <div>
            <p className="text-sm font-bold text-white">Start new chat</p>
            <p className="text-xs text-white/55">
              {messageMode === "admin_only" && !isAdmin
                ? "Message CLARA admins"
                : "Choose someone from CLARA People"}
            </p>
          </div>
          <Plus className="h-5 w-5 text-emerald-200" />
        </button>
      </div>

      {filteredConversations.length === 0 ? (
        <div className="rounded-[30px] border border-white/15 bg-white/[0.055] p-8 text-center shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl">
          <MessageCircle className="mx-auto h-8 w-8 text-white/45" />
          <p className="mt-3 text-sm font-bold text-white">{search.trim() ? "No conversations found." : "No messages yet"}</p>
          <p className="mt-1 text-xs text-white/55">
            {search.trim() ? "Try searching another name, email, or username." : "Start a conversation above and it will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredConversations.map((conversation) => {
            const last = conversation.lastMessage;
            const isMine = last?.sender_id === currentUserId;

            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => openConversation(conversation.id)}
                className="w-full rounded-[30px] border border-white/15 bg-white/[0.055] p-4 text-left shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl transition hover:bg-white/[0.075]"
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/15 bg-white/10 text-sm font-black text-white">
                      {dashboardPanelInitials(conversation.name)}
                    </div>
                    {conversation.unreadCount > 0 ? (
                      <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-emerald-400 px-1 text-[10px] font-black text-slate-950">
                        {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                      </span>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-white">{conversation.name}</p>
                      <span className="shrink-0 text-[10px] text-white/45">
                        {dashboardPanelFormatTime(last?.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-white/55">
                      {isMine ? "You: " : ""}{last?.content || "Start chatting"}
                    </p>
                  </div>

                  <ChevronRight className="h-4 w-4 text-white/35" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
