import { cn } from "@/lib/utils";
export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.ComponentProps<"span"> & {
  tone?: "neutral" | "primary" | "success" | "danger" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide leading-4",
        {
          "bg-surface-container text-secondary": tone === "neutral",
          "bg-primary-fixed/60 text-primary": tone === "primary",
          "bg-emerald-50 text-tertiary-container": tone === "success",
          "bg-error-container/75 text-error": tone === "danger",
          "bg-amber-50 text-amber-800": tone === "warning",
        },
        className,
      )}
      {...props}
    />
  );
}
