import { useEffect, useRef, useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
} from "../../api/notifications.api";

const fmtRel = (iso: string): string => {
  try {
    const dt = new Date(iso).getTime();
    const diff = Math.max(0, Date.now() - dt) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(iso).toLocaleDateString();
  } catch {
    return "";
  }
};

const TYPE_DOT: Record<string, string> = {
  PROVIDER_UNAVAILABLE: "bg-rose-500",
  APPOINTMENT_CONFIRMED: "bg-emerald-500",
  APPOINTMENT_CANCELLED: "bg-slate-400",
  APPOINTMENT_RESCHEDULED: "bg-sky-500",
};

interface Props {
  /** Optional dark theme (admin sidebar uses slate-900). */
  variant?: "light" | "dark";
}

const NotificationsBell = ({ variant = "light" }: Props) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    try {
      const r = await listNotifications({ limit: 20 });
      setItems(r.data.data);
      setUnread(r.data.unreadCount);
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, []);

  /* Close on outside click */
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const handleClick = async (n: NotificationItem) => {
    setOpen(false);
    try {
      if (!n.is_read) {
        await markNotificationRead(n.id);
        await refresh();
      }
    } catch {
      /* ignore */
    }
    if (n.link) navigate(n.link);
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      await refresh();
    } catch {
      /* ignore */
    }
  };

  const isDark = variant === "dark";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative p-2 rounded-lg transition ${
          isDark
            ? "hover:bg-slate-800 text-slate-200"
            : "hover:bg-slate-100 text-slate-700"
        }`}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center px-1">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h4 className="font-semibold text-slate-900">Notifications</h4>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-blue-600 font-semibold hover:underline inline-flex items-center gap-1"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Bell
                  size={36}
                  className="mx-auto text-slate-300 mb-2"
                />
                <p className="text-sm text-slate-500">
                  No notifications yet
                </p>
              </div>
            ) : (
              items.map((n) => {
                const dot = TYPE_DOT[n.type] || "bg-blue-500";
                const isRead = !!n.is_read;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition ${
                      isRead ? "" : "bg-blue-50/40"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
                          isRead ? "bg-slate-300" : dot
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-sm ${
                              isRead
                                ? "font-medium text-slate-700"
                                : "font-semibold text-slate-900"
                            } truncate`}
                          >
                            {n.title}
                          </p>
                          {isRead && (
                            <Check
                              size={12}
                              className="text-slate-400 flex-shrink-0"
                            />
                          )}
                        </div>
                        {n.body && (
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                            {n.body}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400 mt-1">
                          {fmtRel(n.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsBell;
