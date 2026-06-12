"use client";
import { create } from "zustand";

/**
 * Tiny in-memory store for the header notifications badge. Holds the current
 * unread count, seeded once per sign-in from GET /api/notifications and then
 * bumped live by the `private-user-{id}` Pusher channel
 * (`use-notifications-realtime.ts`). Deliberately NOT persisted — the count is
 * cheap to refetch on load, and a stale persisted number would be worse than a
 * brief 0 while the initial fetch resolves.
 */
interface NotificationsState {
  unreadCount: number;
  /** Replace the count (e.g. seed from the server). Clamped to >= 0. */
  setUnread: (n: number) => void;
  /** Increment by one on a live `new-notification` / `new-promotion` event. */
  bumpUnread: () => void;
  /** Clear the count (e.g. on sign-out). */
  reset: () => void;
}

export const useNotificationsStore = create<NotificationsState>()((set) => ({
  unreadCount: 0,
  setUnread: (n) => set({ unreadCount: Math.max(0, Math.floor(n) || 0) }),
  bumpUnread: () => set((st) => ({ unreadCount: st.unreadCount + 1 })),
  reset: () => set({ unreadCount: 0 }),
}));
