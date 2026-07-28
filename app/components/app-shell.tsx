"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ToastMessage } from "@/app/components/toast-message";
import { logoutAction } from "@/app/anmelden/actions";
import type { AuthUser } from "@/lib/permissions";

export function AppShell({ children, user }: { children: React.ReactNode; user:AuthUser|null }) {
  const pathname = usePathname();
  const [queryMessage, setQueryMessage] = useState<{message:string;type:"success"|"error"}>();
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const error = query.get("fehler");
    const success = query.get("erfolg");
    const timer = window.setTimeout(() => setQueryMessage(error ? { message: error, type: "error" } : success ? { message: "Die Aktion wurde erfolgreich gespeichert.", type: "success" } : undefined), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  if(pathname==="/anmelden") return children;
  const canStandards=Boolean(user?.roles.some(role=>["KANZLEILEITUNG","STANDARDAUFGABEN_VERWALTEN","ORDO_CAMPUS_VERWALTEN"].includes(role)));
  const canUsers=Boolean(user?.roles.includes("ADMINISTRATOR"));
  const hasProfessionalAccess=Boolean(user?.roles.some(role=>["MITARBEITER","PRUEFER","KANZLEILEITUNG","MANDANTEN_VERWALTEN"].includes(role)));
  const hasPayrollAccess=Boolean(user?.roles.some(role=>["LOHNSACHBEARBEITER","MITARBEITER","PRUEFER","KANZLEILEITUNG"].includes(role)));
  const canManagePayrollTopics=Boolean(user?.roles.some(role=>["KANZLEILEITUNG","FIBU_LOHN_THEMEN_VERWALTEN"].includes(role)));
  const payrollOnly=Boolean(user?.roles.includes("LOHNSACHBEARBEITER")&&!hasProfessionalAccess);
  const navigation=[
    ...(!payrollOnly?[{label:"Dashboard",href:"/"}]:[]),
    ...(hasProfessionalAccess?[{label:"Mandanten",href:"/mandanten"},{label:"Rechnungswesenaufgaben",href:"/monatschecklisten"},{label:"Jahresabschlussaufgaben",href:"/jahresabschluesse"}]:[]),
    ...(hasPayrollAccess?[{label:payrollOnly?"Meine Abstimmungen":"FiBu-Lohn-Abstimmung",href:"/fibu-lohn"},{label:"Offene Lohnrückfragen",href:"/fibu-lohn#rueckfragen"},{label:"Fahrzeuge",href:"/fibu-lohn/fahrzeuge"}]:[]),
    ...(canManagePayrollTopics?[{label:"FiBu-Lohn-Themen",href:"/fibu-lohn/themen"}]:[]),
    ...(canStandards?[{label:"Standardaufgaben",href:"/standardaufgaben"}]:[]),
    ...(canUsers?[{label:"Benutzerverwaltung",href:"/administration/benutzer"},{label:"Testdaten-Diagnose",href:"/administration/diagnose"}]:[])
  ];
  const roleDisplay=user?formatRoleDisplay(user.roles):null;
  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
      <ToastMessage key={queryMessage?.message} message={queryMessage?.message} type={queryMessage?.type}/>
      <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col md:flex-row">
        <aside className="border-b border-[var(--color-primary-dark)] bg-[var(--color-primary-dark)] text-white md:w-64 md:flex-none md:border-b-0 md:border-r">
          <div className="border-b border-white/15 px-5 py-6">
            <div className="flex items-center gap-3">
              <div aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/35 bg-white/10 text-base font-bold tracking-wide shadow-inner">OC</div>
              <div className="min-w-0"><p className="truncate text-xl font-semibold tracking-tight">Ordo Caroli</p><p className="mt-0.5 text-xs leading-5 text-white/75">Rechnungswesen-Workflow</p></div>
            </div>
            <p className="mt-4 pl-[3.75rem] text-[10px] uppercase tracking-[0.18em] text-white/55">für Concilium</p>
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
                      : entry.href === "/jahresabschluesse"
                        ? pathname.startsWith("/jahresabschluesse")
                      : entry.href === "/standardaufgaben"
                        ? pathname.startsWith("/standardaufgaben")
                      : entry.href.startsWith("/fibu-lohn")
                        ? pathname.startsWith(entry.href.split("#")[0])
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
          {user&&roleDisplay&&<div className="mt-auto border-t border-white/15 p-4 text-sm"><p className="font-semibold">{user.fullName}</p><div className="mt-2 flex flex-wrap gap-1">{roleDisplay.professional.map(role=><span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px]" key={role}>{role}</span>)}{roleDisplay.technical.map(role=><span className="rounded-full border border-white/30 px-2 py-0.5 text-[11px]" key={role}>{role}</span>)}</div>{roleDisplay.additional.length>0&&<p className="mt-2 line-clamp-2 text-[11px] leading-4 text-white/60" title={roleDisplay.additional.join(" · ")}>{roleDisplay.additional.join(" · ")}</p>}<Link href="/passwort-aendern" className="mb-2 mt-3 block text-xs underline">Passwort ändern</Link><form action={logoutAction}><button className="rounded border border-white/30 px-3 py-2 text-xs hover:bg-white/10">Abmelden</button></form></div>}
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
