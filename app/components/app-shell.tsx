"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ToastMessage } from "@/app/components/toast-message";
import { logoutAction } from "@/app/anmelden/actions";
import { canOpenAdministration } from "@/lib/administration-navigation";
import type { AuthUser } from "@/lib/permissions";

export function AppShell({ children, user }: { children: React.ReactNode; user:AuthUser|null }) {
  const pathname = usePathname();
  const [queryMessage, setQueryMessage] = useState<{message:string;type:"success"|"error"}>();
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const error = query.get("fehler");
    const success = query.get("erfolg");
    const timer = window.setTimeout(() => setQueryMessage(error ? { message: error, type: "error" } : success ? { message: "Die Aktion wurde erfolgreich gespeichert.", type: "success" } : undefined), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  useEffect(() => {
    const timer=window.setTimeout(()=>setNavigationCollapsed(window.localStorage.getItem("ordo-navigation-collapsed") === "true"),0);
    return ()=>window.clearTimeout(timer);
  }, []);

  const toggleNavigation = () => setNavigationCollapsed((current) => {
    const next = !current;
    window.localStorage.setItem("ordo-navigation-collapsed", String(next));
    return next;
  });

  if(pathname==="/anmelden") return children;
  const hasProfessionalAccess=Boolean(user?.roles.some(role=>["MITARBEITER","PRUEFER","KANZLEILEITUNG","MANDANTEN_VERWALTEN"].includes(role)));
  const hasPayrollAccess=Boolean(user?.roles.some(role=>["LOHNSACHBEARBEITER","MITARBEITER","PRUEFER","KANZLEILEITUNG"].includes(role)));
  const payrollOnly=Boolean(user?.roles.includes("LOHNSACHBEARBEITER")&&!hasProfessionalAccess);
  const hasCampusAccess=hasProfessionalAccess;
  const hasAdministrationAccess=Boolean(user&&canOpenAdministration(user));
  const navigation=[
    ...(!payrollOnly?[{label:"Übersicht",href:"/",icon:"⌂"}]:[]),
    ...(hasProfessionalAccess?[{label:"Mandanten",href:"/mandanten",icon:"M"},{label:"Rechnungswesen",href:"/monatschecklisten",icon:"R"}]:[]),
    ...(hasPayrollAccess?[{label:"FiBu ↔ Lohn",href:"/fibu-lohn",icon:"↔"}]:[]),
    ...(hasCampusAccess?[{label:"Ordo Campus",href:"/ordo-campus",icon:"C"}]:[]),
    ...(hasAdministrationAccess?[{label:"Verwaltung",href:"/verwaltung",icon:"⚙"}]:[])
  ];
  const roleDisplay=user?formatRoleDisplay(user.roles):null;
  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
      <ToastMessage key={queryMessage?.message} message={queryMessage?.message} type={queryMessage?.type}/>
      <div className="mx-auto flex min-h-screen max-w-[1920px] flex-col md:flex-row">
        <aside data-collapsed={navigationCollapsed} className={`${navigationCollapsed ? "md:w-20" : "md:w-64"} border-b border-[var(--color-primary-dark)] bg-[var(--color-primary-dark)] text-white transition-[width] duration-200 motion-reduce:transition-none md:flex md:flex-none md:flex-col md:border-b-0 md:border-r`}>
          <div className={`${navigationCollapsed ? "md:px-3" : "md:px-5"} relative border-b border-white/15 px-5 py-4 md:min-h-[6.5rem] md:py-5`}>
            <div
              className={`flex min-w-0 items-center gap-3 ${navigationCollapsed ? "md:justify-center" : ""}`}
              title={navigationCollapsed ? "Ordo Caroli – CONCILIUM" : undefined}
              aria-label="Ordo Caroli – CONCILIUM"
            >
              <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/35 bg-white/10 text-sm font-bold tracking-wide shadow-inner">OC</span>
              <span className={`${navigationCollapsed ? "md:hidden" : ""} min-w-0 text-left`}>
                <span className="block whitespace-nowrap text-lg font-semibold leading-5 tracking-tight">Ordo Caroli</span>
                <span className="mt-1 block whitespace-nowrap text-[10px] font-normal uppercase leading-3 tracking-[0.18em] text-white/60">CONCILIUM</span>
              </span>
            </div>
            <button
              type="button"
              onClick={toggleNavigation}
              className={`absolute right-0 hidden h-8 w-8 translate-x-1/2 items-center justify-center rounded-full border border-white/35 bg-[var(--color-primary-dark)] text-base shadow-sm hover:bg-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-primary-dark)] md:inline-flex ${navigationCollapsed ? "top-[4.6rem]" : "top-1/2 -translate-y-1/2"}`}
              title={navigationCollapsed ? "Navigation ausklappen" : "Navigation einklappen"}
              aria-label={navigationCollapsed ? "Hauptnavigation ausklappen" : "Hauptnavigation einklappen"}
            >
              <span aria-hidden>{navigationCollapsed ? "›" : "‹"}</span>
            </button>
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
                        ? pathname.startsWith("/monatschecklisten") || pathname.startsWith("/jahresabschluesse") || pathname.startsWith("/rechnungswesen")
                      : entry.href === "/fibu-lohn"
                        ? pathname.startsWith("/fibu-lohn") && !pathname.startsWith("/fibu-lohn/themen")
                      : entry.href === "/ordo-campus"
                        ? pathname.startsWith("/ordo-campus") || /^\/standardaufgaben\/\d+\/campus/.test(pathname)
                      : entry.href === "/verwaltung"
                        ? pathname.startsWith("/verwaltung") || pathname.startsWith("/administration") || pathname.startsWith("/standardaufgaben") || pathname.startsWith("/fibu-lohn/themen")
                        : false;
                return (
                  <li key={entry.label} className="shrink-0">
                    <Link
                      href={entry.href}
                      aria-current={active ? "page" : undefined}
                      title={navigationCollapsed ? entry.label : undefined}
                      aria-label={entry.label}
                      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${
                        active
                          ? "bg-[var(--color-primary)] text-white"
                          : "text-white/75 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span aria-hidden className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-sm font-bold">{entry.icon}</span>
                      <span className={navigationCollapsed ? "md:hidden" : ""}>{entry.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          {user&&roleDisplay&&<div className={`${navigationCollapsed ? "md:p-3" : "md:p-4"} mt-auto border-t border-white/15 p-4 text-sm`}><Link href="/passwort-aendern" title={navigationCollapsed?`${user.fullName} · Passwort ändern`:undefined} aria-label={`${user.fullName} · Passwort ändern`} className="flex items-center gap-3 rounded py-1 hover:bg-white/10"><span aria-hidden className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">●</span><span className={navigationCollapsed ? "md:hidden" : ""}><span className="block font-semibold">{user.fullName}</span><span className="text-xs underline">Passwort ändern</span></span></Link><div className={`${navigationCollapsed ? "md:hidden" : ""} mt-2 flex flex-wrap gap-1`}>{roleDisplay.professional.map(role=><span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px]" key={role}>{role}</span>)}{roleDisplay.technical.map(role=><span className="rounded-full border border-white/30 px-2 py-0.5 text-[11px]" key={role}>{role}</span>)}</div>{roleDisplay.additional.length>0&&<p className={`${navigationCollapsed ? "md:hidden" : ""} mt-2 line-clamp-2 text-[11px] leading-4 text-white/60`} title={roleDisplay.additional.join(" · ")}>{roleDisplay.additional.join(" · ")}</p>}<form action={logoutAction} className="mt-2"><button title={navigationCollapsed?"Abmelden":undefined} aria-label="Abmelden" className="flex w-full items-center gap-3 rounded border border-white/30 px-2 py-2 text-xs hover:bg-white/10"><span aria-hidden className="inline-flex h-6 w-6 items-center justify-center">↪</span><span className={navigationCollapsed ? "md:hidden" : ""}>Abmelden</span></button></form></div>}
        </aside>
        <main className="min-w-0 flex-1 px-4 py-7 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export function formatRoleDisplay(roles:string[]) {
  const labels:Record<string,string>={
    KANZLEILEITUNG:"Kanzleileitung",PRUEFER:"Prüfer",MITARBEITER:"Mitarbeiter",LOHNSACHBEARBEITER:"Lohnsachbearbeiter",ADMINISTRATOR:"Administrator",
    STANDARDAUFGABEN_VERWALTEN:"Standardaufgaben verwalten",ORDO_CAMPUS_VERWALTEN:"Ordo Campus verwalten",FIBU_LOHN_THEMEN_VERWALTEN:"FiBu-Lohn-Themen verwalten",
    MANDANTEN_VERWALTEN:"Mandanten verwalten",MANDANTENSPEZIFISCHE_AUFGABEN_VERWALTEN:"Mandantenspezifische Aufgaben verwalten",
  };
  const unique=[...new Set(roles)];
  const professional=["KANZLEILEITUNG","PRUEFER","MITARBEITER","LOHNSACHBEARBEITER"].filter(role=>unique.includes(role)).map(role=>labels[role]);
  const technical=unique.includes("ADMINISTRATOR")?[labels.ADMINISTRATOR]:[];
  const shown=new Set(["KANZLEILEITUNG","PRUEFER","MITARBEITER","LOHNSACHBEARBEITER","ADMINISTRATOR"]);
  const additional=unique.filter(role=>!shown.has(role)).map(role=>labels[role]??role).sort((a,b)=>a.localeCompare(b,"de"));
  return {professional,technical,additional};
}
