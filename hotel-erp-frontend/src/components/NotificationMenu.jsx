import React, { useEffect, useRef, useState } from 'react';
import { Badge } from 'antd';
import { BellOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useNotificationStore } from '../store/notificationStore';
import { markNotificationAsRead, markAllNotificationsAsRead } from '../api/activityLogsApi';

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} giờ trước`;
    return new Date(dateStr).toLocaleDateString('vi-VN');
}

export default function NotificationMenu() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
    const [open, setOpen] = useState(false);
    const panelRef = useRef(null);
    const btnRef = useRef(null);

    // Close on outside click
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
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
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
            {/* Bell button */}
            <button
                ref={btnRef}
                onClick={() => setOpen((v) => !v)}
                className="p-2 border-none bg-transparent cursor-pointer rounded-full flex items-center justify-center outline-none transition-colors hover:bg-black/5"
            >
                <Badge count={unreadCount} size="small" offset={[-2, 6]}>
                    <BellOutlined className="text-xl text-gray-500" />
                </Badge>
            </button>

            {/* Notification panel */}
            {open && (
                <>
                    {/* Mobile Overlay */}
                    <div 
                        className="fixed inset-0 z-[1040] sm:hidden bg-black/5 backdrop-blur-[2px]" 
                        onClick={() => setOpen(false)} 
                    />

                    <div
                        ref={panelRef}
                        className="
                            fixed left-4 right-4 top-[72px] w-auto max-h-[80vh]
                            sm:absolute sm:top-[calc(100%+12px)] sm:right-[-4px] sm:left-auto sm:w-[380px] sm:max-h-[500px]
                            bg-white rounded-2xl
                            shadow-[0_20px_60px_rgba(17,24,39,0.14),0_4px_16px_rgba(17,24,39,0.08)]
                            border border-gray-200
                            flex flex-col overflow-hidden z-[1050]
                            animate-[nf-panel-enter_0.2s_cubic-bezier(0.16,1,0.3,1)_forwards]
                        "
                    >
                        <style>{`
                            @keyframes nf-panel-enter {
                                from { opacity: 0; transform: translateY(-10px) scale(0.96); }
                                to   { opacity: 1; transform: translateY(0) scale(1); }
                            }
                            .nf-item:hover { background: #f9fafb !important; }
                            .nf-item-unread:hover { background: #ecfdf5 !important; }
                            .nf-scroll::-webkit-scrollbar { width: 4px; }
                            .nf-scroll::-webkit-scrollbar-track { background: transparent; }
                            .nf-scroll::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
                        `}</style>

                        {/* Header */}
                        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[15px] font-bold text-gray-900">Thông báo</span>
                                {unreadCount > 0 && (
                                    <span className="bg-emerald-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5 leading-relaxed">
                                        {unreadCount}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllAsRead}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-transparent border-none cursor-pointer px-2 py-1.5 rounded-lg transition-colors hover:bg-emerald-50"
                                    >
                                        <CheckOutlined className="text-[11px]" />
                                        Đã đọc
                                    </button>
                                )}
                                <button
                                    onClick={() => setOpen(false)}
                                    className="flex items-center justify-center w-7 h-7 bg-transparent border-none cursor-pointer text-gray-400 rounded-lg transition-colors hover:bg-gray-100 hover:text-gray-700"
                                >
                                    <CloseOutlined className="text-[12px]" />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="overflow-y-auto flex-1 nf-scroll">
                            {notifications.length === 0 ? (
                                <div className="py-10 px-6 text-center text-gray-400">
                                    <BellOutlined className="text-3xl mb-3 opacity-30" />
                                    <p className="m-0 text-[13px]">Chưa có thông báo nào</p>
                                </div>
                            ) : (
                                notifications.map((item) => {
                                    const isUnread = !item.isRead;
                                    return (
                                        <div
                                            key={item.id}
                                            className={`nf-item flex items-start gap-3 p-3.5 cursor-pointer border-b border-gray-50 transition-colors ${
                                                isUnread ? 'nf-item-unread bg-emerald-50/50' : 'bg-transparent'
                                            }`}
                                            onClick={() => handleItemClick(item)}
                                        >
                                            {/* Icon avatar */}
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[15px] ${
                                                isUnread ? 'bg-emerald-100' : 'bg-gray-100'
                                            }`}>
                                                🔔
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`m-0 mb-1 text-[13px] leading-relaxed break-words ${
                                                    isUnread ? 'text-gray-900 font-semibold' : 'text-gray-600 font-normal'
                                                }`}>
                                                    {item.message || item.action}
                                                </p>
                                                <p className="m-0 text-[11px] text-gray-400">
                                                    {timeAgo(item.createdAt || item.timestamp)}
                                                </p>
                                            </div>

                                            {/* Unread dot */}
                                            {isUnread && (
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
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
