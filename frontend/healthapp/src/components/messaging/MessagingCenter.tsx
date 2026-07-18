import { useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Plus,
  Send,
  X,
  Loader2,
  Pencil,
  Trash2,
  Check,
  Inbox,
  MessagesSquare,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  listThreads,
  getThreadMessages,
  sendMessage,
  createThread,
  editMessage,
  deleteMessage,
  type MessageThread,
  type ThreadDetail,
  type ChatMessage,
} from "../../api/messages.api";
import { getBookableProviders } from "../../api/patient.api";
import { getSocket } from "../../utils/socket";
import { getUserId } from "../../utils/auth";

interface Props {
  viewerRole: "PATIENT" | "PROVIDER";
}

const formatTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      } as any)
    : "";

/* Compact relative-style stamp for the thread list ("2:30 PM", "Yesterday", "Mar 4"). */
const shortStamp = (value: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yest.getDate() &&
    d.getMonth() === yest.getMonth() &&
    d.getFullYear() === yest.getFullYear();
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const initials = (name?: string | null) => {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
};

const MessagingCenter = ({ viewerRole }: Props) => {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [composeOpen, setComposeOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const myUserId = getUserId();
  const activeIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const otherPartyName = (t: MessageThread) =>
    viewerRole === "PROVIDER" ? t.patient_name : t.provider_name;

  const loadThreads = () => {
    listThreads()
      .then((res) => setThreads(res.data.data || []))
      .catch((err) =>
        toast.error(
          err?.response?.data?.message || "Failed to load conversations"
        )
      )
      .finally(() => setLoadingThreads(false));
  };

  useEffect(loadThreads, []);

  /* Merge an incoming/echoed message into the open conversation (dedup by id) */
  const upsertMessage = (incoming: ChatMessage) => {
    if (incoming.thread_id !== activeIdRef.current) return;
    const withMine = {
      ...incoming,
      mine: incoming.sender_id === myUserId,
    };
    setDetail((prev) => {
      if (!prev) return prev;
      const exists = prev.messages.some((m) => m.id === withMine.id);
      return {
        ...prev,
        messages: exists
          ? prev.messages.map((m) =>
              m.id === withMine.id ? withMine : m
            )
          : [...prev.messages, withMine],
      };
    });
  };

  const removeMessage = (threadId: string, messageId: string) => {
    if (threadId !== activeIdRef.current) return;
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            messages: prev.messages.filter((m) => m.id !== messageId),
          }
        : prev
    );
  };

  /* Real-time wiring */
  useEffect(() => {
    const socket = getSocket();

    const onNew = (p: { threadId: string; message: ChatMessage }) => {
      upsertMessage(p.message);
      loadThreads();
    };
    const onUpdated = (p: {
      threadId: string;
      message: ChatMessage;
    }) => upsertMessage(p.message);
    const onDeleted = (p: { threadId: string; messageId: string }) => {
      removeMessage(p.threadId, p.messageId);
      loadThreads();
    };
    const onThreadUpdated = () => loadThreads();

    socket.on("message:new", onNew);
    socket.on("message:updated", onUpdated);
    socket.on("message:deleted", onDeleted);
    socket.on("thread:updated", onThreadUpdated);

    return () => {
      socket.off("message:new", onNew);
      socket.off("message:updated", onUpdated);
      socket.off("message:deleted", onDeleted);
      socket.off("thread:updated", onThreadUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openThread = (id: string) => {
    setActiveId(id);
    setLoadingDetail(true);
    getThreadMessages(id)
      .then((res) => {
        setDetail(res.data.data);
        /* Clear the unread badge locally once opened */
        setThreads((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, unread_count: 0 } : t
          )
        );
      })
      .catch((err) =>
        toast.error(
          err?.response?.data?.message || "Failed to open conversation"
        )
      )
      .finally(() => setLoadingDetail(false));
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !activeId) return;
    try {
      setSending(true);
      const res = await sendMessage(activeId, draft.trim());
      setDraft("");
      const created = (res.data.data as any)?.message as
        | ChatMessage
        | undefined;
      if (created) upsertMessage(created);
      loadThreads();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to send message"
      );
    } finally {
      setSending(false);
    }
  };

  const startEdit = (m: ChatMessage) => {
    setEditingId(m.id);
    setEditDraft(m.body || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft("");
  };

  const saveEdit = async (messageId: string) => {
    if (!editDraft.trim()) return;
    try {
      const res = await editMessage(messageId, editDraft.trim());
      const updated = (res.data.data as any)?.message as
        | ChatMessage
        | undefined;
      if (updated) upsertMessage(updated);
      cancelEdit();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to edit message"
      );
    }
  };

  const handleDelete = async (m: ChatMessage) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await deleteMessage(m.id);
      removeMessage(m.thread_id, m.id);
      loadThreads();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to delete message"
      );
    }
  };

  return (
    <div className="space-y-3">
      {/* ── Page header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Messages</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Secure conversations with your{" "}
            {viewerRole === "PROVIDER" ? "patients" : "care team"}
          </p>
        </div>
        {viewerRole === "PATIENT" && (
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#0EA5E9,#0284C7)", boxShadow: "0 4px 12px rgba(14,165,233,0.25)" }}
          >
            <Plus size={14} /> New Message
          </button>
        )}
      </div>

      {/* ── Main chat frame ───────────────────────────────────── */}
      <div
        className="grid md:grid-cols-[30%_70%] overflow-hidden rounded-2xl"
        style={{
          border: "1px solid #E2E8F0",
          boxShadow: "0 2px 12px rgba(15,23,42,0.06)",
          height: "620px",
          minHeight: "500px",
          maxHeight: "700px",
        }}
      >
        {/* ── Thread list (30%) ───────────────────────────────── */}
        <div
          className="bg-white flex flex-col overflow-hidden"
          style={{ borderRight: "1px solid #E2E8F0" }}
        >
          {/* list header */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
            style={{ borderBottom: "1px solid #F1F5F9", backgroundColor: "#FAFAFA" }}
          >
            <Inbox size={14} className="text-sky-600" />
            <span className="text-xs font-semibold text-slate-700">Conversations</span>
            <span
              className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: "#EFF6FF", color: "#0284C7" }}
            >
              {threads.length}
            </span>
          </div>

          {/* list body */}
          <div className="flex-1 overflow-y-auto">
            {loadingThreads ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-2"
                  style={{ backgroundColor: "#EFF6FF", color: "#0284C7" }}
                >
                  <MessageSquare size={20} />
                </div>
                <p className="text-xs font-semibold text-slate-600">No conversations</p>
                <p className="text-[10.5px] text-slate-400 mt-0.5">
                  {viewerRole === "PATIENT"
                    ? "Start a message with your care team."
                    : "Patient messages will appear here."}
                </p>
              </div>
            ) : (
              <ul>
                {threads.map((t) => {
                  const name = otherPartyName(t) || "Conversation";
                  const active = activeId === t.id;
                  return (
                    <li key={t.id} style={{ borderBottom: "1px solid #F8FAFC" }}>
                      <button
                        type="button"
                        onClick={() => openThread(t.id)}
                        className="w-full text-left px-3 py-2.5 transition-colors flex items-center gap-2.5"
                        style={
                          active
                            ? { backgroundColor: "#EFF6FF", borderLeft: "3px solid #0284C7" }
                            : { borderLeft: "3px solid transparent" }
                        }
                      >
                        {/* avatar */}
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0"
                          style={{ background: "linear-gradient(135deg,#0EA5E9,#0284C7)" }}
                        >
                          {initials(name)}
                        </div>

                        {/* text */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p
                              className="text-[12.5px] truncate"
                              style={{
                                fontWeight: t.unread_count > 0 ? 700 : 500,
                                color: t.unread_count > 0 ? "#0F172A" : "#334155",
                              }}
                            >
                              {name}
                            </p>
                            <span className="shrink-0 text-[10px] text-slate-400">
                              {shortStamp(t.last_message_at)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <p
                              className="text-[11px] truncate"
                              style={{
                                color: t.unread_count > 0 ? "#475569" : "#94A3B8",
                                fontWeight: t.unread_count > 0 ? 500 : 400,
                              }}
                            >
                              {t.last_message || t.subject || "No messages yet"}
                            </p>
                            {t.unread_count > 0 && (
                              <span
                                className="shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold text-white"
                                style={{ backgroundColor: "#0284C7" }}
                              >
                                {t.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ── Chat window (70%) ───────────────────────────────── */}
        <div className="bg-white flex flex-col overflow-hidden">
          {!activeId ? (
            /* empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6" style={{ backgroundColor: "#FAFBFC" }}>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                style={{ backgroundColor: "#EFF6FF", color: "#0284C7" }}
              >
                <MessagesSquare size={26} />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {threads.length === 0 ? "No messages yet" : "Select a conversation"}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                {threads.length === 0
                  ? viewerRole === "PATIENT"
                    ? "Send a secure message to a doctor about your care."
                    : "Patient messages will show up here in real time."
                  : "Pick a chat from the list to view and reply."}
              </p>
              {viewerRole === "PATIENT" && threads.length === 0 && (
                <button
                  type="button"
                  onClick={() => setComposeOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg,#0EA5E9,#0284C7)" }}
                >
                  <Plus size={14} /> Start a conversation
                </button>
              )}
            </div>
          ) : loadingDetail ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-sky-500" />
            </div>
          ) : (
            <>
              {/* ── Chat header ──────────────────────────────── */}
              <div
                className="flex items-center gap-2.5 px-4 py-2.5 flex-shrink-0 bg-white"
                style={{ borderBottom: "1px solid #E2E8F0" }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#0EA5E9,#0284C7)" }}
                >
                  {initials(
                    viewerRole === "PROVIDER"
                      ? detail?.thread.patient_name
                      : detail?.thread.provider_name
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate leading-tight">
                    {viewerRole === "PROVIDER"
                      ? detail?.thread.patient_name
                      : detail?.thread.provider_name}
                  </p>
                  {detail?.thread.subject && (
                    <p className="text-[11px] text-slate-400 truncate leading-tight">
                      {detail.thread.subject}
                    </p>
                  )}
                </div>
                {/* online dot */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-slate-400">Secure</span>
                </div>
              </div>

              {/* ── Messages area ──────────────────────────── */}
              <div
                className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
                style={{ backgroundColor: "#F8FAFC" }}
              >
                {detail?.messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center mb-2"
                      style={{ backgroundColor: "#EFF6FF", color: "#0284C7" }}
                    >
                      <MessagesSquare size={20} />
                    </div>
                    <p className="text-xs font-semibold text-slate-600">No messages yet</p>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">
                      Type below to start the conversation.
                    </p>
                  </div>
                )}

                {detail?.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`group flex items-end gap-1.5 ${m.mine ? "justify-end" : "justify-start"}`}
                  >
                    {/* edit / delete controls (mine only) */}
                    {m.mine && editingId !== m.id && (
                      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => startEdit(m)}
                          className="p-1 rounded-md text-slate-400 hover:text-sky-600 hover:bg-white transition"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => handleDelete(m)}
                          className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-white transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}

                    {/* bubble */}
                    <div
                      className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                        m.mine
                          ? "text-white rounded-br-sm"
                          : "text-slate-800 rounded-bl-sm"
                      }`}
                      style={
                        m.mine
                          ? { background: "linear-gradient(135deg,#0EA5E9,#0284C7)" }
                          : { backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0" }
                      }
                    >
                      {editingId === m.id ? (
                        <div className="flex flex-col gap-1.5 min-w-[180px]">
                          <textarea
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            rows={2}
                            className="w-full rounded-lg px-2 py-1 text-sm text-slate-800 bg-white border border-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
                          />
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md text-[11px] font-medium bg-white/20 hover:bg-white/30 transition"
                            >
                              <X size={11} /> Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => saveEdit(m.id)}
                              disabled={!editDraft.trim()}
                              className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md text-[11px] font-medium bg-white text-sky-600 hover:bg-sky-50 disabled:opacity-50 transition"
                            >
                              <Check size={11} /> Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap break-words leading-snug">
                            {m.body}
                          </p>
                          <p
                            className="text-[10px] mt-1 leading-none"
                            style={{ color: m.mine ? "rgba(255,255,255,0.65)" : "#94A3B8" }}
                          >
                            {formatTime(m.sent_at)}
                            {m.edited_at && " · edited"}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* ── Input bar ───────────────────────────────── */}
              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 px-3 py-2.5 bg-white flex-shrink-0"
                style={{ borderTop: "1px solid #E2E8F0" }}
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e as any);
                    }
                  }}
                  placeholder="Type a message…"
                  className="flex-1 px-3.5 py-2 rounded-xl text-sm focus:outline-none transition"
                  style={{
                    border: "1px solid #E2E8F0",
                    backgroundColor: "#F8FAFC",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#0EA5E9";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(14,165,233,0.15)";
                    e.currentTarget.style.backgroundColor = "#FFFFFF";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E2E8F0";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.backgroundColor = "#F8FAFC";
                  }}
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-50 transition hover:opacity-90 flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#0EA5E9,#0284C7)" }}
                  title="Send (Enter)"
                >
                  {sending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {composeOpen && (
        <ComposeModal
          onClose={() => setComposeOpen(false)}
          onCreated={(id) => {
            setComposeOpen(false);
            loadThreads();
            openThread(id);
          }}
        />
      )}
    </div>
  );
};

interface ComposeProps {
  onClose: () => void;
  onCreated: (threadId: string) => void;
}

const ComposeModal = ({ onClose, onCreated }: ComposeProps) => {
  const [providers, setProviders] = useState<
    Array<{ id: string; name: string; specialty: string | null }>
  >([]);
  const [providerId, setProviderId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getBookableProviders()
      .then((res: any) => setProviders(res.data.data || []))
      .catch(() => toast.error("Failed to load providers"));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerId) {
      toast.error("Please choose a provider");
      return;
    }
    if (!body.trim()) {
      toast.error("Please enter a message");
      return;
    }
    try {
      setSaving(true);
      const res = await createThread({
        provider_id: providerId,
        subject: subject.trim() || undefined,
        body: body.trim(),
      });
      toast.success("Message sent");
      onCreated(res.data.data.id);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to start conversation"
      );
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ border: "1px solid #E2E8F0" }}
      >
        {/* modal header */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: "1px solid #F1F5F9" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#EFF6FF", color: "#0284C7" }}
            >
              <Plus size={14} />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">New Message</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* form */}
        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Provider <span className="text-red-500">*</span>
            </label>
            <select
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className={inputCls}
              style={{ border: "1px solid #E2E8F0" }}
            >
              <option value="">Select a provider…</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.specialty ? ` — ${p.specialty}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Question about my medication"
              className={inputCls}
              style={{ border: "1px solid #E2E8F0" }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="Type your message here…"
              className={inputCls}
              style={{ border: "1px solid #E2E8F0", resize: "none" }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#0EA5E9,#0284C7)" }}
            >
              {saving ? "Sending…" : "Send Message"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MessagingCenter;
