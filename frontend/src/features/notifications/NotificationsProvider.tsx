import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../../auth/useAuth";
import { useWebSocket } from "../../hooks/useWebSocket";
import { api, getToken } from "../../lib/apiClient";
import { wsUrl } from "../../lib/config";
import type { ListResult, Notification, UnreadResult } from "../../lib/types";
import { NotificationsContext, type NotificationsState } from "./useNotifications";

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [available, setAvailable] = useState(true);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const loadingMoreRef = useRef(false);

  const refreshUnread = useCallback(async () => {
    const unread = await api.get<UnreadResult>("/api/bff/notifications/unread-count");
    setUnreadTotal(unread.state === "ok" ? (unread.count?.total ?? 0) : 0);
  }, []);

  // Recarrega a PRIMEIRA página (e volta o cursor ao início). Usado na entrada e ao
  // reconectar o WebSocket, para recuperar o que foi perdido durante a queda.
  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const list = await api.get<ListResult>("/api/bff/notifications");
      if (list.state === "unavailable" || !list.page) {
        setAvailable(false);
        return;
      }
      setAvailable(true);
      setItems(list.page.items);
      setNextCursor(list.page.next_cursor);
      list.page.items.forEach((n) => seen.current.add(n.id));
      await refreshUnread();
    } catch {
      setAvailable(false);
    }
  }, [user, refreshUnread]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const list = await api.get<ListResult>(
        `/api/bff/notifications?cursor=${encodeURIComponent(nextCursor)}`,
      );
      if (list.state === "unavailable" || !list.page) return; // mantém o que já temos
      const page = list.page;
      setItems((prev) => {
        const known = new Set(prev.map((n) => n.id));
        return [...prev, ...page.items.filter((n) => !known.has(n.id))];
      });
      page.items.forEach((n) => seen.current.add(n.id));
      setNextCursor(page.next_cursor);
    } catch {
      /* falha de rede: o botão continua disponível para tentar de novo */
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [nextCursor]);

  // Marcar como lida atualiza a lista localmente: recarregar só a página 1 descartaria
  // as páginas que o usuário já carregou com "Carregar mais".
  const markRead = useCallback(
    async (id: string) => {
      await api.patch(`/api/bff/notifications/${id}`);
      const now = new Date().toISOString();
      setItems((prev) => prev.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: now } : n)));
      await refreshUnread();
    },
    [refreshUnread],
  );

  const markAllRead = useCallback(async () => {
    await api.post("/api/bff/notifications/read-all");
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await refreshUnread();
  }, [refreshUnread]);

  const dismissToast = useCallback(
    (id: string) => setToasts((t) => t.filter((n) => n.id !== id)),
    [],
  );

  const onMessage = useCallback((data: unknown) => {
    const msg = data as { event?: string; data?: Notification };
    if (msg.event === "notification.new" && msg.data) {
      const n = msg.data;
      if (seen.current.has(n.id)) return;
      seen.current.add(n.id);
      setItems((prev) => [n, ...prev]);
      setUnreadTotal((c) => c + 1);
      setToasts((prev) => [n, ...prev].slice(0, 4));
    }
  }, []);

  const socketUrl = user && getToken() ? wsUrl(`/ws/notifications?token=${getToken()}`) : null;
  const status = useWebSocket(socketUrl, { onMessage, onReconnect: refresh, enabled: !!user });

  useEffect(() => {
    if (user) void refresh();
  }, [user, refresh]);

  const value = useMemo<NotificationsState>(
    () => ({
      items,
      unreadTotal,
      available,
      wsOpen: status === "open",
      toasts,
      refresh,
      markRead,
      markAllRead,
      dismissToast,
      hasMore: nextCursor !== null,
      loadingMore,
      loadMore,
    }),
    [
      items,
      unreadTotal,
      available,
      status,
      toasts,
      refresh,
      markRead,
      markAllRead,
      dismissToast,
      nextCursor,
      loadingMore,
      loadMore,
    ],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
