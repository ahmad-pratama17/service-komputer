"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type DialogContextValue = {
  onOpenChange: (open: boolean) => void;
  titleId: string;
};

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext(component: string): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error(`${component} harus dipakai di dalam <Dialog>.`);
  }
  return context;
}

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();

  const titleId = `${generatedId}-title`;

  useEffect(() => {
    if (!open) {
      return;
    }

    panelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onOpenChange]);

  if (!open) {
    return null;
  }

  return (
    <DialogContext.Provider value={{ onOpenChange, titleId }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          aria-hidden
          onClick={() => onOpenChange(false)}
          className="absolute inset-0 bg-zinc-900/60"
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl focus:outline-none dark:bg-zinc-900"
        >
          {children}
        </div>
      </div>
    </DialogContext.Provider>
  );
}

export function DialogHeader({ className, children }: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 pr-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DialogTitle({ className, children }: {
  className?: string;
  children: ReactNode;
}) {
  const { titleId } = useDialogContext("DialogTitle");

  return (
    <h2
      id={titleId}
      className={cn(
        "text-lg font-semibold text-zinc-900 dark:text-zinc-100",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function DialogDescription({ className, children }: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={cn("mt-1 text-sm text-zinc-500 dark:text-zinc-400", className)}
    >
      {children}
    </p>
  );
}

export function DialogBody({ className, children }: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("mt-4", className)}>{children}</div>;
}

export function DialogFooter({ className, children }: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("mt-6 flex flex-wrap justify-end gap-2", className)}>
      {children}
    </div>
  );
}

export function DialogClose({ label = "Tutup dialog" }: {
  label?: string;
}) {
  const { onOpenChange } = useDialogContext("DialogClose");

  return (
    <button
      type="button"
      onClick={() => onOpenChange(false)}
      aria-label={label}
      className="absolute right-4 top-4 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
    >
      <X className="h-4 w-4" aria-hidden />
    </button>
  );
}
