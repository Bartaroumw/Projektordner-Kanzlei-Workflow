# Benutzerprofile und Profilbilder

Stand: 05.08.2026

## Persönliches Profil

Jeder angemeldete Benutzer erreicht unter `/profil` seine schreibgeschützten Identitätsdaten, Hauptrollen und Kontodaten. Hauptrollen erscheinen in der festen Reihenfolge **Kanzleileitung**, **Prüfer**, **Bearbeiter**, **Lohnsachbearbeiter**, **Administrator**. Zusatzberechtigungen stehen getrennt im standardmäßig geschlossenen Bereich **Weitere Berechtigungen**. Passwortänderung und Abmeldung bleiben persönliche Sicherheitsaktionen; eine Selbständerung von Name, Rollen oder Profilbild ist nicht vorgesehen.

## Administrative Pflege

Nur ein Benutzer mit der Rolle `ADMINISTRATOR` kann bei Anlage oder Bearbeitung eines lokalen Kontos ein optionales Profilbild hinterlegen, ersetzen oder entfernen. Zulässig sind JPG/JPEG, PNG und WebP bis 5 MB. Der Server prüft Dateiendung, MIME-Typ, Signatur und vollständige Dekodierbarkeit. Das Bild wird normalisiert und unter einem zufälligen technischen Namen gespeichert. Originaldateiname, Dateityp und Größe bleiben ausschließlich als Metadaten erhalten.

Hinzufügen, Ändern und Entfernen erzeugen einen Auditdatensatz ohne Bildinhalt. Beim Ersetzen wird zuerst die neue Datei geprüft und geschrieben, die alte Datei sicher zwischengelagert, danach die Datenbankreferenz transaktional umgestellt und abschließend die alte Datei entfernt. Bei einem Fehler wird der vorherige Zustand wiederhergestellt.

## Geschützte Auslieferung und Fallback

Dateien liegen unter `storage/profile-images` und niemals unter `public`. `/api/profile-images/[userId]` verlangt eine gültige lokale Sitzung und liefert Bilder nur für aktive Zielbenutzer aus. Die Antwort ist privat, nicht cachebar und verwendet `nosniff`; Speicherpfad und technischer Dateiname werden nicht ausgegeben. Fehlt ein Bild oder kann es nicht geladen werden, zeigt die gemeinsame Komponente `UserAvatar` automatisch Namensinitialen.

## Datenmodell und Migration

Migration 17 `20260805120000_user_profile_images` ergänzt die 1:1-Tabelle `UserProfileImage` und den Auditverlauf `UserProfileImageHistory`. Bestehende Benutzer, Rollen, Sitzungen und Fachdaten werden nicht umgebaut. Die Migration wurde aus allen Migrationen frisch in der Systemintegration und zusätzlich auf einer bytegenauen Kopie von `prisma/dev.db` geprüft.

## Backup

Ein vollständiges Backup umfasst gemeinsam:

1. SQLite-Datenbank,
2. `storage/ordo-campus`,
3. `storage/fibu-lohn`,
4. `storage/profile-images`,
5. lokale Umgebungskonfiguration.

Der Profilbildspeicher kann über `PROFILE_IMAGE_STORAGE_DIR` abweichend konfiguriert werden. Systemintegrationstests verwenden ausschließlich `tmp/system-integration-storage/profile-images`; automatisierte Tests verwenden ausschließlich `tmp/profile-images-test`.
