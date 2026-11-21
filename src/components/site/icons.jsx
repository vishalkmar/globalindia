/**
 * Social / brand marks drawn in the same 1.5 px stroke style as lucide, so they sit with the rest of
 * the icon set (Design.md §5: one icon language, no coloured logos). Decorative: labels come from the link.
 */
function Svg({ children, className = "size-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {children}
    </svg>
  );
}

export const LinkedInIcon = (p) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M8 10.5V17M8 7.25v.01M12 17v-6.5M12 13.5c0-1.9 1.2-3 2.6-3s2.4 1 2.4 2.9V17" />
  </Svg>
);

export const FacebookIcon = (p) => (
  <Svg {...p}>
    <path d="M14.5 8H16V4.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2V11H7v3.6h2.5V21h3.4v-6.4h2.6l.4-3.6h-3V9c0-.8.3-1 1.6-1Z" />
  </Svg>
);

export const InstagramIcon = (p) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <path d="M17.25 6.75v.01" />
  </Svg>
);

export const YouTubeIcon = (p) => (
  <Svg {...p}>
    <path d="M2.5 12c0-2.6.2-4.3.5-5.2.3-.8.9-1.3 1.7-1.5C6.2 5 9 4.9 12 4.9s5.8.1 7.3.4c.8.2 1.4.7 1.7 1.5.3.9.5 2.6.5 5.2s-.2 4.3-.5 5.2c-.3.8-.9 1.3-1.7 1.5-1.5.3-4.3.4-7.3.4s-5.8-.1-7.3-.4c-.8-.2-1.4-.7-1.7-1.5-.3-.9-.5-2.6-.5-5.2Z" />
    <path d="m10 9 5 3-5 3V9Z" />
  </Svg>
);

export const XIcon = (p) => (
  <Svg {...p}>
    <path d="M4 4l16 16M20 4 4 20" />
  </Svg>
);

/** Generic marketplace mark for IndiaMART / TradeIndia profiles. */
export const MarketplaceIcon = (p) => (
  <Svg {...p}>
    <path d="M4 9.5 5.5 4h13L20 9.5" />
    <path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" />
    <path d="M5.5 12.5V20h13v-7.5M10 20v-4.5h4V20" />
  </Svg>
);

export const WhatsAppIcon = (p) => (
  <Svg {...p}>
    <path d="M3.5 20.5 4.8 16A8.5 8.5 0 1 1 8 19.3l-4.5 1.2Z" />
    <path d="M9 8.5c.2-.5.6-.6 1-.5l.9 2-.6.9c.5 1 1.3 1.8 2.3 2.3l.9-.6 2 .9c.1.4 0 .8-.5 1-1.6.8-6.2-2.9-6-6Z" />
  </Svg>
);

export const SOCIAL = [
  { key: "linkedin", label: "LinkedIn", Icon: LinkedInIcon },
  { key: "facebook", label: "Facebook", Icon: FacebookIcon },
  { key: "instagram", label: "Instagram", Icon: InstagramIcon },
  { key: "youtube", label: "YouTube", Icon: YouTubeIcon },
  { key: "x", label: "X", Icon: XIcon },
  { key: "indiamart", label: "IndiaMART", Icon: MarketplaceIcon },
  { key: "tradeindia", label: "TradeIndia", Icon: MarketplaceIcon },
];
