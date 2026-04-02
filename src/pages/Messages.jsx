import { useState, useEffect } from "react";
import { Send, MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import useUserRole from "../hooks/useUserRole";

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

    Promise.all([
      fetch(`/api/messages?email=${user.email}`).then(r => r.json()),
      fetch(`/api/users`).then(r => r.json()),
    ])
      .then(([msgs, u]) => {
        setMessages(msgs || []);

        const isAdmin = (user.role || "").toLowerCase() === "admin";

        const filtered = isAdmin
          ? u.filter(x => x.email !== user.email)
          : u.filter(x => x.email !== user.email && (x.role || "").toLowerCase() === "admin");

        setUsers(filtered);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.email, isPaid]);

  if (!isPaid) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <EmptyState
          icon={MessageSquare}
          title="Messages are for paid members"
        />
      </div>
    );
  }

  // group convos
  const convos = {};
  messages.forEach(m => {
    const other =
      m.sender_email === user.email
        ? m.recipient_email
        : m.sender_email;

    if (!convos[other]) {
      convos[other] = {
        email: other,
        name: m.sender_email === user.email ? m.recipient_name : m.sender_name,
        messages: [],
      };
    }

    convos[other].messages.push(m);
  });

  Object.values(convos).forEach(c =>
    c.messages.sort(
      (a, b) => new Date(a.created_date) - new Date(b.created_date)
    )
  );

  const convoList = Object.values(convos);
  const activeConvo = selectedConvo ? convos[selectedConvo] : null;

  const handleSend = async () => {
    if (!newMsg.trim()) return;

    const recipient = selectedConvo || newRecipient;
    if (!recipient) return;

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender_email: user.email,
        sender_name: user.full_name,
        recipient_email: recipient,
        content: newMsg.trim(),
      }),
    });

    const msg = await res.json();

    setMessages([msg, ...messages]);
    setNewMsg("");

    if (!selectedConvo) setSelectedConvo(recipient);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // conversation screen
  if (activeConvo) {
    return (
      <div className="flex flex-col h-full">

        <div className="p-4 border-b flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => setSelectedConvo(null)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <p className="font-medium text-sm">{activeConvo.name}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeConvo.messages.map(m => (
            <div key={m.id} className={`flex ${m.sender_email === user.email ? "justify-end" : "justify-start"}`}>
              <div className={`px-4 py-2 rounded-xl text-sm ${
                m.sender_email === user.email
                  ? "bg-primary text-white"
                  : "bg-muted"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t flex gap-2">
          <Input
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            placeholder="Type..."
            onKeyDown={e => e.key === "Enter" && handleSend()}
          />
          <Button onClick={handleSend}>
            <Send className="w-4 h-4" />
          </Button>
        </div>

      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">

      <PageHeader title="Messages" />

      {/* new message */}
      <div className="border p-4 rounded-xl mb-4">

        <select
          className="w-full mb-2 border rounded p-2"
          value={newRecipient}
          onChange={e => setNewRecipient(e.target.value)}
        >
          <option value="">Select user</option>
          {users.map(u => (
            <option key={u.id} value={u.email}>
              {u.full_name || u.email}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <Input
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
          />
          <Button onClick={handleSend}>
            <Send className="w-4 h-4" />
          </Button>
        </div>

      </div>

      {convoList.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No messages" />
      ) : (
        <div className="space-y-2">
          {convoList.map(c => (
            <button
              key={c.email}
              onClick={() => setSelectedConvo(c.email)}
              className="w-full p-3 border rounded-xl text-left"
            >
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-muted-foreground">
                {c.messages[c.messages.length - 1]?.content}
              </p>
            </button>
          ))}
        </div>
      )}

    </div>
  );
}