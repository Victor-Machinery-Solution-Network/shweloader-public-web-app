"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ChatMessage, ChatSession, SendStatus } from "./types";
import { messageKey } from "./mappers";

interface ChatState {
  sessions: ChatSession[];
  messages: Record<number, ChatMessage[]>; // sessionId -> ordered messages
  activeSessionId: number | null;
  /** admin last-read ISO per session (for "Seen"). */
  adminReadAt: Record<number, string | null>;

  setSessions: (s: ChatSession[]) => void;
  setActive: (id: number | null) => void;
  setMessages: (sessionId: number, msgs: ChatMessage[]) => void;
  /** Returns false if a message with the same key already exists (deduped). */
  addMessage: (sessionId: number, m: ChatMessage) => boolean;
  addOptimistic: (sessionId: number, m: ChatMessage) => void;
  confirmOptimistic: (sessionId: number, tempId: string, serverId: number) => void;
  setStatus: (sessionId: number, tempId: string, status: SendStatus) => void;
  setUnread: (sessionId: number, n: number) => void;
  bumpUnread: (sessionId: number) => void;
  setAdminReadAt: (sessionId: number, iso: string) => void;
  setSessionStatus: (sessionId: number, status: ChatSession["status"]) => void;
  totalUnread: () => number;
}

let tempCounter = 0;
export const nextTempId = (): string => `temp-${++tempCounter}`;

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      messages: {},
      activeSessionId: null,
      adminReadAt: {},

      setSessions: (s) =>
        // Seed the "Seen" tick state from each session's admin_last_read_at so
        // read receipts are correct on first load (not only after a live event).
        set((st) => ({
          sessions: s,
          adminReadAt: {
            ...st.adminReadAt,
            ...Object.fromEntries(
              s
                .filter((x) => x.adminLastReadAt != null)
                .map((x) => [x.id, x.adminLastReadAt]),
            ),
          },
        })),
      setActive: (id) => set({ activeSessionId: id }),
      setMessages: (sessionId, msgs) =>
        set((st) => ({ messages: { ...st.messages, [sessionId]: msgs } })),

      addMessage: (sessionId, m) => {
        const key = messageKey(m);
        if ((get().messages[sessionId] ?? []).some((x) => messageKey(x) === key)) {
          return false;
        }
        // Re-check + append against the COMMITTED state inside the updater, so
        // two events arriving before a flush can't both append off a stale list.
        set((st) => {
          const fresh = st.messages[sessionId] ?? [];
          if (fresh.some((x) => messageKey(x) === key)) return st;
          return { messages: { ...st.messages, [sessionId]: [...fresh, m] } };
        });
        return true;
      },

      addOptimistic: (sessionId, m) =>
        set((st) => ({
          messages: {
            ...st.messages,
            [sessionId]: [...(st.messages[sessionId] ?? []), m],
          },
        })),

      confirmOptimistic: (sessionId, tempId, serverId) =>
        set((st) => {
          const list = st.messages[sessionId] ?? [];
          const serverKey = `s${serverId}`;
          // If the Pusher echo already added the server message (it can beat the
          // HTTP response), just drop the optimistic copy instead of renaming it
          // into a duplicate.
          const next = list.some((x) => x.id === serverKey)
            ? list.filter((x) => x.id !== tempId)
            : list.map((x) =>
                x.id === tempId
                  ? { ...x, id: serverKey, serverId, status: "sent" as SendStatus }
                  : x,
              );
          return { messages: { ...st.messages, [sessionId]: next } };
        }),

      setStatus: (sessionId, tempId, status) =>
        set((st) => ({
          messages: {
            ...st.messages,
            [sessionId]: (st.messages[sessionId] ?? []).map((x) =>
              x.id === tempId ? { ...x, status } : x,
            ),
          },
        })),

      setUnread: (sessionId, n) =>
        set((st) => ({
          sessions: st.sessions.map((s) =>
            s.id === sessionId ? { ...s, unreadUserCount: n } : s,
          ),
        })),

      bumpUnread: (sessionId) =>
        set((st) => ({
          sessions: st.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, unreadUserCount: s.unreadUserCount + 1 }
              : s,
          ),
        })),

      setAdminReadAt: (sessionId, iso) =>
        set((st) => ({ adminReadAt: { ...st.adminReadAt, [sessionId]: iso } })),

      setSessionStatus: (sessionId, status) =>
        set((st) => ({
          sessions: st.sessions.map((s) =>
            s.id === sessionId ? { ...s, status } : s,
          ),
        })),

      totalUnread: () =>
        get().sessions.reduce((n, s) => n + (s.unreadUserCount || 0), 0),
    }),
    {
      name: "sl-chat",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Persist only what's useful offline; messages rehydrate from the server.
      partialize: (st) => ({
        sessions: st.sessions,
        messages: st.messages,
        adminReadAt: st.adminReadAt,
        activeSessionId: st.activeSessionId,
      }),
    },
  ),
);
