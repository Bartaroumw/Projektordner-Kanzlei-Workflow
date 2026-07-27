# Dokumentenarchitektur – Zielbild

## Bewertung der Campus-Ablage

Die Campus-Ablage ist für den lokalen Pilotbetrieb zweckmäßig:

- zufälliger Storage-Key,
- Pfadbegrenzung auf einen konfigurierten Ordner,
- erlaubte Typen und Signaturprüfung,
- Metadaten in Prisma,
- Archivierung statt fachlicher Löschung,
- Zugriffsprüfung beim Download.

Sie ist **kein** allgemeiner Dokumentendienst und keine geeignete Basis für eine Mandanten-Cloud.

## Grenzen

- lokales Dateisystem ist an einen Rechner gebunden,
- Datenbank und Dateien sind nicht atomar gemeinsam transaktional,
- keine Malwareprüfung,
- keine Verschlüsselung pro Dokument,
- keine Dokumentversionen,
- keine Aufbewahrungs- oder Löschklassen,
- keine Mandantentrennung im Speicher,
- keine quarantänisierte Uploadverarbeitung,
- keine hochverfügbare oder georedundante Speicherung.

## Zielbild

```text
FileObject
  id
  organizationId
  owningModule
  owningEntityId
  storageProvider
  storageKey
  originalName
  mediaType
  byteSize
  sha256
  classification
  retentionClass
  scanStatus
  createdBy
  createdAt
  archivedAt
```

Das Fachmodul entscheidet, wer eine Datei sehen darf. Der Speicherdienst entscheidet nur, wie sie sicher gespeichert, geprüft und ausgeliefert wird.

## Stufen

1. Campus lokal belassen und vollständiges gemeinsames Backup beibehalten.
2. Vor zentralem Mehrbenutzerbetrieb Prüfsumme, konsistente Backupprüfung und Dateireferenzvertrag ergänzen.
3. Vor Mandantenportal Objektdateispeicher, Malware-Scan, Quarantäne, Verschlüsselung, zeitlich begrenzte Downloads und strikte Mandantenscopes einführen.
4. Mandantendokumente nicht in den Campus-Ordner legen.

## Backup und Wiederherstellung

Bis zu einem Speicherwechsel bleiben SQLite-Datenbank und Campus-Ordner eine untrennbare Sicherungseinheit. Wiederherstellungstests müssen beide Bestandteile und ihre Referenzen prüfen.

