import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAdminAuthStore } from '../store/adminAuthStore';
import { useNotificationStore } from '../store/notificationStore';
import { getMyNotifications } from '../api/activityLogsApi';

export const useSignalR = () => {
    const { token, user } = useAdminAuthStore();
    const clearAuth = useAdminAuthStore((state) => state.clearAuth);
    const addNotification = useNotificationStore((state) => state.addNotification);
    const setNotifications = useNotificationStore((state) => state.setNotifications);
    const clearNotifications = useNotificationStore((state) => state.clearNotifications);
    const connectionRef = useRef(null);
    const logoutTimeoutRef = useRef(null);
    const [forcedLogoutNotice, setForcedLogoutNotice] = useState(null);
    const role = user?.role || "";
    const canUseNotificationCenter = role === "Admin" || role === "Manager";

    useEffect(() => {
        if (!token) {
            if (connectionRef.current) {
                connectionRef.current.stop();
                connectionRef.current = null;
            }
            clearNotifications();
            if (logoutTimeoutRef.current) {
                clearTimeout(logoutTimeoutRef.current);
                logoutTimeoutRef.current = null;
            }
            return;
        }

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5279/api';
        const hubUrl = apiUrl.replace(/\/api\/?$/, '') + '/notificationHub';

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl, {
                accessTokenFactory: () => token
            })
            .withAutomaticReconnect()
            .build();

        connectionRef.current = connection;

        const fetchHistory = async () => {
            try {
                const res = await getMyNotifications();
                if (res.data) setNotifications(res.data);
            } catch (err) {
                console.error('Failed to fetch notification history: ', err);
            }
        };

        const startConnection = async () => {
            try {
                if (connection.state === signalR.HubConnectionState.Disconnected) {
                    await connection.start();
                    console.log('Connected to NotificationHub');
                }
            } catch (err) {
                if (err.name === 'AbortError' || (err.message && err.message.includes('stopped during negotiation'))) {
                    console.log('SignalR connection aborted (expected during unmount or React StrictMode re-render).');
                    return;
                }
                console.error('SignalR Connection Error: ', err);
                setTimeout(startConnection, 5000);
            }
        };

        if (canUseNotificationCenter) {
            fetchHistory();
        }
        startConnection();

        connection.on('ReceiveNotification', (notification) => {
            if (!canUseNotificationCenter) return;
            addNotification({
                id: notification.id || Date.now().toString(),
                message: notification.message || notification,
                createdAt: notification.createdAt || new Date().toISOString(),
                isRead: false,
                ...notification
            });
        });

        connection.on('ForceLogout', (payload) => {
            const message = payload?.message || 'Quyen cua ban da thay doi. Vui long dang nhap lai.';
            setForcedLogoutNotice({
                id: Date.now(),
                message
            });

            if (logoutTimeoutRef.current) {
                clearTimeout(logoutTimeoutRef.current);
            }

            logoutTimeoutRef.current = setTimeout(() => {
                clearNotifications();
                clearAuth();
                window.location.href = '/login';
            }, 1400);
        });

        return () => {
            connection.off('ReceiveNotification');
            connection.off('ForceLogout');
            connection.stop();
            if (connectionRef.current === connection) {
                connectionRef.current = null;
            }
        };
    }, [token, canUseNotificationCenter, addNotification, setNotifications, clearNotifications, clearAuth]);

    return {
        connection: connectionRef.current,
        forcedLogoutNotice
    };
};
