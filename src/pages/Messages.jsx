import { useState, useEffect } from "react";
import { Send, MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import useUserRole from "../hooks/useUserRole";

const MESSAGES_KEY = "clara_direct_messages";
const USERS_KEY = "clara_users";

const safeRead = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

const safeWrite = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export default function Messages() {
  const { user, isPaid } = useUserRole();
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [newMsg, setNewMsg] = useState("");
  const [newRecipient, setNewRecipient] = useState("");

  useEffect(() => {
    if (!user?.email || !isPaid) {
      setLoading(false);
      return;
    }

    const allMessages = safeRead(MESSAGES_KEY);
    const allUsers = safeRead(USERS_KEY);

    const relevantMessages = allMessages
      .filter(
        (m) =>
          m.sender_email === user.email || m.recipient_email === user.email
      )
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    const isCurrentUserAdmin = (user.role || "").toLowerCase() === "admin";

    const filteredUsers = isCurrentUserAdmin
      ? allUsers.filter((x) => x.email !== user.email)
      : allUsers.filter(
          (x) =>
            x.email !== user.email &&
            (x.role || "").toLowerCase() === "admin"
        );

    setMessages(relevantMessages);
    setUsers(filteredUsers);
    setLoading(false);
  }, [user?.email, isPaid, user?.role]);

  if (!isPaid) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <EmptyState
          icon={MessageSquare}
          title="Messages are for paid members"
          description="Upgrade to access private messaging."
        />
      </div>
    );
  }

  const convos = {};
  messages.forEach((m) => {
    const other =
      m.sender_email === user.email ? m.recipient_email : m.sender_email;
    const otherName =
      m.sender_email === user.email ? m.recipient_name : m.sender_name;

    if (!convos[other]) {
      convos[other] = {
        email: other,
        name: otherName || other,
        messages: [],
      };
    }

    convos[other].messages.push(m);
  });

  Object.values(convos).forEach((c) =>
    c.messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
  );

  const convoList = Object.values(convos);
  const activeConvo = selectedConvo ? convos[selectedConvo] : null;

  const refreshMessages = () => {
    const allMessages = safeRead(MESSAGES_KEY);
    const relevantMessages = allMessages
      .filter(
        (m) =>
          m.sender_email === user.email || m.recipient_email === user.email
      )
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    setMessages(relevantMessages);
  };

  const handleSend = async () => {
    if (!newMsg.trim() || !user?.email) return;

    const recipient = selectedConvo || newRecipient;
    if (!recipient) return;

    const recipientUser = users.find((u) => u.email === recipient);
    const convoId = [user.email, recipient].sort().join("_");

    const allMessages = safeRead(MESSAGES_KEY);

    const msg = {
      id: generateId(),
      sender_email: user.email,
      sender_name: user.full_name || user.email,
      recipient_email: recipient,
      recipient_name: recipientUser?.full_name || recipient,
      content: newMsg.trim(),
      is_read: false,
      conversation_id: convoId,
      created_date: new Date().toISOString(),
    };

    const updatedMessages = [msg, ...allMessages];
    safeWrite(MESSAGES_KEY, updatedMessages);

    refreshMessages();
    setNewMsg("");

    if (!selectedConvo) {
      setSelectedConvo(recipient);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (activeConvo) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedConvo(null)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-xs">
              {(activeConvo.name || "?")[0].toUpperCase()}
            </span>
          </div>

          <p className="font-medium text-sm">{activeConvo.name}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeConvo.messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${
                m.sender_email === user.email
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  m.sender_email === user.email
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm">{m.content}</p>
                <p
                  className={`text-[10px] mt-1 ${
                    m.sender_email === user.email
                      ? "text-primary-foreground/60"
                      : "text-muted-foreground"
                  }`}
                >
                  {new Date(m.created_date).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button onClick={handleSend} disabled={!newMsg.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <PageHeader title="Messages" subtitle="Private conversations" />

      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          NEW MESSAGE
        </p>

        <div className="flex gap-2 mb-2">
          <select
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            value={newRecipient}
            onChange={(e) => setNewRecipient(e.target.value)}
          >
            <option value="">Select recipient...</option>
            {users.map((u) => (
              <option key={u.id || u.email} value={u.email}>
                {u.full_name || u.email}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button
            onClick={handleSend}
            disabled={!newMsg.trim() || !newRecipient}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {convoList.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No messages yet"
          description="Start a conversation!"
        />
      ) : (
        <div className="space-y-2">
          {convoList.map((c) => (
            <button
              key={c.email}
              onClick={() => setSelectedConvo(c.email)}
              className="w-full text-left p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">
                    {(c.name || "?")[0].toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.messages[c.messages.length - 1]?.content}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}