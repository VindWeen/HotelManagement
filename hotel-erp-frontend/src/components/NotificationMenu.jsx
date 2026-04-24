import React, { useEffect, useRef, useState } from "react";
import { Badge } from "antd";
import { BellOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { useNotificationStore } from "../store/notificationStore";
import { markNotificationAsRead, markAllNotificationsAsRead } from "../api/activityLogsApi";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

export default function NotificationMenu() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleItemClick = async (item) => {
    if (!item.isRead) {
      markNotificationAsRead(item.id).catch(console.error);
      markAsRead(item.id);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      markAllAsRead();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="admin-notification-trigger"
      >
        <Badge count={unreadCount} size="small">
          <BellOutlined className="admin-notification-bell text-xl" />
        </Badge>
      </button>

      {open && (
        <>
          <div
            className="admin-notification-overlay fixed inset-0 z-[1040] sm:hidden backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />

          <div
            ref={panelRef}
            className="
              admin-notification-panel
              fixed left-4 right-4 top-[72px] w-auto max-h-[80vh]
              sm:absolute sm:top-[calc(100%+12px)] sm:right-[-4px] sm:left-auto sm:w-[380px] sm:max-h-[500px]
              rounded-2xl flex flex-col overflow-hidden z-[1050]
              animate-[admin-fade-panel_0.2s_cubic-bezier(0.16,1,0.3,1)_forwards]
            "
          >
            <div className="flex justify-between items-center px-4 py-3 border-b shrink-0" style={{ borderColor: "var(--a-border)" }}>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold" style={{ color: "var(--a-text)" }}>
                  Thông báo
                </span>
                {unreadCount > 0 && (
                  <span className="admin-notification-chip text-[10px] font-bold rounded-full px-2 py-0.5 leading-relaxed">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="admin-notification-mark-read flex items-center gap-1.5 text-xs font-semibold bg-transparent border-none cursor-pointer px-2 py-1.5 rounded-lg transition-colors"
                    style={{ color: "var(--a-primary)" }}
                  >
                    <CheckOutlined className="text-[11px]" />
                    Đã đọc
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="admin-notification-close flex items-center justify-center w-7 h-7 bg-transparent border-none cursor-pointer rounded-lg transition-colors"
                  style={{ color: "var(--a-text-soft)" }}
                >
                  <CloseOutlined className="text-[12px]" />
                </button>
              </div>
            </div>

            <div className="admin-notification-scroll overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="py-10 px-6 text-center admin-notification-muted">
                  <BellOutlined className="text-3xl mb-3 opacity-30" style={{ color: "currentColor", display: "inline-flex" }} />
                  <p className="m-0 text-[13px]">Chưa có thông báo nào</p>
                </div>
              ) : (
                notifications.map((item) => {
                  const isUnread = !item.isRead;
                  return (
                    <div
                      key={item.id}
                      className={`admin-notification-item flex items-start gap-3 p-3.5 cursor-pointer transition-colors ${isUnread ? "unread" : ""}`}
                      onClick={() => handleItemClick(item)}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[15px]"
                        style={{
                          background: isUnread ? "var(--a-primary-soft)" : "var(--a-surface-raised)",
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--a-primary)" }}>
                          notifications
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className="m-0 mb-1 text-[13px] leading-relaxed break-words"
                          style={{
                            color: isUnread ? "var(--a-text)" : "var(--a-text-muted)",
                            fontWeight: isUnread ? 700 : 500,
                          }}
                        >
                          {item.message || item.action}
                        </p>
                        <p className="m-0 text-[11px] admin-notification-muted">
                          {timeAgo(item.createdAt || item.timestamp)}
                        </p>
                      </div>

                      {isUnread && (
                        <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: "var(--a-primary)" }} />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
