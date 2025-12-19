import React from "react";
import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
  href?: string;
}

export function Logo({ className = "", showTagline = false, size = "md", href = "/" }: LogoProps) {
  const sizeClasses = {
    sm: { width: 120, height: 40 },
    md: { width: 180, height: 60 },
    lg: { width: 240, height: 80 },
  };

  const dimensions = sizeClasses[size];
  const isHorizontal = className.includes("flex-row");

  const logoContent = (
    <div className={`flex ${isHorizontal ? "flex-row items-center gap-3" : "flex-col items-center"} ${className}`}>
      <div className="relative" style={{ width: dimensions.width, height: dimensions.height }}>
        <Image
          src="/logo-hv.png"
          alt="HeirVault Logo"
          fill
          className="object-contain"
          priority
          sizes={`${dimensions.width}px`}
        />
      </div>
      
      {/* HeirVault text next to logo */}
      <span
        className={`font-serif font-bold text-gold-500 ${
          size === "sm" ? "text-lg" : size === "md" ? "text-2xl" : "text-3xl"
        } tracking-tight`}
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        HeirVault
      </span>

      {/* Tagline */}
      {showTagline && (
        <div className="flex items-center gap-2 mt-2">
          <div className="h-px w-8 bg-slate-300"></div>
          <span
            className={`text-slate-500 ${
              size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"
            } font-medium tracking-wide`}
          >
            SECURING YOUR LEGACY
          </span>
          <div className="h-px w-8 bg-slate-300"></div>
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

  return logoContent;
}

