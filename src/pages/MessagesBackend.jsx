import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  LockKeyhole,
  MessageSquare,
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
  formatChatTime,
  getMessageInitials,
} from "@/components/fresh/messages/messagesUtils";
import {
  ConversationActionsMenu,
  InteractiveMessageBubble,
} from "@/components/fresh/messages/MessageConversationActions";
import SupportTierBadge from "@/components/support/SupportTierBadge";
import { ClaraOrbMark } from "@/components/community/ClaraOrbPage";
import { CLARA_SUPPORT_CONVERSATION_TARGET } from "@/lib/support-conversation-navigation";

const CLARA_SUPPORT_EMAIL = "claraprogram2026@gmail.com";
const MESSAGE_GROUP_WINDOW_MS = 5 * 60 * 1000;

function isSettingsSupportContent(value) {
  return /^\[CLARA Support\s*•/i.test(String(value || "").trim());
}

function isSupportMessage(message = {}) {
  return (
    String(message.message_type || "").toLowerCase() === "support" ||
    String(message.conversation_id || "").startsWith("support_") ||
    isSettingsSupportContent(message.content)
  );
}

function supportConversationKey(userId) {
  return `support:${String(userId || "")}`;
}

function validMessageDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sameMessageDay(first, second) {
  const firstDate = validMessageDate(first?.created_at);
  const secondDate = validMessageDate(second?.created_at);
  if (!firstDate || !secondDate) return false;
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function formatMessageDayLabel(value) {
  const date = validMessageDate(value);
  if (!date) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

function messagesBelongTogether(first, second, isOutgoing) {
  if (!first || !second || !sameMessageDay(first, second)) return false;
  if (isOutgoing(first) !== isOutgoing(second)) return false;

  const firstDate = validMessageDate(first.created_at);
  const secondDate = validMessageDate(second.created_at);
  if (!firstDate || !secondDate) return false;

  return Math.abs(secondDate.getTime() - firstDate.getTime()) <= MESSAGE_GROUP_WINDOW_MS;
}

function messageGroupPosition(messages, index, isOutgoing) {
  const current = messages[index];
  const previous = messages[index - 1];
  const next = messages[index + 1];
  const joinsPrevious = messagesBelongTogether(previous, current, isOutgoing);
  const joinsNext = messagesBelongTogether(current, next, isOutgoing);

  if (joinsPrevious && joinsNext) return "middle";
  if (joinsNext) return "first";
  if (joinsPrevious) return "last";
  return "single";
}

function ClaraSupportAvatar({ size = "h-11 w-11" }) {
  return (
    <div className={`${size} shrink-0 overflow-visible rounded-full`}>
      <ClaraOrbMark className="h-full w-full" title="CLARA Support" />
    </div>
  );
}

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
      const data = await backendRequest("/api/messages/view", { token });
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
      if (isSupportMessage(message)) {
        const supportUserId = String(
          message.support_user_id ||
            (isSettingsSupportContent(message.content) ? message.sender_id : currentUserId) ||
            ""
        );
        if (!supportUserId) return;

        if (isAdmin) {
          const key = supportConversationKey(supportUserId);
          const userProfile = usersById[supportUserId] || {};
          const userIsSender = String(message.sender_id) === supportUserId;
          const userEmail = userIsSender ? message.sender_email : message.recipient_email;
          const userName = userIsSender ? message.sender_name : message.recipient_name;
          const userSupportTier =
            (userIsSender ? message.sender_support_tier : message.recipient_support_tier) ||
            userProfile.support_tier ||
            null;

          if (!convos[key]) {
            convos[key] = {
              id: key,
              supportUserId,
              email: userEmail || userProfile.email || "",
              name:
                userName ||
                userProfile.display_name ||
                userProfile.full_name ||
                userEmail ||
                "CLARA User",
              supportTier: userSupportTier,
              isSupport: true,
              messages: [],
              lastMessage: null,
              unreadCount: 0,
            };
          } else if (!convos[key].supportTier && userSupportTier) {
            convos[key].supportTier = userSupportTier;
          }

          convos[key].messages.push(message);
          if (String(message.sender_id) === supportUserId && !message.is_read) {
            convos[key].unreadCount += 1;
          }
          return;
        }

        const key = CLARA_SUPPORT_CONVERSATION_TARGET;
        if (!convos[key]) {
          convos[key] = {
            id: key,
            supportUserId: String(currentUserId),
            email: CLARA_SUPPORT_EMAIL,
            name: "CLARA",
            supportTier: null,
            isSupport: true,
            messages: [],
            lastMessage: null,
            unreadCount: 0,
          };
        }
        convos[key].messages.push(message);
        if (
          String(message.recipient_id) === String(currentUserId) &&
          !message.is_read
        ) {
          convos[key].unreadCount += 1;
        }
        return;
      }

      const isMine = String(message.sender_id) === String(currentUserId);
      const otherId = isMine ? message.recipient_id : message.sender_id;
      if (!otherId) return;
      const otherProfile = usersById[String(otherId)] || {};
      const otherEmail = isMine ? message.recipient_email : message.sender_email;
      const otherName = isMine ? message.recipient_name : message.sender_name;
      const otherSupportTier =
        (isMine ? message.recipient_support_tier : message.sender_support_tier) ||
        otherProfile.support_tier ||
        null;
      const key = String(otherId);
      if (!convos[key]) {
        convos[key] = {
          id: otherId,
          email: otherEmail || otherProfile.email || "",
          name:
            otherName ||
            otherProfile.display_name ||
            otherProfile.full_name ||
            otherEmail ||
            "CLARA User",
          supportTier: otherSupportTier,
          isSupport: false,
          messages: [],
          lastMessage: null,
          unreadCount: 0,
        };
      } else if (!convos[key].supportTier && otherSupportTier) {
        convos[key].supportTier = otherSupportTier;
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
  }, [currentUserId, isAdmin, messages, usersById]);

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
        String(person.display_name || person.full_name || "")
          .toLowerCase()
          .includes(term) || String(person.email || "").toLowerCase().includes(term)
    );
  }, [search, users]);

  const filteredConvos = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return convoList;
    return convoList.filter(
      (conversation) =>
        String(conversation.name || "").toLowerCase().includes(term) ||
        String(conversation.lastMessage?.content || "").toLowerCase().includes(term)
    );
  }, [convoList, search]);

  const activeConvo = useMemo(() => {
    if (!selectedConvo) return null;
    const key = String(selectedConvo);
    if (convoMap[key]) return convoMap[key];

    if (!isAdmin && key === CLARA_SUPPORT_CONVERSATION_TARGET) {
      return {
        id: CLARA_SUPPORT_CONVERSATION_TARGET,
        supportUserId: String(currentUserId),
        email: CLARA_SUPPORT_EMAIL,
        name: "CLARA",
        supportTier: null,
        isSupport: true,
        messages: [],
        lastMessage: null,
        unreadCount: 0,
      };
    }

    if (isAdmin && key.startsWith("support:")) {
      const supportUserId = key.slice("support:".length);
      const person = usersById[supportUserId];
      if (!person) return null;
      return {
        id: key,
        supportUserId,
        email: person.email || "",
        name: person.display_name || person.full_name || person.email || "CLARA User",
        supportTier: person.support_tier || null,
        isSupport: true,
        messages: [],
        lastMessage: null,
        unreadCount: 0,
      };
    }

    const person = usersById[key];
    if (!person) return null;
    return {
      id: person.id,
      email: person.email || "",
      name: person.display_name || person.full_name || person.email || "CLARA User",
      supportTier: person.support_tier || null,
      isSupport: false,
      messages: [],
      lastMessage: null,
      unreadCount: 0,
    };
  }, [convoMap, currentUserId, isAdmin, selectedConvo, usersById]);

  useEffect(() => {
    if (!targetUserIdFromUrl) return;

    if (
      !isAdmin &&
      targetUserIdFromUrl === CLARA_SUPPORT_CONVERSATION_TARGET
    ) {
      setSelectedConvo(CLARA_SUPPORT_CONVERSATION_TARGET);
      setSearchActive(false);
      return;
    }

    if (isAdmin && targetUserIdFromUrl.startsWith("support:")) {
      const supportUserId = targetUserIdFromUrl.slice("support:".length);
      if (!usersById[supportUserId]) return;
      setSelectedConvo(targetUserIdFromUrl);
      setSearchActive(false);
      return;
    }

    if (!users.length) return;
    const person = users.find(
      (item) => String(item.id) === String(targetUserIdFromUrl)
    );
    if (!person) return;
    setSelectedConvo(person.id);
    setSearchActive(false);
  }, [isAdmin, targetUserIdFromUrl, users, usersById]);

  useEffect(() => {
    if (activeConvo && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeConvo, messages]);

  useEffect(() => {
    const markRead = async () => {
      if (!activeConvo?.id || !token) return;

      const ids = activeConvo.messages
        .filter((message) => {
          if (message.is_read) return false;
          if (!activeConvo.isSupport) {
            return String(message.recipient_id) === String(currentUserId);
          }
          if (isAdmin) {
            return String(message.sender_id) === String(activeConvo.supportUserId);
          }
          return String(message.recipient_id) === String(currentUserId);
        })
        .map((message) => message.id)
        .filter((id) => !String(id).startsWith("temp-"));

      if (!ids.length) return;
      try {
        await backendRequest(
          activeConvo.isSupport ? "/api/messages/support/read" : "/api/messages/read",
          {
            method: "PATCH",
            token,
            body: { ids },
          }
        );
        setMessages((current) =>
          current.map((message) =>
            ids.includes(message.id) ? { ...message, is_read: true } : message
          )
        );
      } catch (error) {
        console.error("[Messages] mark read failed:", error);
      }
    };
    markRead();
  }, [activeConvo, currentUserId, isAdmin, token]);

  const openConversation = (conversationId) => {
    setSelectedConvo(conversationId);
    setSearchActive(false);
    setSearch("");
    const next = new URLSearchParams(searchParams);
    next.set("userId", String(conversationId));
    setSearchParams(next, { replace: true });
  };

  const handleBackFromConversation = () => {
    setSelectedConvo(null);
    const next = new URLSearchParams(searchParams);
    next.delete("userId");
    setSearchParams(next, { replace: true });
  };

  const messageIsOutgoing = useCallback(
    (message, conversation = activeConvo) => {
      if (conversation?.isSupport && isAdmin) {
        return (
          String(message?.sender_id || "") !==
          String(conversation.supportUserId || "")
        );
      }
      return String(message?.sender_id || "") === String(currentUserId);
    },
    [activeConvo, currentUserId, isAdmin]
  );

  const handleMessageDeleted = useCallback((messageId) => {
    setMessages((current) =>
      current.filter((message) => String(message.id) !== String(messageId))
    );
  }, []);

  const handleConversationCleared = useCallback((messageIds) => {
    const deletedIds = new Set(
      (Array.isArray(messageIds) ? messageIds : []).map((id) => String(id))
    );
    if (!deletedIds.size) return;
    setMessages((current) =>
      current.filter((message) => !deletedIds.has(String(message.id)))
    );
  }, []);

  const handleInteractionChanged = useCallback((interaction) => {
    const messageId = interaction?.message_id;
    if (!messageId) return;
    setMessages((current) =>
      current.map((message) =>
        String(message.id) === String(messageId)
          ? {
              ...message,
              my_reaction: interaction.my_reaction || null,
              reaction_summary: interaction.reaction_summary || {},
            }
          : message
      )
    );
  }, []);

  const handleSend = async () => {
    const content = newMsg.trim();
    if (!content || !activeConvo?.id || sending || !token) return;

    const supportUserId = activeConvo.isSupport
      ? String(activeConvo.supportUserId || currentUserId)
      : "";
    setSending(true);
    const optimisticId = `temp-${Date.now()}`;
    const optimistic = activeConvo.isSupport
      ? {
          id: optimisticId,
          conversation_id: `support_${supportUserId}`,
          sender_id: currentUserId,
          sender_email: currentUserEmail,
          sender_name: currentUserName,
          recipient_id: isAdmin ? supportUserId : null,
          recipient_email: isAdmin ? activeConvo.email : CLARA_SUPPORT_EMAIL,
          recipient_name: isAdmin ? activeConvo.name : "CLARA",
          content,
          is_read: false,
          created_at: new Date().toISOString(),
          message_type: "support",
          support_user_id: supportUserId,
          my_reaction: null,
          reaction_summary: {},
        }
      : {
          id: optimisticId,
          sender_id: currentUserId,
          sender_email: currentUserEmail,
          sender_name: currentUserName,
          recipient_id: activeConvo.id,
          recipient_email: activeConvo.email,
          recipient_name: activeConvo.name,
          recipient_support_tier: activeConvo.supportTier || null,
          content,
          is_read: false,
          created_at: new Date().toISOString(),
          my_reaction: null,
          reaction_summary: {},
        };

    setMessages((current) => [optimistic, ...current]);
    setNewMsg("");

    try {
      const saved = activeConvo.isSupport
        ? await backendRequest(
            isAdmin
              ? `/api/messages/support/${encodeURIComponent(supportUserId)}`
              : "/api/messages/support",
            {
              method: "POST",
              token,
              body: { content },
            }
          )
        : await backendRequest("/api/messages", {
            method: "POST",
            token,
            body: { recipient_id: activeConvo.id, content },
          });

      setMessages((current) => [
        { ...saved, my_reaction: null, reaction_summary: {} },
        ...current.filter((message) => message.id !== optimisticId),
      ]);
    } catch (error) {
      console.error("[Messages] send failed:", error);
      setMessages((current) =>
        current.filter((message) => message.id !== optimisticId)
      );
      setNewMsg(content);
    } finally {
      setSending(false);
    }
  };

  if (accessLoading) return <FeaturePageLoader label="Preparing messages..." />;
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
  if (!currentUserId || !token) {
    return (
      <div className="mx-auto max-w-4xl p-4 md:p-6">
        <EmptyState
          icon={MessageSquare}
          title="Account connection required"
          description="Sign in again so CLARA can connect your online messages."
        />
      </div>
    );
  }

  if (activeConvo) {
    const showClaraIdentity = activeConvo.isSupport && !isAdmin;
    const conversationSubtitle = activeConvo.isSupport ? "CLARA Support" : "Private conversation";
    const lastOutgoingMessage = [...activeConvo.messages]
      .reverse()
      .find((message) => messageIsOutgoing(message, activeConvo));

    return (
      <div className="fixed inset-0 z-[100] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#06111f] text-white">
        <header className="relative shrink-0 border-b border-white/[0.08] bg-[#06111f]/96 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.85rem)] shadow-[0_14px_40px_rgba(0,0,0,0.16)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#22c7b8]/45 to-transparent" />
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back to messages"
              onClick={handleBackFromConversation}
              className="h-11 w-11 shrink-0 rounded-2xl border border-white/10 bg-white/[0.055] text-white transition hover:bg-white/[0.09]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            {showClaraIdentity ? (
              <ClaraSupportAvatar />
            ) : (
              <div className="relative shrink-0">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#22c7b8]/25 bg-[#22c7b8]/10 font-black text-[#ccfbf1] shadow-[0_0_24px_rgba(34,199,184,0.08)]">
                  {getMessageInitials(activeConvo.name)}
                </div>
                {!activeConvo.isSupport ? (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#06111f] bg-emerald-400" />
                ) : null}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <p className="min-w-0 truncate font-black tracking-[-0.015em] text-white">
                  {showClaraIdentity ? "CLARA" : activeConvo.name}
                </p>
                {!showClaraIdentity ? (
                  <SupportTierBadge tier={activeConvo.supportTier} compact />
                ) : null}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-white/42">
                {!activeConvo.isSupport ? <LockKeyhole className="h-3 w-3" /> : null}
                <span className="truncate">{conversationSubtitle}</span>
              </div>
            </div>

            <ConversationActionsMenu
              messageIds={activeConvo.messages.map((message) => message.id)}
              onCleared={handleConversationCleared}
            />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_50%_-20%,rgba(34,199,184,0.055),transparent_38%)] px-4 py-4">
          <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-end">
            {activeConvo.messages.length === 0 ? (
              <div className="flex min-h-[56dvh] items-center justify-center">
                <div className="max-w-sm text-center">
                  {showClaraIdentity ? (
                    <ClaraSupportAvatar size="mx-auto h-12 w-12" />
                  ) : (
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#5eead4]/15 bg-[#5eead4]/[0.06]">
                      <MessageSquare className="h-6 w-6 text-[#5eead4]/55" />
                    </div>
                  )}
                  <p className="mt-4 font-black tracking-[-0.015em]">Start your conversation</p>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-white/42">
                    {activeConvo.isSupport
                      ? isAdmin
                        ? `Reply to ${activeConvo.name} as CLARA Support.`
                        : "Send a message to CLARA Support."
                      : `Send your first private message to ${activeConvo.name}.`}
                  </p>
                </div>
              </div>
            ) : (
              activeConvo.messages.map((message, index) => {
                const isMine = messageIsOutgoing(message, activeConvo);
                const groupPosition = messageGroupPosition(
                  activeConvo.messages,
                  index,
                  (candidate) => messageIsOutgoing(candidate, activeConvo)
                );
                const startsNewDay =
                  index === 0 || !sameMessageDay(activeConvo.messages[index - 1], message);
                const joinsPrevious =
                  groupPosition === "middle" || groupPosition === "last";
                const spacingClass = startsNewDay
                  ? index === 0
                    ? ""
                    : "mt-5"
                  : joinsPrevious
                    ? "mt-1"
                    : "mt-3";

                return (
                  <div key={message.id} className={spacingClass}>
                    {startsNewDay ? (
                      <div className="mb-4 flex items-center gap-3 py-1">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/[0.08]" />
                        <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-white/32 backdrop-blur-sm">
                          {formatMessageDayLabel(message.created_at)}
                        </span>
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/[0.08]" />
                      </div>
                    ) : null}
                    <InteractiveMessageBubble
                      message={message}
                      isMine={isMine}
                      groupPosition={groupPosition}
                      showReceipt={
                        isMine &&
                        String(lastOutgoingMessage?.id || "") === String(message.id)
                      }
                      onDeleted={handleMessageDeleted}
                      onInteractionChanged={handleInteractionChanged}
                    />
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        <footer className="relative shrink-0 border-t border-white/[0.08] bg-[#06111f]/97 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-18px_44px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <div className="flex-1 rounded-[25px] border border-white/[0.09] bg-white/[0.055] px-4 py-2 shadow-inner shadow-black/10 transition focus-within:border-[#5eead4]/25 focus-within:bg-white/[0.07] focus-within:ring-2 focus-within:ring-[#22c7b8]/[0.06]">
              <Input
                placeholder="Type a message..."
                value={newMsg}
                onChange={(event) => setNewMsg(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                disabled={sending}
                className="h-8 border-0 bg-transparent px-0 text-[14px] font-medium text-white placeholder:text-white/30 focus-visible:ring-0"
              />
            </div>
            <Button
              aria-label="Send message"
              onClick={handleSend}
              disabled={!newMsg.trim() || sending}
              className="h-12 w-12 shrink-0 rounded-full border border-[#67e8d5]/20 bg-gradient-to-br from-[#28d2c2] to-[#12b8ad] text-[#032f2c] shadow-[0_10px_24px_rgba(34,199,184,0.18)] transition hover:scale-[1.02] hover:from-[#36dccc] hover:to-[#19c2b6] disabled:border-white/[0.06] disabled:bg-none disabled:bg-white/[0.055] disabled:text-white/22 disabled:shadow-none"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#06111f] text-white">
      <header className="shrink-0 border-b border-white/[0.08] bg-[#06111f]/95 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/community")}
            className="flex h-10 shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 text-white/80"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-[11px] font-black">Community</span>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-black tracking-[-0.025em]">Messages</h1>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+28px)] pt-4">
        <div className="mx-auto w-full max-w-3xl space-y-5">
          <div className="flex h-12 items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.05] px-4">
            <Search className="h-4 w-4 text-white/38" />
            <Input
              placeholder="Search members"
              value={search}
              onFocus={() => setSearchActive(true)}
              onBlur={() => window.setTimeout(() => setSearchActive(false), 140)}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 border-0 bg-transparent px-0 text-sm font-semibold text-white placeholder:text-white/30 focus-visible:ring-0"
            />
          </div>

          {searchActive ? (
            <section className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.035]">
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
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04]"
                    >
                      <div className="relative">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#22c7b8]/20 bg-[#22c7b8]/10 text-xs font-black text-[#ccfbf1]">
                          {getMessageInitials(
                            person.display_name || person.full_name || person.email
                          )}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#06111f] bg-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <p className="min-w-0 truncate text-sm font-black">
                            {person.display_name || person.full_name || person.email}
                          </p>
                          <SupportTierBadge tier={person.support_tier} compact />
                        </div>
                        <p className="truncate text-[11px] font-semibold text-white/38">
                          {String(person.role).toLowerCase() === "admin"
                            ? "CLARA Admin"
                            : "Community Member"}
                        </p>
                      </div>
                      <span className="text-[11px] font-black text-[#99f6e4]">
                        Chat
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>
          ) : (
            <section>
              {filteredConvos.length === 0 ? (
                <div className="rounded-[22px] border border-white/10 bg-white/[0.035] px-4 py-7">
                  <EmptyState
                    icon={MessageSquare}
                    title="No messages yet"
                    description="Tap the search bar to find a community member."
                  />
                </div>
              ) : (
                <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.035]">
                  <div className="divide-y divide-white/[0.07]">
                    {filteredConvos.map((conversation) => {
                      const last = conversation.lastMessage;
                      const isFromMe = messageIsOutgoing(last, conversation);
                      const showClaraIdentity = conversation.isSupport && !isAdmin;

                      return (
                        <button
                          type="button"
                          key={conversation.id}
                          onClick={() => openConversation(conversation.id)}
                          className="flex w-full items-center gap-3 px-3 py-3.5 text-left hover:bg-white/[0.04]"
                        >
                          {showClaraIdentity ? (
                            <ClaraSupportAvatar size="h-12 w-12" />
                          ) : (
                            <div className="relative">
                              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#22c7b8]/20 bg-[#22c7b8]/10 text-sm font-black text-[#ccfbf1]">
                                {getMessageInitials(conversation.name)}
                              </div>
                              {!conversation.isSupport ? (
                                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#06111f] bg-emerald-400" />
                              ) : null}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="min-w-0 flex-1 truncate text-sm font-black">
                                {showClaraIdentity ? "CLARA" : conversation.name}
                              </p>
                              {conversation.isSupport && isAdmin ? (
                                <span className="shrink-0 rounded-full border border-[#ffd84a]/25 bg-[#ffd84a]/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-[#ffe477]">
                                  Support
                                </span>
                              ) : (
                                <SupportTierBadge tier={conversation.supportTier} compact />
                              )}
                              <span className="shrink-0 text-[10px] text-white/35">
                                {formatChatTime(last?.created_at)}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <p className="min-w-0 flex-1 truncate text-xs font-semibold text-white/45">
                                {isFromMe ? "You: " : ""}
                                {last?.content || "Start chatting"}
                              </p>
                              {conversation.unreadCount > 0 ? (
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#22c7b8] px-1.5 text-[10px] font-black text-[#042f2e]">
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
          )}
        </div>
      </main>
    </div>
  );
}
