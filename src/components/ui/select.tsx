import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
export function Select({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <select
        className="h-9 w-full appearance-none rounded-lg border border-outline-variant/45 bg-surface py-1.5 pl-3 pr-8 text-xs font-medium text-on-surface outline-none transition-colors hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary"
      />
    </div>
  );
}
