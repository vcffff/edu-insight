"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export function DialogContent({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-on-surface/30 backdrop-blur-[2px]" />
      <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl focus:outline-none">
        <DialogPrimitive.Title className="pr-8 font-heading text-xl font-semibold">
          {title}
        </DialogPrimitive.Title>
        <DialogPrimitive.Description className="mt-1 text-sm text-secondary">
          {description ?? "Сведения о рабочем пространстве EduInsight"}
        </DialogPrimitive.Description>
        <div className="mt-5">{children}</div>
        <DialogPrimitive.Close
          aria-label="Закрыть окно"
          className="absolute right-4 top-4 rounded-md p-1 text-secondary hover:bg-surface-container-low"
        >
          <X size={20} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
