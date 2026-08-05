import Link from "next/link";
import { logoutAction } from "@/app/anmelden/actions";
import { UserAvatar } from "@/app/components/user-avatar";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { splitRoleDisplay } from "@/lib/user-role-display";

export default async function ProfilePage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    include: { roles: true, profileImage: { select: { id: true } } },
  });
  const display = splitRoleDisplay(user.roles.map((entry) => entry.role));
  return <div className="max-w-4xl">
    <header className="flex flex-wrap items-center gap-5">
      <UserAvatar userId={user.id} fullName={user.fullName} hasImage={Boolean(user.profileImage)} size="lg"/>
      <div><p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">Persönliches Konto</p><h1 className="mt-1 text-3xl font-bold">Profileinstellungen</h1><p className="mt-1 text-[var(--color-text-muted)]">Ihre Kontodaten und persönlichen Sicherheitseinstellungen.</p></div>
    </header>
    <section className="mt-7 rounded-lg border border-[var(--color-border)] bg-white p-6">
      <h2 className="text-xl font-semibold">Identität und Rollen</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <ProfileValue label="Name" value={user.fullName}/><ProfileValue label="Benutzername" value={user.username}/>
        <ProfileValue label="Dienstliche E-Mail" value={user.email ?? "Nicht hinterlegt"}/><ProfileValue label="Kurzbezeichnung" value={user.shortLabel ?? "Nicht hinterlegt"}/>
      </dl>
      <div className="mt-5"><h3 className="text-sm font-semibold">Hauptrollen</h3><div className="mt-2 flex flex-wrap gap-2">{display.main.map((role) => <span className="rounded-full bg-[var(--color-primary-light)] px-3 py-1 text-sm font-semibold text-[var(--color-primary-dark)]" key={role}>{role}</span>)}</div></div>
      <details className="mt-5 rounded border border-[var(--color-border)] p-4"><summary className="cursor-pointer font-semibold">Weitere Berechtigungen · {display.additional.length}</summary><p className="mt-3 text-sm text-[var(--color-text-muted)]">{display.additional.join(" · ") || "Keine weiteren Berechtigungen hinterlegt."}</p></details>
    </section>
    <section className="mt-6 rounded-lg border border-[var(--color-border)] bg-white p-6">
      <h2 className="text-xl font-semibold">Sicherheit</h2>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">Ihre Sitzung läuft lokal und endet nach längerer Inaktivität. Eine Passwortänderung beendet die übrigen Sitzungen.</p>
      <div className="mt-4 flex flex-wrap gap-3"><Link className="button-primary" href="/passwort-aendern">Passwort ändern</Link><form action={logoutAction}><button className="button-secondary">Abmelden</button></form></div>
      <dl className="mt-5 grid gap-4 border-t border-[var(--color-border)] pt-5 sm:grid-cols-2"><ProfileValue label="Konto angelegt" value={formatDateTime(user.createdAt)}/><ProfileValue label="Letzte Anmeldung" value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Noch nicht protokolliert"}/><ProfileValue label="Passwort zuletzt geändert" value={user.passwordChangedAt ? formatDateTime(user.passwordChangedAt) : "Noch nicht protokolliert"}/><ProfileValue label="Kontostatus" value={user.active ? "Aktiv" : "Inaktiv"}/></dl>
    </section>
  </div>;
}

function ProfileValue({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>;
}
