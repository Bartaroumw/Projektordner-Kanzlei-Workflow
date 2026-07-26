"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col md:flex-row">
        <aside className="border-b border-slate-800 bg-slate-950 text-white md:w-64 md:flex-none md:border-b-0 md:border-r">
          <div className="border-b border-slate-800 px-6 py-6">
            <p className="text-lg font-semibold tracking-tight">Kanzlei Workflow</p>
            <p className="mt-1 text-xs text-slate-400">Arbeitsbereich</p>
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
                          ? "bg-blue-700 text-white"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
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
