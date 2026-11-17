"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  label?: string;
  labelledBy?: string;
  dismissible?: boolean;
}

/** Browser-managed focus, inert background and nested modal stack. */
export function Modal({ open, onClose, children, className = "", label, labelledBy, dismissible = true }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const pressedOutside = useRef(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!mounted || !dialog || !open) return;
    const handleClose = () => onCloseRef.current();
    dialog.addEventListener("close", handleClose);
    if (!dialog.open) dialog.showModal();
    return () => {
      dialog.removeEventListener("close", handleClose);
      if (dialog.open) dialog.close();
    };
  }, [mounted, open]);

  if (!mounted || !open) return null;
  const outside = (event: PointerEvent<HTMLDialogElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  };

  return createPortal(
    <dialog
      ref={ref}
      closedby={dismissible ? "any" : "none"}
      aria-busy={!dismissible || undefined}
      onCancel={(event) => { if (!dismissible) event.preventDefault(); }}
      aria-label={label}
      aria-labelledby={labelledBy}
      className={`app-modal border-0 p-0 text-ink ${className}`}
      onPointerDown={(event) => { pressedOutside.current = outside(event); }}
      onPointerUp={(event) => {
        if (dismissible && !("closedBy" in HTMLDialogElement.prototype) && pressedOutside.current && outside(event)) {
          event.currentTarget.close();
        }
        pressedOutside.current = false;
      }}
    >{children}</dialog>,
    document.body,
  );
}
