"use client";
import type Pusher from "pusher-js";
import { PUSHER_KEY, PUSHER_CLUSTER } from "@/lib/env";

let instance: Pusher | null = null;

/** Lazily create one shared Pusher client. Returns null if no key configured. */
export async function getPusher(): Promise<Pusher | null> {
  if (!PUSHER_KEY) return null;
  if (instance) return instance;
  const { default: PusherClient } = await import("pusher-js");
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
}
