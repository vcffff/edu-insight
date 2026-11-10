import { cn } from "@/lib/utils";
export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="card"
      className={cn(
        "min-w-0 rounded-xl border border-outline-variant/25 bg-white shadow-[0_1px_3px_0_#0b1c3006]",
        className,
      )}
      {...props}
    />
  );
}
export function CardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant/20 pb-3 mb-4",
        className,
      )}
      {...props}
    />
  );
}
export function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "font-heading text-base font-semibold tracking-[-0.01em]",
        className,
      )}
      {...props}
    />
  );
}
