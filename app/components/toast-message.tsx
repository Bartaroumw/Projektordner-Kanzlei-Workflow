"use client";

import { useEffect, useRef, useState } from "react";

export function ToastMessage({ message, type = "success", focusId }: {
  message?: string;
  type?: "success" | "warning" | "error";
  focusId?: string;
}) {
  const [visible, setVisible] = useState(Boolean(message));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!message) return;
    ref.current?.focus();
    if (focusId) document.getElementById(focusId)?.focus();
    const timer = window.setTimeout(() => setVisible(false), 9000);
    return () => window.clearTimeout(timer);
  }, [message, focusId]);
  if (!message || !visible) return null;
  const colors = {
    success: "border-[var(--color-success)] bg-green-50 text-green-950",
    warning: "border-[var(--color-warning)] bg-amber-50 text-amber-950",
    error: "border-[var(--color-error)] bg-red-50 text-red-950",
  };
  return <div ref={ref} tabIndex={-1} role={type === "error" ? "alert" : "status"} aria-live={type === "error" ? "assertive" : "polite"} className={`fixed right-5 top-5 z-50 max-w-md rounded-lg border-l-4 p-4 shadow-xl ${colors[type]}`}>
    <div className="flex items-start gap-4"><p className="text-sm font-semibold">{message}</p><button type="button" onClick={() => setVisible(false)} className="ml-auto rounded px-2 text-lg" aria-label="Meldung schließen">×</button></div>
  </div>;
}
