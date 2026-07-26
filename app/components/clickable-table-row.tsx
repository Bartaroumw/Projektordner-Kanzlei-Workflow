"use client";

import { useRouter } from "next/navigation";

export function ClickableTableRow({ href, children, className = "" }: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const navigate = (target: EventTarget | null) => {
    if (target instanceof Element && target.closest("a,button,input,select,textarea,label")) return;
    const selection = window.getSelection()?.toString();
    if (selection) return;
    router.push(href);
  };
  return <tr
    className={`clickable-row ${className}`}
    tabIndex={0}
    aria-label="Detailansicht öffnen"
    onClick={(event) => navigate(event.target)}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        navigate(event.target);
      }
    }}
  >{children}</tr>;
}
