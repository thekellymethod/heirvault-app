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
            "rounded-md transition-all": true,
            "text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0":
              variant === "default",
            "border border-slateui-200 bg-transparent text-ink-900 hover:bg-paper-100 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0":
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
        style={
          variant === "default" && !hasCustomButtonClass
            ? { backgroundColor: "#1e3a5f", color: "#ffffff" }
            : {}
        }
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
