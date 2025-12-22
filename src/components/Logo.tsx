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
    sm: { width: 160, height: 53 },
    md: { width: 240, height: 80 },
    lg: { width: 320, height: 107 },
  };

  const dimensions = sizeClasses[size];
  const isHorizontal = className.includes("flex-row");

  const logoContent = (
    <div className={`flex ${isHorizontal ? "flex-row items-center gap-0" : "flex-col items-center"} ${className}`}>
      <div className="relative" style={{ width: dimensions.width, height: dimensions.height, marginLeft: "-0.5rem" }}>
        <Image
          src="/Designer.png"
          alt="HeirVault Logo"
          fill
          className="object-contain"
          priority
          sizes={`${dimensions.width}px`}
        />
      </div>
      
      {/* HeirVault text next to logo - overlapping significantly for better visual */}
      <span
        className={`font-serif font-bold ${
          size === "sm" ? "text-lg" : size === "md" ? "text-2xl" : "text-3xl"
        } tracking-tight relative z-10`}
        style={{ 
          fontFamily: "'Playfair Display', Georgia, serif", 
          marginLeft: size === "sm" ? "-4rem" : size === "md" ? "-5rem" : "-6rem",
          position: "relative"
        }}
      >
        <span style={{ color: "#0f1f35" }}>Heir</span>
        <span className="text-gold-500">Vault</span>
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
      <Link href={href} className="inline-block -ml-4">
        {logoContent}
      </Link>
    );
  }

  return <div className="-ml-4">{logoContent}</div>;
}

