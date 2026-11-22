"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Built on the native <dialog> element opened with showModal():
 * the rest of the page becomes inert (focus is trapped inside), Esc closes it,
 * and focus returns to the element that opened it.
 */
function useNativeDialog(open, onClose) {
  const ref = useRef(null);
  const returnFocus = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement;
      dialog.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = () => {
      document.documentElement.style.overflow = "";
      if (returnFocus.current instanceof HTMLElement) returnFocus.current.focus();
      onClose?.();
    };
    const handleCancel = (e) => {
      e.preventDefault();
      onClose?.();
    };
    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("cancel", handleCancel);
    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("cancel", handleCancel);
      document.documentElement.style.overflow = "";
    };
  }, [onClose]);

  // Click on the backdrop (outside the panel) closes
  const onBackdropClick = (e) => {
    if (e.target === ref.current) onClose?.();
  };

  return { ref, onBackdropClick };
}

function CloseButton({ onClose, label = "Close" }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={label}
      className="inline-flex size-9 items-center justify-center rounded-btn text-muted transition-colors hover:bg-surface hover:text-ink"
    >
      <X aria-hidden="true" className="size-5" strokeWidth={1.75} />
    </button>
  );
}

export function Dialog({ open, onClose, title, description, children, footer, size = "md", className }) {
  const { ref, onBackdropClick } = useNativeDialog(open, onClose);
  const titleId = useId();
  const descId = useId();
  const width = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" }[size];

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClick={onBackdropClick}
      className={cn(
        "m-auto w-[calc(100%-32px)] rounded-card border border-line bg-card p-0 text-ink",
        "open:animate-[toast-in_180ms_var(--ease-standard)]",
        width,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="text-h4 text-primary">
            {title}
          </h2>
          {description ? (
            <p id={descId} className="text-sm text-muted">
              {description}
            </p>
          ) : null}
        </div>
        <CloseButton onClose={onClose} />
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
      {footer ? (
        <div className="flex justify-end gap-3 border-t border-line bg-surface px-6 py-4">{footer}</div>
      ) : null}
    </dialog>
  );
}

/** Drawer — same mechanics as Dialog, slides from the side. Used for mobile menu and admin panels. */
export function Drawer({ open, onClose, title, children, side = "right", className }) {
  const { ref, onBackdropClick } = useNativeDialog(open, onClose);
  const titleId = useId();

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClick={onBackdropClick}
      className={cn(
        "fixed inset-y-0 m-0 h-dvh max-h-none w-[min(420px,calc(100%-48px))] max-w-none border-line bg-card p-0 text-ink",
        side === "right" ? "right-0 left-auto border-l" : "right-auto left-0 border-r",
        side === "right"
          ? "open:animate-[drawer-in-right_220ms_var(--ease-standard)]"
          : "open:animate-[drawer-in-left_220ms_var(--ease-standard)]",
        className,
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
          <h2 id={titleId} className="text-h4 text-primary">
            {title}
          </h2>
          <CloseButton onClose={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </dialog>
  );
}
