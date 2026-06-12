export function TypingDots() {
  // Visual only — the "Support is typing" announcement lives in Thread's
  // persistent live region, so this is hidden from assistive tech to avoid
  // double-announcing.
  return (
    <div className="chat-typing" aria-hidden="true">
      <span /><span /><span />
    </div>
  );
}
