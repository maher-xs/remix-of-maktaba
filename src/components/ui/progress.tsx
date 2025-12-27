import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { dir?: "ltr" | "rtl" }
>(({ className, value, dir, ...props }, ref) => {
  // Detect RTL direction
  const isRTL = dir === "rtl" || (typeof document !== "undefined" && document.dir === "rtl");
  
  // In RTL, we need to translate from the right side
  const translateValue = isRTL 
    ? `translateX(${100 - (value || 0)}%)` 
    : `translateX(-${100 - (value || 0)}%)`;
  
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: translateValue }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
