"use client";
import type Pusher from "pusher-js";
import { PUSHER_KEY, PUSHER_CLUSTER } from "@/lib/env";

let instance: Pusher | null = null;
let creating: Promise<Pusher | null> | null = null;

/** Lazily create one shared Pusher client. Returns null if no key configured.
 *  Creation is serialized via a module Promise so concurrent callers (the page
 *  and the launcher) can't each spin up a client and orphan a WebSocket. */
export function getPusher(): Promise<Pusher | null> {
  if (!PUSHER_KEY) {
    if (typeof console !== "undefined") {
      console.warn(
        "[chat] NEXT_PUBLIC_PUSHER_KEY is empty in this build — realtime is OFF " +
          "(you can send, but messages won't stream in).",
      );
    }
    return Promise.resolve(null);
  }
  if (instance) return Promise.resolve(instance);
  if (creating) return creating;
  creating = import("pusher-js").then(({ default: PusherClient }) => {
    instance = new PusherClient(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      forceTLS: true,
      authorizer: (channel) => ({
        authorize: (socketId, callback) => {
          fetch("/api/chat/pusher-auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }),
          })
            .then(async (r) => {
              if (!r.ok) throw new Error(`auth ${r.status}`);
              return r.json();
            })
            .then((data) => callback(null, data))
            .catch((err) => callback(err as Error, null));
        },
      }),
    });
    return instance;
  });
  return creating;
}

/** Tear down the shared Pusher client and clear the singleton so the next
 *  getPusher() builds a fresh connection. Call on logout to prevent the prior
 *  user's authorized channels from leaking into the next session. */
export function resetPusher(): void {
  if (instance) {
    try {
      instance.disconnect();
    } catch {
      // ignore — disconnecting a torn-down socket can throw; we just want it gone
    }
    instance = null;
  }
  creating = null;
}
