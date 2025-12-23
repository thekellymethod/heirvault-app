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

  const marginLeftClass = size === "sm" ? "-ml-16" : size === "md" ? "-ml-20" : "-ml-24";
  const widthClass = size === "sm" ? "w-40" : size === "md" ? "w-60" : "w-80";
  const heightClass = size === "sm" ? "h-[53px]" : size === "md" ? "h-20" : "h-[107px]";
  
  const logoContent = (
    <div className={`flex ${isHorizontal ? "flex-row items-center gap-0" : "flex-col items-center"} ${className}`}>
      <div className={`relative -ml-2 ${widthClass} ${heightClass}`}>
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
        } tracking-tight relative z-10 ${marginLeftClass} font-['Playfair_Display',Georgia,serif]`}
      >
        <span className="text-[#0f1f35]">Heir</span>
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

