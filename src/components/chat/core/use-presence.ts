"use client";
/**
 * usePresence — Firebase RTDB presence hook (Phase 3 web chat).
 *
 * Mirrors the mobile app's usePresence hook:
 *   - Reads  /admin-presence  → supportOnline
 *   - Writes /user-presence/{userId} with serverTimestamp + onDisconnect remove
 *   - Re-writes every 30 s while the document is visible
 *   - Pauses/removes on document visibilitychange → hidden
 *
 * Fully inert (returns { supportOnline: false }) when:
 *   - PRESENCE_ENABLED is false (Firebase config absent)  ← current state
 *   - active is false (panel closed / user not signed in)
 *   - userId is null
 */

import { useEffect, useRef, useState } from "react";
import { PRESENCE_ENABLED } from "@/lib/env";
import { getRtdb } from "@/lib/firebase";

const HEARTBEAT_INTERVAL_MS = 30_000;

export function usePresence(
  userId: number | string | null | undefined,
  active: boolean,
): { supportOnline: boolean } {
  const [supportOnline, setSupportOnline] = useState(false);

  // Keep a stable ref for the heartbeat timer so cleanup is deterministic.
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Refs for Firebase objects so they're accessible in cleanup without being
  // listed as useEffect deps (Firebase objects are stable after init).
  const unsubscribeAdminRef = useRef<(() => void) | null>(null);
  const onDisconnectRef = useRef<{ cancel: () => Promise<void> } | null>(null);
  const userPresenceRefRef = useRef<import("firebase/database").DatabaseReference | null>(null);

  useEffect(() => {
    // Guard: no-op when feature is disabled or conditions unmet.
    // Reset happens in the cleanup path (returned below) when conditions flip off.
    if (!PRESENCE_ENABLED || !active || !userId) {
      return () => {
        setSupportOnline(false);
      };
    }

    let cancelled = false;

    async function setup() {
      const rtdb = await getRtdb();
      if (!rtdb || cancelled) return;

      const {
        ref,
        onValue,
        off,
        set,
        onDisconnect: makeOnDisconnect,
        serverTimestamp: fbServerTimestamp,
      } = await import("firebase/database");

      // 1. Listen to admin presence.
      const adminRef = ref(rtdb, "admin-presence");
      const adminListener = onValue(adminRef, (snapshot) => {
        if (!cancelled) {
          setSupportOnline(snapshot.exists() && snapshot.hasChildren());
        }
      });
      unsubscribeAdminRef.current = () => off(adminRef, "value", adminListener);

      // 2. Write user presence.
      const userRef = ref(rtdb, `user-presence/${userId}`);
      userPresenceRefRef.current = userRef;

      const presence = { lastActiveAt: fbServerTimestamp() };

      async function writePresence() {
        if (!cancelled && userPresenceRefRef.current) {
          try {
            await set(userPresenceRefRef.current, {
              lastActiveAt: fbServerTimestamp(),
            });
          } catch {
            /* non-fatal */
          }
        }
      }

      try {
        await set(userRef, presence);
        // Register onDisconnect removal so Firebase cleans up if the tab closes.
        const od = makeOnDisconnect(userRef);
        await od.remove();
        onDisconnectRef.current = od;
      } catch {
        /* non-fatal — presence write failure should not break chat */
      }

      // 3. Heartbeat every 30 s (keeps lastActiveAt fresh).
      heartbeatRef.current = setInterval(writePresence, HEARTBEAT_INTERVAL_MS);

      // 4. Pause/remove on visibility hidden.
      async function onVisibilityChange() {
        if (document.visibilityState === "hidden") {
          if (heartbeatRef.current != null) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
          }
          if (userPresenceRefRef.current) {
            try {
              const { remove } = await import("firebase/database");
              await remove(userPresenceRefRef.current);
            } catch {
              /* non-fatal */
            }
          }
        } else {
          // Visible again — re-write and resume heartbeat.
          await writePresence();
          if (heartbeatRef.current == null) {
            heartbeatRef.current = setInterval(writePresence, HEARTBEAT_INTERVAL_MS);
          }
        }
      }
      document.addEventListener("visibilitychange", onVisibilityChange);

      // Return cleanup for this branch.
      return () => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      };
    }

    let visibilityCleanup: (() => void) | undefined;
    const setupPromise = setup().then((cleanup) => {
      visibilityCleanup = cleanup;
    });

    return () => {
      cancelled = true;

      // Tear down admin listener.
      if (unsubscribeAdminRef.current) {
        unsubscribeAdminRef.current();
        unsubscribeAdminRef.current = null;
      }

      // Stop heartbeat.
      if (heartbeatRef.current != null) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }

      // Remove user presence and cancel onDisconnect handler asynchronously.
      const userRef = userPresenceRefRef.current;
      userPresenceRefRef.current = null;
      const od = onDisconnectRef.current;
      onDisconnectRef.current = null;

      void setupPromise.then(async () => {
        try {
          if (od) await od.cancel();
          if (userRef) {
            const { remove } = await import("firebase/database");
            await remove(userRef);
          }
        } catch {
          /* non-fatal */
        }
      });

      if (visibilityCleanup) visibilityCleanup();
      setSupportOnline(false);
    };
  // Re-run only when the conditions that gate Firebase setup change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [PRESENCE_ENABLED, active, userId]);

  return { supportOnline };
}
