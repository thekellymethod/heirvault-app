import React from "react";
import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  className?: string,
  showTagline?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  href?: string | null | undefined,
  variant?: "default" | "icon-only" | "text-only";
}

export function Logo({ 
  className = "", 
  showTagline = false, 
  size = "md", 
  href,
  variant = "default"
}: LogoProps) {
  const sizeClasses = {
    sm: { width: 40, height: 40, textSize: "text-lg" },
    md: { width: 56, height: 56, textSize: "text-2xl" },
    lg: { width: 80, height: 80, textSize: "text-3xl" },
    xl: { width: 120, height: 120, textSize: "text-4xl" },
  };

  const dimensions = sizeClasses[size];
  const isHorizontal = className.includes("flex-row");

  const logoContent = (
    <div className={`flex ${isHorizontal ? "flex-row items-center gap-3" : "flex-col items-center"} ${className}`}>
      {variant !== "text-only" && (
        <div className={`relative ${isHorizontal ? "" : "mb-2"}`} style={{ width: dimensions.width, height: dimensions.height }}>
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
        <div className={`flex flex-col ${isHorizontal ? "items-start" : "items-center"}`}>
          <span
            className={`font-serif font-bold ${dimensions.textSize} tracking-[0.05em] font-['Playfair_Display',Georgia,serif]`}
            style={{ 
              color: "#0B1220",
              textShadow: variant === "text-only" ? "none" : "0 1px 2px rgba(0,0,0,0.1)"
            }}
          >
            <span style={{ color: "#0B1220" }}>HEIR</span>
            <span style={{ color: "#C8942D" }}>VAULT</span>
          </span>
          
          {showTagline && (
            <div className={`flex items-center gap-2 mt-1 ${isHorizontal ? "justify-start" : "justify-center"}`}>
              <div className="h-px w-6" style={{ backgroundColor: "#C8942D", opacity: 0.3 }}></div>
              <span
                className={`text-xs font-medium tracking-wider uppercase`}
                style={{ color: "#52637A" }}
              >
                Registry
              </span>
              <div className="h-px w-6" style={{ backgroundColor: "#C8942D", opacity: 0.3 }}></div>
            </div>
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

