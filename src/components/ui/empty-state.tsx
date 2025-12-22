import { LucideIcon } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      {Icon && (
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
          <Icon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-ink-900 mb-2">{title}</h3>
      <p className="text-sm text-slateui-600 max-w-sm mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="btn-primary">
          {action.label}
        </Button>
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
  icon: Icon,
}: {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: LucideIcon;
}) {
  return <EmptyState icon={Icon} title={title} description={description} action={action} />;
}

/**
 * Empty state for search results
 */
export function EmptySearchState({
  searchQuery,
  onClear,
}: {
  searchQuery?: string;
  onClear?: () => void;
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
        onClear
          ? {
              label: "Clear search",
              onClick: onClear,
            }
          : undefined
      }
    />
  );
}

