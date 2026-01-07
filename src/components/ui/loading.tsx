"use client";

import { Skeleton, TableSkeleton, ListSkeleton, CardSkeleton } from "./skeleton";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Loading wrapper component that shows a skeleton while content loads
 */
export function LoadingWrapper({
  children,
  isLoading,
  skeleton,
  className,
}: {
  children: React.ReactNode;
  isLoading: boolean;
  skeleton?: React.ReactNode;
  className?: string;
}) {
  if (isLoading) {
    return skeleton || <LoadingSpinner />;
  }
  return <div className={className}>{children}</div>;
}

/**
 * Simple loading spinner
 */
export function LoadingSpinner({ 
  size = "md",
  className 
}: { 
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className={cn("flex items-center justify-center p-4", className)}>
      <Loader2 className={cn("animate-spin text-slate-400", sizeClasses[size])} />
    </div>
  );
}

/**
 * Loading text with spinner
 */
export function LoadingText({ 
  message = "Loading...",
  className 
}: { 
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 text-slate-600", className)}>
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{message}</span>
    </div>
  );
}

/**
 * Page-level loading skeleton
 */
export function PageLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

/**
 * Client list skeleton (for clients page)
 */
export function ClientListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="rounded-xl border border-slateui-200 bg-white overflow-x-auto">
      <div className="grid grid-cols-12 gap-2 border-b border-slateui-200 px-4 py-3 text-xs font-semibold text-ink-900 min-w-[800px]">
        <div className="col-span-4">Client</div>
        <div className="col-span-4 hidden md:block">Email</div>
        <div className="col-span-2 hidden sm:block">Phone</div>
        <div className="col-span-2 text-right">Updated</div>
      </div>
      <div className="divide-y divide-slateui-200">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="px-4 py-4">
            <div className="grid grid-cols-12 items-center gap-2 min-w-[800px]">
              <div className="col-span-4 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="col-span-4 hidden md:block">
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="col-span-2 hidden sm:block">
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="col-span-2 text-right">
                <Skeleton className="h-3 w-20 ml-auto" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Policy list skeleton
 */
export function PolicyListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="rounded-xl border border-slateui-200 bg-white overflow-x-auto">
      <div className="grid grid-cols-12 gap-2 border-b border-slateui-200 px-4 py-3 text-xs font-semibold text-ink-900 min-w-[800px]">
        <div className="col-span-3">Policy Number</div>
        <div className="col-span-3">Insurer</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-2">Client</div>
        <div className="col-span-2 text-right">Created</div>
      </div>
      <div className="divide-y divide-slateui-200">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="px-4 py-4">
            <div className="grid grid-cols-12 items-center gap-2 min-w-[800px]">
              <div className="col-span-3">
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="col-span-3">
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="col-span-2">
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="col-span-2">
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="col-span-2 text-right">
                <Skeleton className="h-3 w-20 ml-auto" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Card grid skeleton (for analytics/dashboard)
 */
export function StatsCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slateui-200 bg-white p-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}
