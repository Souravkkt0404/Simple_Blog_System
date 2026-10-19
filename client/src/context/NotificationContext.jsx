import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);
const SOCKET_ORIGIN = import.meta.env.VITE_API_ORIGIN || undefined; // undefined = same origin
const TOAST_MS = 4500;

export function NotificationProvider({ children }) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismissToast = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    (message, type = 'info') => {
      const id = ++nextId.current;
      setToasts((list) => [...list, { id, message, type }]);
      setTimeout(() => dismissToast(id), TOAST_MS);
    },
    [dismissToast],
  );

  // Reconnect whenever the access token changes so the server puts us in the right rooms.
  useEffect(() => {
    const socket = io(SOCKET_ORIGIN, { auth: token ? { token } : {}, withCredentials: true });

    socket.on('notification', (n) => {
      setNotifications((list) => [{ ...n, id: ++nextId.current, read: false }, ...list].slice(0, 30));
      toast(n.message, 'info');
    });
    socket.on('post:created', (p) => {
      window.dispatchEvent(new CustomEvent('blog:post-created', { detail: p }));
    });

    return () => socket.disconnect();
  }, [token, toast]);

  useEffect(() => {
    if (!token) setNotifications([]);
  }, [token]);

  const markAllRead = useCallback(() => setNotifications((list) => list.map((n) => ({ ...n, read: true }))), []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      markAllRead,
      toast,
      toasts,
      dismissToast,
    }),
    [notifications, markAllRead, toast, toasts, dismissToast],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationProvider>');
  return ctx;
}
