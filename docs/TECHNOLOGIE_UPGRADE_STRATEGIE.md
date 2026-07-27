# Technologie-Upgrade-Strategie

## Geprüfter Stand

- Node.js 24.18.0 LTS
- npm 11.16.0
- Next.js 16.2.12
- React 19.2.4
- Prisma/Prisma Client 6.19.3
- TypeScript 5.9.3

## Bewertung

Node.js 24 ist laut offizieller Node.js-Übersicht eine LTS-Linie und damit grundsätzlich die richtige Basis. Next.js 16 verlangt mindestens Node.js 20.9. Prisma dokumentiert für die aktuelle Hauptversion Unterstützung von Node.js 24; die Dokumentation für Prisma 6 nennt ältere Mindestlinien und ist für Node 24 weniger eindeutig. Der aktuelle Build und Testbestand funktionieren, dennoch soll die Kombination als bewusst getestete Projektmatrix festgeschrieben werden.

Quellen:

- [Node.js Releases](https://nodejs.org/en/about/previous-releases)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Prisma System Requirements](https://www.prisma.io/docs/orm/reference/system-requirements)
- [Prisma 7 Upgrade Guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)

## Strategie

1. Keine Framework-Upgrades zusammen mit einem Fachmodul.
2. Node-Major, Next-Major und Prisma-Major jeweils getrennt aktualisieren.
3. Vor jedem Upgrade frische Migration, bestehende Datenkopie, Seed, Tests und Build prüfen.
4. Node-LTS-Version über `engines`, Entwicklerdokumentation und spätere CI festschreiben.
5. Sicherheits-Patches zeitnah, Minor-Versionen gebündelt, Major-Versionen als eigenes Vorhaben.

## Prisma

`package.json#prisma` ist laut CLI veraltet und entfällt mit Prisma 7. Vor Prisma 7:

- `prisma.config.ts` einführen,
- Seed- und Migrationsbefehle explizit testen,
- Driver-Adapter- und Connection-Pool-Änderungen bewerten,
- PostgreSQL-Strategie möglichst vorher entscheiden.

Prisma 7 soll nicht gleichzeitig mit der ersten PostgreSQL-Datenmigration eingeführt werden.

## Bekannte Sicherheitshinweise

README dokumentiert zuletzt drei hoch eingestufte Pakete: Next.js direkt sowie PostCSS und Sharp/libvips indirekt/optional. Eine aktuelle `npm audit --omit=dev`-Abfrage scheiterte am 27.07.2026 am Registry-Endpunkt; deshalb wurde kein neuer Status behauptet. Kein `npm audit fix --force`.

## Empfohlene Reihenfolge

1. Migrationsbaseline stabilisieren.
2. Aktuelle Patchstände und Advisories in separatem Wartungsfenster prüfen.
3. `prisma.config.ts` ohne Major-Upgrade vorbereiten.
4. PostgreSQL-Prototyp mit der bestehenden Prisma-Hauptversion.
5. Erst danach Prisma-Major-Upgrade.

