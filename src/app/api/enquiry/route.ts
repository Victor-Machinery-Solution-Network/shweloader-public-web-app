import { NextResponse } from "next/server";
import { submitFeedback } from "@/lib/api/feedback";
import { getToken } from "@/lib/auth/session";

/**
 * Enquiry submission. Server-side so the worker is never called from the
 * browser. Phase 1 has no dedicated public enquiry endpoint, so the message is
 * recorded via the feedback channel with the listing reference; swap to a real
 * enquiry endpoint when one ships.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    listingId?: number;
    title?: string;
    message?: string;
  };

  if (!body.message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: "Sign in to send an enquiry" }, {
      status: 401,
    });
  }

  const composed = `Enquiry — Listing #${body.listingId ?? "?"}${
    body.title ? ` (${body.title})` : ""
  }\n\n${body.message}`;

  try {
    await submitFeedback({ message: composed }, token);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to send enquiry" },
      { status: 502 },
    );
  }
}
