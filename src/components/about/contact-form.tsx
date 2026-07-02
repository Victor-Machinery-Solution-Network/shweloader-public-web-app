"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { PUBLIC_API_BASE_URL } from "@/lib/env";

/**
 * "Talk to the Shwe Loader team" form (About page, Get-in-touch section).
 * Posts straight from the browser to the worker's POST /feedback — the CORS
 * allowlist admits the site origins, and a direct call keeps the visitor's
 * real IP for the worker's per-IP rate limiting (see PUBLIC_API_BASE_URL).
 *
 * The feedback API stores a single `message`, so the contact fields are
 * folded into it as labeled lines — they show up readably in the admin
 * portal's Feedback list with no API/schema change.
 */
type Status = "idle" | "sending" | "sent";

export function ContactForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setError(null);

    // A reply needs somewhere to go — ask for at least one contact channel.
    if (!phone.trim() && !email.trim()) {
      setError("Please add a phone number or an email so we can reply.");
      return;
    }

    const body = [
      `Name: ${name.trim()}`,
      phone.trim() ? `Phone: ${phone.trim()}` : null,
      email.trim() ? `Email: ${email.trim()}` : null,
      "",
      message.trim(),
    ]
      .filter((l): l is string => l !== null)
      .join("\n");

    setStatus("sending");
    try {
      const res = await fetch(`${PUBLIC_API_BASE_URL}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: body, platform: "web" }),
      });
      if (res.status === 429) {
        setError("Too many messages just now — please try again in a minute.");
        setStatus("idle");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setStatus("sent");
    } catch {
      setError("Couldn't send your message. Please try again.");
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return (
      <div className="ax-gt-card ax-gt-done" role="status">
        <span className="ax-gt-done-mark" aria-hidden="true">
          ✓
        </span>
        <h3 className="ax-gt-done-title">Message sent</h3>
        <p className="ax-gt-done-sub">
          Thanks{name.trim() ? `, ${name.trim()}` : ""} — the Shwe Loader team
          will get back to you within one business day.
        </p>
      </div>
    );
  }

  return (
    <form className="ax-gt-card" onSubmit={onSubmit} noValidate={false}>
      <div className="ax-gt-row">
        <label className="ax-gt-field">
          <span className="ax-gt-label">Name</span>
          <input
            className="ax-gt-input"
            type="text"
            name="name"
            autoComplete="name"
            placeholder="Your name"
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="ax-gt-field">
          <span className="ax-gt-label">Phone</span>
          <input
            className="ax-gt-input"
            type="tel"
            name="phone"
            autoComplete="tel"
            placeholder="09 xxx xxx xxx"
            maxLength={40}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
      </div>

      <label className="ax-gt-field">
        <span className="ax-gt-label">Email</span>
        <input
          className="ax-gt-input"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@company.com"
          maxLength={200}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label className="ax-gt-field">
        <span className="ax-gt-label">How can we help?</span>
        <textarea
          className="ax-gt-input ax-gt-textarea"
          name="message"
          placeholder="Tell us what you're looking to buy, sell, or rent…"
          required
          maxLength={1500}
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>

      {error ? <p className="ax-gt-error">{error}</p> : null}

      <button className="ax-gt-send" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send message"}
        <ArrowRight size={18} strokeWidth={2.25} aria-hidden="true" />
      </button>
    </form>
  );
}
