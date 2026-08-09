import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function strokeIcon(props: IconProps) {
  return {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export function IconChain(props: IconProps) {
  return (
    <svg {...strokeIcon(props)}>
      <path d="M9 12h6" />
      <path d="M12 12h0" />
      <path d="M14.5 5.5h.5a4.5 4.5 0 0 1 0 9H13" />
      <path d="M9.5 18.5H9a4.5 4.5 0 0 1 0-9h1.5" />
    </svg>
  );
}

export function IconExternal(props: IconProps) {
  return (
    <svg {...strokeIcon(props)}>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

export function IconShield(props: IconProps) {
  return (
    <svg {...strokeIcon(props)}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <svg {...strokeIcon(props)}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...strokeIcon(props)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function IconSparkles(props: IconProps) {
  return (
    <svg {...strokeIcon(props)}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </svg>
  );
}

export function IconBadgeCheck(props: IconProps) {
  return (
    <svg {...strokeIcon(props)}>
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function IconTrophy(props: IconProps) {
  return (
    <svg {...strokeIcon(props)}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

export function IconCoins(props: IconProps) {
  return (
    <svg {...strokeIcon(props)}>
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <path d="M7 6h1v4" />
      <path d="m16.71 13.88.7.71-2.82 2.82" />
    </svg>
  );
}

export function IconDocument(props: IconProps) {
  return (
    <svg {...strokeIcon(props)}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...strokeIcon(props)}>
      <path d="M5 12h14M12 5v14" />
    </svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <svg {...strokeIcon(props)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...strokeIcon(props)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export function IconTrendingDown(props: IconProps) {
  return (
    <svg {...strokeIcon(props)}>
      <path d="M22 17H13.5a3.5 3.5 0 0 1-3-1.75l-1-1.5A3.5 3.5 0 0 0 6.5 12H2" />
      <path d="M22 17v-5M22 17h-5" />
    </svg>
  );
}
