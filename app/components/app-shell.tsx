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
    ...(!payrollOnly?[{label:"Dashboard",href:"/",icon:"dashboard" as const}]:[]),
    ...(hasProfessionalAccess?[{label:"Mandanten",href:"/mandanten",icon:"clients" as const},{label:"Rechnungswesen",href:"/monatschecklisten",icon:"accounting" as const}]:[]),
    ...(hasPayrollAccess?[{label:"FiBu ↔ Lohn",href:"/fibu-lohn",icon:"payroll" as const}]:[]),
    ...(hasCampusAccess?[{label:"Ordo Campus",href:"/ordo-campus",icon:"campus" as const}]:[]),
    ...(hasAdministrationAccess?[{label:"Verwaltung",href:"/verwaltung",icon:"administration" as const}]:[])
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
              className="absolute right-0 top-[2.625rem] hidden h-8 w-8 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-white/35 bg-[var(--color-primary-dark)] text-base shadow-sm hover:bg-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-primary-dark)] md:inline-flex"
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
                      <span aria-hidden className="inline-flex h-6 w-6 shrink-0 items-center justify-center"><NavigationIcon name={entry.icon}/></span>
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

type NavigationIconName = "dashboard" | "clients" | "accounting" | "payroll" | "campus" | "administration";

function NavigationIcon({name}:{name:NavigationIconName}) {
  const common={className:"h-5 w-5",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round" as const,strokeLinejoin:"round" as const};
  if(name==="dashboard") return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
  if(name==="clients") return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  if(name==="accounting") return <svg {...common}><path d="M9 5h6M9 9h6M9 13h4"/><path d="M6 3h12a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2h2"/></svg>;
  if(name==="payroll") return <svg {...common}><path d="m7 7-4 4 4 4M3 11h18M17 3l4 4-4 4M21 7H3"/></svg>;
  if(name==="campus") return <svg {...common}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/><path d="M8 6h8M8 10h6"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.83 2.83-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21h-4v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06-2.83-2.83.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3v-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06 2.83-2.83.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3h4v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06 2.83 2.83-.06.06A1.65 1.65 0 0 0 19.4 9c.12.6.65 1 1.26 1H21v4h-.34c-.61 0-1.14.4-1.26 1Z"/></svg>;
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
