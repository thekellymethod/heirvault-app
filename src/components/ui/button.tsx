import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const hasCustomButtonClass = className?.includes("btn-primary") || className?.includes("btn-secondary");

    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
          !hasCustomButtonClass && {
            "rounded-lg border transition-[transform,box-shadow,background-color] duration-150 ease-out motion-reduce:transform-none":
              true,
            "border-[#0c1829]/90 bg-gradient-to-b from-[#2f4f7c] via-[#1e3a5f] to-[#162d4a] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(0,0,0,0.2),0_4px_0_#0d1828,0_8px_0_-2px_rgba(10,18,32,0.35),0_8px_20px_rgba(15,30,50,0.35)] hover:-translate-y-px hover:from-[#375a8a] hover:via-[#2a4a73] hover:to-[#1e3a5f] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-1px_0_rgba(0,0,0,0.15),0_5px_0_#0d1828,0_12px_24px_rgba(15,30,50,0.4)] active:translate-y-[3px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25),inset_0_-1px_0_rgba(255,255,255,0.06),0_2px_0_#0a1420,0_4px_12px_rgba(15,30,50,0.3)]":
              variant === "default",
            "border border-slateui-200/95 bg-gradient-to-b from-white to-slateui-50 text-ink-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(15,30,50,0.06),0_3px_0_#b8c7dd,0_6px_16px_rgba(17,28,51,0.1)] hover:-translate-y-px hover:from-white hover:to-paper-50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_4px_0_#a8b8d0,0_6px_16px_rgba(17,28,51,0.12)] active:translate-y-[2px] active:shadow-[inset_0_2px_3px_rgba(15,30,50,0.08),0_1px_0_#b8c7dd,0_6px_16px_rgba(17,28,51,0.08)]":
              variant === "outline",
            "text-ink-900 hover:bg-paper-100": variant === "ghost",
            "underline-offset-4 hover:underline text-ink-900": variant === "link",
            "h-10 px-4 py-2": size === "default",
            "h-9 px-3": size === "sm",
            "h-11 px-8": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
