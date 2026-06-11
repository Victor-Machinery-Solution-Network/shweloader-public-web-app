"use client";
/**
 * Lazy Firebase Realtime Database accessor — client-only.
 *
 * Dynamically imports firebase/* only when PRESENCE_ENABLED is true so the
 * bundle stays clean on every page when the feature is not configured.
 * Uses a module-level singleton so the app is initialised at most once.
 *
 * Anonymous auth satisfies RTDB security rules that require authentication
 * (mirroring the mobile app which is always authenticated).
 */

import type { Database } from "firebase/database";
import { FIREBASE, PRESENCE_ENABLED } from "./env";

let dbPromise: Promise<Database | null> | null = null;

export function getRtdb(): Promise<Database | null> {
  if (!PRESENCE_ENABLED) return Promise.resolve(null);

  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        const { initializeApp, getApps, getApp } = await import("firebase/app");
        const { getAuth, signInAnonymously } = await import("firebase/auth");
        const { getDatabase } = await import("firebase/database");

        const app =
          getApps().length > 0
            ? getApp()
            : initializeApp(FIREBASE);

        const auth = getAuth(app);
        // Sign in anonymously so RTDB rules that require auth are satisfied.
        // If already signed in (currentUser exists), skip the call to avoid
        // a redundant network round-trip.
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }

        return getDatabase(app, FIREBASE.databaseURL);
      } catch (err) {
        // Defensive: never crash the page if Firebase is misconfigured.
        if (process.env.NODE_ENV !== "production") {
          console.warn("[shweloader] Firebase init failed:", err);
        }
        return null;
      }
    })();
  }

  return dbPromise;
}
// NOTE: do NOT statically re-export anything from "firebase/database" here — that
// would pull the SDK into every importer's bundle (the launcher → every page),
// defeating the lazy guard. Consumers import what they need from within their
// own dynamic import("firebase/database"), as use-presence.ts does.
