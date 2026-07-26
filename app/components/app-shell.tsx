"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ToastMessage } from "@/app/components/toast-message";

const navigation = [
  { label: "Dashboard", href: "/" },
  { label: "Mandanten", href: "/mandanten" },
  { label: "Monatschecklisten", href: "/monatschecklisten" },
  { label: "Standardaufgaben", href: "/standardaufgaben" },
  { label: "Wissensspeicher", href: "/#wissensspeicher" },
  { label: "Administration", href: "/#administration" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [queryMessage, setQueryMessage] = useState<{message:string;type:"success"|"error"}>();
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const error = query.get("fehler");
    const success = query.get("erfolg");
    const timer = window.setTimeout(() => setQueryMessage(error ? { message: error, type: "error" } : success ? { message: "Die Aktion wurde erfolgreich gespeichert.", type: "success" } : undefined), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
      <ToastMessage key={queryMessage?.message} message={queryMessage?.message} type={queryMessage?.type}/>
      <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col md:flex-row">
        <aside className="border-b border-[var(--color-primary-dark)] bg-[var(--color-primary-dark)] text-white md:w-64 md:flex-none md:border-b-0 md:border-r">
          <div className="border-b border-white/15 px-6 py-6">
            <div aria-hidden className="mb-4 flex h-10 w-10 items-center justify-center rounded border border-white/30 text-sm font-bold">OC</div>
            <p className="text-xl font-semibold tracking-tight">Ordo Caroli</p>
            <p className="mt-1 text-xs text-white/70">Rechnungswesen-Workflow</p>
            <p className="mt-3 text-[11px] uppercase tracking-widest text-white/55">für Concilium</p>
          </div>
          <nav aria-label="Hauptnavigation" className="p-3">
            <ul className="flex gap-1 overflow-x-auto md:block md:space-y-1">
              {navigation.map((entry) => {
                const active =
                  entry.href === "/"
                    ? pathname === "/"
                    : entry.href === "/mandanten"
                      ? pathname.startsWith("/mandanten")
                      : entry.href === "/monatschecklisten"
                        ? pathname.startsWith("/monatschecklisten")
                      : entry.href === "/standardaufgaben"
                        ? pathname.startsWith("/standardaufgaben")
                        : false;
                return (
                  <li key={entry.label} className="shrink-0">
                    <Link
                      href={entry.href}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-md px-3 py-2.5 text-sm font-medium ${
                        active
                          ? "bg-[var(--color-primary)] text-white"
                          : "text-white/75 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {entry.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-7 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
