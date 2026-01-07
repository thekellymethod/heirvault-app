"use client";

import { cn } from "@/lib/utils";

/**
 * Mobile-friendly table wrapper
 * Shows cards on mobile, table on desktop
 */
export function MobileTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("block md:hidden", className)}>
      {children}
    </div>
  );
}

/**
 * Desktop table wrapper
 */
export function DesktopTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("hidden md:block overflow-x-auto", className)}>
      {children}
    </div>
  );
}

/**
 * Mobile card for table row
 */
export function MobileCard({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 border border-slateui-200 rounded-lg mb-3 bg-white",
        onClick && "cursor-pointer hover:bg-slateui-50 transition-colors",
        className
      )}
    >
      {children}
    </div>
  );
}
