import { createContext, useContext } from "react";
import type { Notification } from "../../lib/types";

export interface NotificationsState {
  items: Notification[];
  unreadTotal: number;
  available: boolean;
  wsOpen: boolean;
  toasts: Notification[];
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismissToast: (id: string) => void;
}

export const NotificationsContext = createContext<NotificationsState | null>(null);

export function useNotifications(): NotificationsState {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications requer NotificationsProvider");
  return ctx;
}
