"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bell,
  CheckCheck,
  Megaphone,
  X,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import {
  getUserNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
  type AppNotificationItem,
} from "./actions";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const data = await getUserNotificationsAction();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      // Quiet fail if not yet authenticated or network blip
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationReadAction(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const handleMarkAllAsRead = async () => {
    try {
      setIsLoading(true);
      await markAllNotificationsReadAction();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date() }))
      );
      setUnreadCount(0);
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const diffMs = Date.now() - new Date(date).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return `${diffDay}d ago`;
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 text-[#4B5563] hover:text-[#1C1C1E] hover:bg-[#F4F4F5] rounded-xl transition cursor-pointer flex items-center justify-center"
        aria-label="View notifications"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-[#FF453A] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs animate-in zoom-in-50 duration-150">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#E4E4E7] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 px-4 border-b border-[#E4E4E7] flex items-center justify-between bg-[#FAFAFA]">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-[#1C1C1E]">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-xs font-bold text-[#2A5CAA] bg-[#E8EEF7] px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={isLoading}
                className="text-xs font-semibold text-[#2A5CAA] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[#E4E4E7]/60">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-[#6B7280]">
                <Bell className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
                <p className="text-xs font-semibold">No notifications</p>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                  Platform announcements will appear here
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (isUnread) handleMarkAsRead(n.id);
                    }}
                    className={`p-3.5 px-4 transition cursor-pointer hover:bg-[#F9FAFB] ${
                      isUnread ? "bg-[#F0F5FF]/40" : "bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          n.type === "PLATFORM_BROADCAST"
                            ? "bg-[#EBF2FC] text-[#2A5CAA]"
                            : "bg-[#F4F4F5] text-[#4B5563]"
                        }`}
                      >
                        {n.type === "PLATFORM_BROADCAST" ? (
                          <Megaphone className="w-4 h-4" />
                        ) : (
                          <Bell className="w-4 h-4" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs block truncate ${
                              isUnread
                                ? "font-bold text-[#1C1C1E]"
                                : "font-semibold text-[#4B5563]"
                            }`}
                          >
                            {n.title}
                          </span>
                          <span className="text-[10px] text-[#9CA3AF] shrink-0">
                            {formatTimeAgo(n.createdAt)}
                          </span>
                        </div>

                        <p className="text-xs text-[#6B7280] mt-1 whitespace-pre-wrap leading-relaxed line-clamp-3">
                          {n.body}
                        </p>

                        {n.link && (
                          <a
                            href={n.link}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2A5CAA] mt-1.5 hover:underline"
                          >
                            <span>Open details</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-[#2A5CAA] shrink-0 mt-1.5" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
