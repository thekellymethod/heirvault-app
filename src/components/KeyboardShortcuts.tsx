"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Home } from "lucide-react";

interface Shortcut {
  key: string;
  description: string;
  action: () => void;
  modifier?: "ctrl" | "cmd" | "meta";
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      for (const shortcut of shortcuts) {
        const keyMatches = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const modifierMatches =
          !shortcut.modifier || (shortcut.modifier === "meta" && modifierKey) || (shortcut.modifier === "ctrl" && modifierKey);

        if (keyMatches && modifierMatches) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

/**
 * Global keyboard shortcuts for the dashboard
 */
export function GlobalKeyboardShortcuts() {
  const router = useRouter();

  useKeyboardShortcuts([
    {
      key: "k",
      modifier: "meta",
      description: "Search",
      action: () => {
        // Focus search input if available, or navigate to search
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        } else {
          router.push("/dashboard/search");
        }
      },
    },
    {
      key: "n",
      modifier: "meta",
      description: "New client",
      action: () => {
        router.push("/dashboard/clients/new");
      },
    },
    {
      key: "h",
      modifier: "meta",
      description: "Home",
      action: () => {
        router.push("/dashboard");
      },
    },
  ]);

  return null;
}

/**
 * Keyboard shortcuts help modal
 */
export function KeyboardShortcutsHelp() {
  const shortcuts = [
    { keys: "⌘K", description: "Search", icon: Search },
    { keys: "⌘N", description: "New client", icon: Plus },
    { keys: "⌘H", description: "Go to dashboard", icon: Home },
  ];

  return (
    <div className="space-y-2 text-sm">
      <h3 className="font-semibold text-ink-900 mb-3">Keyboard Shortcuts</h3>
      {shortcuts.map((shortcut, i) => {
        const Icon = shortcut.icon;
        return (
          <div key={i} className="flex items-center justify-between gap-4 py-1">
            <div className="flex items-center gap-2 text-slateui-600">
              <Icon className="h-4 w-4" />
              <span>{shortcut.description}</span>
            </div>
            <kbd className="px-2 py-1 text-xs font-semibold text-ink-900 bg-slate-100 border border-slate-300 rounded">
              {shortcut.keys}
            </kbd>
          </div>
        );
      })}
    </div>
  );
}
