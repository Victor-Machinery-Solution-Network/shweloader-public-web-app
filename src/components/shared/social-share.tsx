import { Facebook, MessageCircle, Send, Twitter } from "lucide-react";

/**
 * Direct social share links (Facebook, Viber, Telegram, X) as plain anchors —
 * no third-party share-plugin scripts. Server-rendered so crawlers/audits see
 * them; complements the native-share button (ProductActions/BlogShare), which
 * stays the better UX on mobile. Viber first-class because it dominates
 * Myanmar messaging.
 */
export function SocialShare({ url, title }: { url: string; title: string }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      icon: Facebook,
    },
    {
      name: "Viber",
      href: `viber://forward?text=${t}%20${u}`,
      icon: MessageCircle,
    },
    {
      name: "Telegram",
      href: `https://t.me/share/url?url=${u}&text=${t}`,
      icon: Send,
    },
    {
      name: "X",
      href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
      icon: Twitter,
    },
  ];

  return (
    <div className="sshare">
      {links.map(({ name, href, icon: Icon }) => (
        <a
          key={name}
          className="sshare-link"
          href={href}
          target="_blank"
          rel="noopener nofollow"
          aria-label={`Share on ${name}`}
          title={`Share on ${name}`}
        >
          <Icon className="icon-sm" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
