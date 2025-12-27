import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97] select-none touch-manipulation",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm sm:hover:bg-primary/90 sm:hover:shadow-md sm:hover:shadow-primary/20 sm:hover:-translate-y-0.5",
        destructive: "bg-destructive text-destructive-foreground shadow-sm sm:hover:bg-destructive/90 sm:hover:shadow-md sm:hover:shadow-destructive/20 sm:hover:-translate-y-0.5",
        outline: "border-2 border-border bg-background text-foreground sm:hover:bg-accent sm:hover:text-accent-foreground sm:hover:border-primary/50 sm:hover:shadow-sm sm:hover:-translate-y-0.5",
        secondary: "bg-secondary text-secondary-foreground shadow-sm sm:hover:bg-secondary/80 sm:hover:shadow-md sm:hover:shadow-secondary/20 sm:hover:-translate-y-0.5",
        ghost: "text-foreground sm:hover:bg-accent sm:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        glow: "bg-primary text-primary-foreground shadow-md relative overflow-hidden sm:hover:shadow-[0_0_25px_hsl(var(--primary)/0.4)] sm:hover:-translate-y-0.5",
        glass: "bg-background/60 backdrop-blur-md border border-border/50 text-foreground sm:hover:bg-background/90 sm:hover:border-primary/40 sm:hover:shadow-md sm:hover:-translate-y-0.5",
        success: "bg-emerald-600 text-white shadow-sm sm:hover:bg-emerald-700 sm:hover:shadow-md sm:hover:-translate-y-0.5",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-11 w-11",
        "icon-sm": "h-9 w-9",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
