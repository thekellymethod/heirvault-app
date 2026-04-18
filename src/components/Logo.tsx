import React from "react";
import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  href?: string | null | undefined;
  variant?: "default" | "icon-only" | "text-only";
  colorMode?: "light" | "dark";
}

export function Logo({
  className = "",
  showTagline = false,
  size = "md",
  href,
  variant = "default",
  colorMode = "light",
}: LogoProps) {
  const sizeClasses = {
    xs: { width: 32, height: 32, textSize: "text-sm", tagline: "text-[10px]" },
    sm: { width: 40, height: 40, textSize: "text-lg", tagline: "text-[11px]" },
    md: { width: 56, height: 56, textSize: "text-2xl", tagline: "text-[11px]" },
    lg: { width: 80, height: 80, textSize: "text-3xl", tagline: "text-xs" },
    xl: { width: 120, height: 120, textSize: "text-4xl", tagline: "text-sm" },
  } as const;

  const dimensions = sizeClasses[size];
  const isHorizontal = className.includes("flex-row");

  const palette =
    colorMode === "dark"
      ? {
          heir: "#0B1220",
          vault: "#C8942D",
          tagline: "#52637A",
          shadow: "0 1px 2px rgba(0,0,0,0.10)",
        }
      : {
          heir: "#F5F7FB",
          vault: "#D4A017",
          tagline: "rgba(245,247,251,0.58)",
          shadow: "none",
        };

  const logoContent = (
    <div
      className={`flex min-w-0 ${
        isHorizontal ? "flex-row items-center gap-2.5 sm:gap-3" : "flex-col items-center"
      } ${className}`}
    >
      {variant !== "text-only" && (
        <div
          className={`relative shrink-0 ${isHorizontal ? "" : "mb-2"}`}
          style={{ width: dimensions.width, height: dimensions.height }}
        >
          <Image
            src="/heirvault-logo.png"
            alt="HeirVault Registry Seal"
            fill
            className="object-contain"
            priority
            sizes={`${dimensions.width}px`}
          />
        </div>
      )}

      {variant !== "icon-only" && (
        <div
          className={`min-w-0 flex flex-col ${isHorizontal ? "items-start" : "items-center"} leading-[1.05]`}
        >
          <span
            className={`whitespace-nowrap font-bold ${dimensions.textSize} tracking-[0.04em] font-['Playfair_Display',Georgia,serif]`}
            style={{
              textShadow: palette.shadow,
              lineHeight: 1,
            }}
          >
            <span style={{ color: palette.heir }}>HEIR</span>
            <span style={{ color: palette.vault }}>VAULT</span>
          </span>

          {showTagline && (
            <span
              className={`mt-1 ${dimensions.tagline} font-medium tracking-[0.06em] ${
                isHorizontal ? "text-left" : "text-center"
              }`}
              style={{ color: palette.tagline }}
            >
              Life insurance policy registry
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {logoContent}
      </Link>
    );
  }

  return <div className="inline-block">{logoContent}</div>;
}