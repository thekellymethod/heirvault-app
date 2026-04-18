"use client";

import { useId } from "react";

/**
 * Inline SVG illustrations for the public landing page.
 * Complements paper / ink / gold brand palette without raster dependencies.
 */

export function HeroRegistryIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="hr-grad-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C8942D" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#E1B75A" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="hr-grad-frost" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <rect x="24" y="28" width="352" height="264" rx="20" stroke="rgba(255,255,255,0.18)" strokeWidth="1" fill="url(#hr-grad-frost)" />
      <rect x="44" y="52" width="120" height="8" rx="4" fill="rgba(255,255,255,0.35)" />
      <rect x="44" y="72" width="200" height="6" rx="3" fill="rgba(255,255,255,0.12)" />
      <rect x="44" y="86" width="160" height="6" rx="3" fill="rgba(255,255,255,0.1)" />
      <rect x="40" y="108" width="4" height="148" rx="2" fill="url(#hr-grad-gold)" />
      <rect x="56" y="116" width="300" height="36" rx="8" stroke="rgba(255,255,255,0.12)" strokeWidth="1" fill="rgba(11,18,32,0.35)" />
      <rect x="72" y="128" width="88" height="4" rx="2" fill="rgba(255,255,255,0.25)" />
      <rect x="72" y="138" width="140" height="4" rx="2" fill="rgba(255,255,255,0.12)" />
      <rect x="56" y="164" width="300" height="36" rx="8" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="rgba(11,18,32,0.25)" />
      <rect x="72" y="176" width="72" height="4" rx="2" fill="rgba(255,255,255,0.2)" />
      <rect x="72" y="186" width="120" height="4" rx="2" fill="rgba(255,255,255,0.1)" />
      <rect x="56" y="212" width="300" height="36" rx="8" stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="rgba(11,18,32,0.2)" />
      <rect x="72" y="224" width="100" height="4" rx="2" fill="rgba(255,255,255,0.15)" />
      <circle cx="318" cy="74" r="28" stroke="rgba(225,183,90,0.45)" strokeWidth="1.5" fill="rgba(200,148,45,0.12)" />
      <path
        d="M318 62v8M318 86v8M310 74h8M326 74h8"
        stroke="rgba(253,230,138,0.5)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect x="268" y="248" width="108" height="44" rx="12" stroke="rgba(225,183,90,0.35)" strokeWidth="1" fill="rgba(17,28,51,0.5)" />
      <path d="M298 266c0-6 8-6 8 0v4h-8v-4z" fill="rgba(253,230,138,0.55)" />
      <rect x="292" y="274" width="12" height="8" rx="1" fill="rgba(253,230,138,0.35)" />
    </svg>
  );
}

export function CornerOrnaments({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 320 200" fill="none" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <circle cx="280" cy="40" r="120" fill="url(#co-g)" opacity="0.5" />
      <circle cx="40" cy="180" r="90" fill="url(#co-n)" opacity="0.4" />
      <defs>
        <radialGradient id="co-g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(280 40) rotate(90) scale(120)">
          <stop stopColor="#C8942D" stopOpacity="0.2" />
          <stop offset="1" stopColor="#C8942D" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="co-n" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(40 180) rotate(90) scale(90)">
          <stop stopColor="#0B1220" stopOpacity="0.12" />
          <stop offset="1" stopColor="#0B1220" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function WorkflowStripGraphic({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 960 120"
      fill="none"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d="M0 60 Q120 20 240 60 T480 60 T720 60 T960 60"
        stroke="url(#ws-stroke)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.35"
      />
      <circle cx="120" cy="60" r="6" fill="#C8942D" fillOpacity="0.35" />
      <circle cx="480" cy="60" r="6" fill="#0B1220" fillOpacity="0.15" />
      <circle cx="840" cy="60" r="6" fill="#C8942D" fillOpacity="0.25" />
      <defs>
        <linearGradient id="ws-stroke" x1="0" y1="0" x2="960" y2="0">
          <stop stopColor="#C8942D" stopOpacity="0.4" />
          <stop offset="0.5" stopColor="#0B1220" stopOpacity="0.15" />
          <stop offset="1" stopColor="#C8942D" stopOpacity="0.3" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function GridPaperPattern({ className = "" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const patternId = `grid-paper-${uid}`;
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <pattern id={patternId} width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0H0V32" fill="none" stroke="#0B1220" strokeOpacity="0.04" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

export function DocumentStackGraphic({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 160" fill="none" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="48" width="140" height="92" rx="10" fill="#fff" stroke="#D9E2EE" strokeWidth="1" />
      <rect x="32" y="36" width="140" height="92" rx="10" fill="#FBFAF7" stroke="#E1B75A" strokeOpacity="0.35" strokeWidth="1" />
      <rect x="44" y="24" width="140" height="92" rx="10" fill="#fff" stroke="#D9E2EE" strokeWidth="1" />
      <rect x="58" y="40" width="72" height="5" rx="2" fill="#0B1220" fillOpacity="0.12" />
      <rect x="58" y="52" width="112" height="4" rx="2" fill="#52637A" fillOpacity="0.2" />
      <rect x="58" y="62" width="96" height="4" rx="2" fill="#52637A" fillOpacity="0.15" />
      <rect x="58" y="88" width="112" height="36" rx="6" fill="#F6F2EA" stroke="#E1B75A" strokeOpacity="0.25" />
      <path d="M72 104h84M72 114h60" stroke="#52637A" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ShieldRingGraphic({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 160" fill="none" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="80" r="76" stroke="#C8942D" strokeOpacity="0.2" strokeWidth="1" />
      <circle cx="80" cy="80" r="58" stroke="#0B1220" strokeOpacity="0.08" strokeWidth="1" />
      <path
        d="M80 44l28 14v32c0 18-12 34-28 38-16-4-28-20-28-38V58l28-14z"
        fill="#fff"
        stroke="#D9E2EE"
        strokeWidth="1"
      />
      <path d="M68 78l10 10 18-22" stroke="#A97C1F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Subtle grid for dark marketing backgrounds (e.g. homepage `/`). */
export function DarkGridPattern({ className = "" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const patternId = `grid-dark-${uid}`;
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <pattern id={patternId} width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="#F5F7FB" strokeOpacity="0.055" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

/** Workflow curve tuned for dark navy backgrounds (homepage). */
export function WorkflowStripOnDark({
  className = "",
  animated = false,
}: {
  className?: string;
  /** Subtle moving dash + node pulse (disabled when user prefers reduced motion via CSS). */
  animated?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const gid = `wsd-g-${uid}`;
  return (
    <svg
      className={className}
      viewBox="0 0 960 120"
      fill="none"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="960" y2="0">
          <stop stopColor="#D4A017" stopOpacity="0.22" />
          <stop offset="0.45" stopColor="#F5F7FB" stopOpacity="0.1" />
          <stop offset="1" stopColor="#D4A017" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <path
        className={animated ? "hv-workflow-dash" : undefined}
        d="M0 60 Q120 22 240 60 T480 60 T720 60 T960 60"
        stroke={`url(#${gid})`}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <circle
        className={animated ? "hv-workflow-dot" : undefined}
        cx="120"
        cy="60"
        r="4"
        fill="#D4A017"
        fillOpacity="0.35"
      />
      <circle
        className={animated ? "hv-workflow-dot hv-workflow-dot--b" : undefined}
        cx="480"
        cy="60"
        r="3.5"
        fill="#F5F7FB"
        fillOpacity="0.2"
      />
      <circle
        className={animated ? "hv-workflow-dot hv-workflow-dot--c" : undefined}
        cx="840"
        cy="60"
        r="4"
        fill="#D4A017"
        fillOpacity="0.28"
      />
    </svg>
  );
}

/** Shield / trust mark for dark UI (frosted, no white fill block). */
export function ShieldRingOnDark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 160" fill="none" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="80" r="76" stroke="rgba(212,160,23,0.25)" strokeWidth="1" />
      <circle cx="80" cy="80" r="58" stroke="rgba(245,247,251,0.08)" strokeWidth="1" />
      <path
        d="M80 44l28 14v32c0 18-12 34-28 38-16-4-28-20-28-38V58l28-14z"
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(245,247,251,0.14)"
        strokeWidth="1"
      />
      <path d="M68 78l10 10 18-22" stroke="#D4A017" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
