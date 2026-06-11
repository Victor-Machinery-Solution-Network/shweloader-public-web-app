"use client";

import { useCallback, useEffect, useState } from "react";
import { VAPID_PUBLIC_KEY, WEB_PUSH_ENABLED } from "@/lib/env";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a URL-safe base64 VAPID public key to the Uint8Array that
 * pushManager.subscribe() requires as applicationServerKey.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** True only when both SW and PushManager are available in this browser. */
function isPushCapable(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface WebPushState {
  /** True if the browser supports push notifications and the feature flag is on. */
  supported: boolean;
  /** Current Notification.permission value (or "default" when unsupported). */
  permission: NotificationPermission;
  /** True when the user has an active push subscription on this device. */
  subscribed: boolean;
  /**
   * Ask for permission, subscribe, and register with the server.
   * MUST be called from a user-gesture handler (button click, etc.) — the
   * browser will block Notification.requestPermission() otherwise.
   */
  enable: () => Promise<void>;
  /** Unsubscribe this device from push and notify the server. */
  disable: () => Promise<void>;
}

/** Inert fallback returned when the feature is disabled or unsupported. */
const INERT: WebPushState = {
  supported: false,
  permission: "default",
  subscribed: false,
  enable: async () => {},
  disable: async () => {},
};

export function useWebPush(): WebPushState {
  // Bail out immediately when the feature flag is off OR the runtime lacks SW/Push support.
  if (!WEB_PUSH_ENABLED || !isPushCapable()) return INERT;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useWebPushInner();
}

/**
 * Inner hook — only reached when WEB_PUSH_ENABLED is true and the browser
 * supports service workers + PushManager. Splitting into a separate function
 * avoids conditional hook calls at the outer level while keeping the fast-path
 * return above unconditionally before any state initialisation.
 */
function useWebPushInner(): WebPushState {
  const [permission, setPermission] = useState<NotificationPermission>(
    () => (typeof Notification !== "undefined" ? Notification.permission : "default"),
  );
  const [subscribed, setSubscribed] = useState(false);

  // On mount: check whether a subscription already exists so the UI reflects
  // reality without requiring the user to go through the enable flow again.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        if (!reg || cancelled) return;
        const existing = await reg.pushManager.getSubscription();
        if (!cancelled) setSubscribed(!!existing);
      } catch {
        // SW not yet registered or push unavailable — fine, subscribed stays false.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    try {
      // 1. Register (or retrieve) the service worker.
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

      // 2. Request notification permission — MUST be from a user gesture.
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      // 3. Subscribe via PushManager.
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // 4. Register the subscription with the server (best-effort).
      await fetch("/api/chat/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      }).catch(() => {});

      setSubscribed(true);
    } catch {
      // Never throw to the render layer — the UI will just show as unsubscribed.
    }
  }, []);

  const disable = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (!reg) return;
      const subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        setSubscribed(false);
        return;
      }

      // Notify the server first (best-effort) so it stops sending pushes.
      await fetch("/api/chat/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      }).catch(() => {});

      await subscription.unsubscribe();
      setSubscribed(false);
    } catch {
      // Never throw to the render layer.
    }
  }, []);

  return { supported: true, permission, subscribed, enable, disable };
}
