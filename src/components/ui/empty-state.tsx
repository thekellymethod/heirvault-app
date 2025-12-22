"use client";

import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "./button";
import { cn } from "@/lib/utils";

type IconName = keyof typeof LucideIcons;

interface EmptyStateProps {
  icon?: IconName | LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  // Handle icon - can be a string name or a component
  let IconComponent: LucideIcon | null = null;
  if (icon) {
    if (typeof icon === "string") {
      IconComponent = (LucideIcons[icon as IconName] as LucideIcon) || null;
    } else {
      IconComponent = icon;
    }
  }

  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      {IconComponent && (
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
          <IconComponent className="h-8 w-8 text-slate-400 dark:text-slate-500" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-ink-900 mb-2">{title}</h3>
      <p className="text-sm text-slateui-600 max-w-sm mb-6">{description}</p>
      {action && (
        action.href ? (
          <Link href={action.href} className="btn-primary">
            {action.label}
          </Link>
        ) : action.onClick ? (
          <Button onClick={action.onClick} className="btn-primary">
            {action.label}
          </Button>
        ) : null
      )}
    </div>
  );
}

/**
 * Empty state for lists with no items
 */
export function EmptyListState({
  title = "No items found",
  description = "Get started by creating your first item.",
  action,
  icon,
}: {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  icon?: IconName | LucideIcon;
}) {
  return <EmptyState icon={icon} title={title} description={description} action={action} />;
}

/**
 * Empty state for search results
 */
export function EmptySearchState({
  searchQuery,
  onClear,
  clearHref,
}: {
  searchQuery?: string;
  onClear?: () => void;
  clearHref?: string;
}) {
  return (
    <EmptyState
      title={searchQuery ? `No results for "${searchQuery}"` : "No results found"}
      description={
        searchQuery
          ? "Try adjusting your search terms or filters."
          : "Start by searching for something."
      }
      action={
        onClear || clearHref
          ? {
              label: "Clear search",
              onClick: onClear,
              href: clearHref,
            }
          : undefined
      }
    />
  );
}

