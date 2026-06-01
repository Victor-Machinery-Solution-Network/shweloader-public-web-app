import { Headset } from "lucide-react";

/**
 * Presentational message-group renderer for the support chat thread.
 * Consecutive messages from the same author are grouped; "me" (sent) bubbles
 * are gold and right-aligned, "agent" (received) bubbles are grey and
 * left-aligned with a tucked avatar. Class names mirror the design prototype.
 */
export interface ChatMessage {
  /** "me" = current user, "agent" = support. */
  from: "me" | "agent";
  name?: string;
  text?: string;
  /** Data URL or remote URL for an image attachment. */
  image?: string;
  time?: string;
  day?: string;
  status?: string;
}

export interface DayBlock {
  kind: "day";
  label: string;
}

export interface GroupBlock {
  kind: "group";
  from: "me" | "agent";
  name?: string;
  items: ChatMessage[];
  time?: string;
  status?: string;
}

export type ChatBlock = DayBlock | GroupBlock;

/** Collapse a flat message list into day separators + author groups. */
export function buildBlocks(msgs: ChatMessage[]): ChatBlock[] {
  const blocks: ChatBlock[] = [];
  let lastDay: string | null = null;
  let cur: GroupBlock | null = null;
  for (const m of msgs) {
    const day = m.day ?? "";
    if (day !== lastDay) {
      blocks.push({ kind: "day", label: day });
      lastDay = day;
      cur = null;
    }
    if (!cur || cur.from !== m.from) {
      cur = {
        kind: "group",
        from: m.from,
        name: m.name,
        items: [],
        time: m.time,
        status: m.status,
      };
      blocks.push(cur);
    }
    cur.items.push(m);
    cur.time = m.time;
    if (m.status) cur.status = m.status;
  }
  return blocks;
}

export function ChatBubble({ block }: { block: ChatBlock }) {
  if (block.kind === "day") {
    return (
      <div className="chat-day">
        <span>{block.label}</span>
      </div>
    );
  }

  if (block.from === "me") {
    return (
      <div className="cgrp cgrp-me">
        {block.items.map((m, j) =>
          m.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <a
              key={j}
              className="cbubble cbubble-img"
              href={m.image}
              target="_blank"
              rel="noopener noreferrer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.image} alt={m.name || "Attachment"} />
            </a>
          ) : (
            <div key={j} className="cbubble">
              {m.text}
            </div>
          ),
        )}
        <div className="cgrp-time">
          {block.time}
          {block.status && <span className="cgrp-status"> · {block.status}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="cgrp cgrp-agent">
      <div className="cgrp-row">
        <span className="cgrp-av" aria-hidden="true">
          <Headset />
        </span>
        <div className="cgrp-bubbles">
          {block.items.map((m, j) => (
            <div key={j} className="cbubble">
              {m.text}
            </div>
          ))}
        </div>
      </div>
      <div className="cgrp-time">{block.time}</div>
    </div>
  );
}
