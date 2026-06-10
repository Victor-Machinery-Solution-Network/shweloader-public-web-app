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

      setSessions: (s) => set({ sessions: s }),
      setActive: (id) => set({ activeSessionId: id }),
      setMessages: (sessionId, msgs) =>
        set((st) => ({ messages: { ...st.messages, [sessionId]: msgs } })),

      addMessage: (sessionId, m) => {
        const list = get().messages[sessionId] ?? [];
        const key = messageKey(m);
        if (list.some((x) => messageKey(x) === key)) return false;
        set((st) => ({
          messages: { ...st.messages, [sessionId]: [...list, m] },
        }));
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
        set((st) => ({
          messages: {
            ...st.messages,
            [sessionId]: (st.messages[sessionId] ?? []).map((x) =>
              x.id === tempId
                ? { ...x, id: `s${serverId}`, serverId, status: "sent" as SendStatus }
                : x,
            ),
          },
        })),

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
