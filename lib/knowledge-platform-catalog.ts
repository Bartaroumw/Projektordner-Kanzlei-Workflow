export const KNOWLEDGE_CONTENT_STATUSES = ["Entwurf", "Aktiv", "Archiviert"] as const;
export const KNOWLEDGE_CONTENT_TYPES = [
  "Kanzleistandard",
  "Arbeitsanleitung",
  "Fachwissen",
  "Prüfungshinweis",
  "Lerninhalt",
  "Arbeitshilfe",
  "Externe Quelle",
] as const;
export const KNOWLEDGE_TARGET_AUDIENCES = [
  "BEARBEITER",
  "PRUEFER",
  "KANZLEILEITUNG",
  "LOHNSACHBEARBEITER",
  "ALLE",
] as const;
export const KNOWLEDGE_LINK_TYPES = [
  "Hauptanleitung",
  "Ergänzendes Wissen",
  "Kanzleistandard",
  "Prüfungshinweis",
  "Arbeitshilfe",
] as const;
export const KNOWLEDGE_NEW_DAYS = 60;
export function knowledgeNewSince(reference = new Date()) {
  return new Date(reference.getTime() - KNOWLEDGE_NEW_DAYS * 24 * 60 * 60 * 1000);
}

export type KnowledgeAreaSeed = {
  key: string;
  title: string;
  shortDescription: string;
  parentKey?: string;
  sortOrder: number;
};

export const KNOWLEDGE_AREAS: readonly KnowledgeAreaSeed[] = [
  { key: "RECHNUNGSWESEN", title: "Rechnungswesen", shortDescription: "Wissen für die laufende Finanzbuchhaltung.", sortOrder: 10 },
  { key: "REWE_GRUNDLAGEN", title: "Grundlagen", shortDescription: "Grundlagen der laufenden Bearbeitung.", parentKey: "RECHNUNGSWESEN", sortOrder: 11 },
  { key: "REWE_LAUFENDE_BEARBEITUNG", title: "Laufende Bearbeitung", shortDescription: "Wissen für die laufende Bearbeitung.", parentKey: "RECHNUNGSWESEN", sortOrder: 12 },
  { key: "REWE_BANK", title: "Bank und Zahlungsverkehr", shortDescription: "Bankkonten und Zahlungsverkehr abstimmen.", parentKey: "RECHNUNGSWESEN", sortOrder: 13 },
  { key: "REWE_KASSE", title: "Kasse", shortDescription: "Kassenführung und Kassenabstimmung.", parentKey: "RECHNUNGSWESEN", sortOrder: 14 },
  { key: "REWE_FORDERUNGEN", title: "Forderungen und Verbindlichkeiten", shortDescription: "Offene Posten nachvollziehbar abstimmen.", parentKey: "RECHNUNGSWESEN", sortOrder: 15 },
  { key: "REWE_ANLAGEN", title: "Anlagenbuchführung", shortDescription: "Anlagenbewegungen fachlich dokumentieren.", parentKey: "RECHNUNGSWESEN", sortOrder: 16 },
  { key: "REWE_DARLEHEN", title: "Darlehen und Finanzierung", shortDescription: "Darlehen und Finanzierungen abstimmen.", parentKey: "RECHNUNGSWESEN", sortOrder: 17 },
  { key: "REWE_UMSATZSTEUER", title: "Umsatzsteuer", shortDescription: "Umsatzsteuerliche Bearbeitung und Kontrollen.", parentKey: "RECHNUNGSWESEN", sortOrder: 18 },
  { key: "REWE_KONTENABSTIMMUNG", title: "Kontenabstimmung", shortDescription: "Konten systematisch abstimmen.", parentKey: "RECHNUNGSWESEN", sortOrder: 19 },
  { key: "REWE_JAHRESVORBEREITUNG", title: "Jahresvorbereitung", shortDescription: "Vorbereitung auf den Jahresabschluss.", parentKey: "RECHNUNGSWESEN", sortOrder: 20 },
  { key: "JAHRESABSCHLUSS", title: "Jahresabschluss", shortDescription: "Wissen für Vorbereitung, Erstellung und Prüfung.", sortOrder: 30 },
  { key: "JA_VORBEREITUNG", title: "Vorbereitende Tätigkeiten", shortDescription: "Den Jahresabschluss strukturiert vorbereiten.", parentKey: "JAHRESABSCHLUSS", sortOrder: 31 },
  { key: "JA_ABSCHLUSSBUCHUNGEN", title: "Abschlussbuchungen", shortDescription: "Abschlussbuchungen fachlich einordnen.", parentKey: "JAHRESABSCHLUSS", sortOrder: 32 },
  { key: "JA_BILANZPOSITIONEN", title: "Bilanzpositionen", shortDescription: "Bilanzpositionen abstimmen und dokumentieren.", parentKey: "JAHRESABSCHLUSS", sortOrder: 33 },
  { key: "JA_KONTONOTIZEN", title: "Kontonotizen", shortDescription: "Kontonotizen nachvollziehbar erstellen.", parentKey: "JAHRESABSCHLUSS", sortOrder: 34 },
  { key: "JA_PRUEFUNG", title: "Fachliche Prüfung", shortDescription: "Qualitätssicherung im Jahresabschluss.", parentKey: "JAHRESABSCHLUSS", sortOrder: 35 },
  { key: "JA_FREIGABE", title: "Freigabe und Offenlegung", shortDescription: "Freigabe und Offenlegung vorbereiten.", parentKey: "JAHRESABSCHLUSS", sortOrder: 36 },
  { key: "REWE_LOHN", title: "Rechnungswesen ↔ Lohn", shortDescription: "Wissen für die monatliche Abstimmung mit der Lohnabrechnung.", sortOrder: 40 },
  { key: "LOHN_VORTEILE", title: "Arbeitnehmerbezogene Vorteile", shortDescription: "Arbeitnehmerbezogene Vorteile erkennen.", parentKey: "REWE_LOHN", sortOrder: 41 },
  { key: "LOHN_REISEKOSTEN", title: "Reisekosten", shortDescription: "Steuerfreie Reisekostenerstattungen abstimmen.", parentKey: "REWE_LOHN", sortOrder: 42 },
  { key: "LOHN_FAHRZEUGE", title: "Fahrzeuge", shortDescription: "Firmenfahrzeuge, Pkw, E-Bike und Fahrrad.", parentKey: "REWE_LOHN", sortOrder: 43 },
  { key: "LOHN_SCHEINSELBSTAENDIGKEIT", title: "Scheinselbstständigkeit", shortDescription: "Mögliche abhängige Beschäftigung erkennen.", parentKey: "REWE_LOHN", sortOrder: 44 },
  { key: "LOHN_GESCHENKE", title: "Geschenke an Nichtarbeitnehmer", shortDescription: "Geschenke fachlich richtig einordnen.", parentKey: "REWE_LOHN", sortOrder: 45 },
  { key: "LOHN_KSK", title: "Künstlersozialkasse", shortDescription: "Künstlersozialabgabe prüfen.", parentKey: "REWE_LOHN", sortOrder: 46 },
  { key: "KANZLEISTANDARDS", title: "Kanzleistandards", shortDescription: "Verbindliche interne Vorgaben der Kanzlei.", sortOrder: 50 },
  { key: "STANDARD_SKR03", title: "SKR03", shortDescription: "Verbindliche Vorgaben zum Kontenrahmen.", parentKey: "KANZLEISTANDARDS", sortOrder: 51 },
  { key: "STANDARD_KONTONOTIZEN", title: "Kontonotizen", shortDescription: "Verbindliche Anforderungen an Kontonotizen.", parentKey: "KANZLEISTANDARDS", sortOrder: 52 },
  { key: "STANDARD_DOKUMENTATION", title: "Dokumentation", shortDescription: "Verbindliche Dokumentationsgrundsätze.", parentKey: "KANZLEISTANDARDS", sortOrder: 53 },
  { key: "STANDARD_BUCHUNGSTEXTE", title: "Buchungstexte", shortDescription: "Verbindliche Regeln für Buchungstexte.", parentKey: "KANZLEISTANDARDS", sortOrder: 54 },
  { key: "STANDARD_PRUEFUNGSNACHWEISE", title: "Prüfungsnachweise", shortDescription: "Verbindliche Prüfungsnachweise.", parentKey: "KANZLEISTANDARDS", sortOrder: 55 },
  { key: "STANDARD_ABLAGE", title: "Ablage und Verlinkung", shortDescription: "Verbindliche Ablage- und Verlinkungsregeln.", parentKey: "KANZLEISTANDARDS", sortOrder: 56 },
  { key: "BRANCHENWISSEN", title: "Branchenwissen", shortDescription: "Kanzleispezifisches Branchenwissen.", sortOrder: 60 },
  { key: "BRANCHE_AERZTE", title: "Ärzte", shortDescription: "Branchenwissen für Arztpraxen.", parentKey: "BRANCHENWISSEN", sortOrder: 61 },
  { key: "BRANCHE_ZAHNAERZTE", title: "Zahnärzte", shortDescription: "Branchenwissen für Zahnarztpraxen.", parentKey: "BRANCHENWISSEN", sortOrder: 62 },
  { key: "BRANCHE_MVZ", title: "MVZ", shortDescription: "Branchenwissen für medizinische Versorgungszentren.", parentKey: "BRANCHENWISSEN", sortOrder: 63 },
  { key: "DATEV_WERKZEUGE", title: "DATEV und Werkzeuge", shortDescription: "Hilfen zu Fachsoftware und internen Werkzeugen.", sortOrder: 70 },
  { key: "DATEV_HILFE", title: "DATEV Hilfe", shortDescription: "Verweise auf die DATEV-Hilfe.", parentKey: "DATEV_WERKZEUGE", sortOrder: 71 },
  { key: "DATEV_LERNPLATTFORM", title: "DATEV Lernplattform", shortDescription: "Verweise auf externe Lernangebote.", parentKey: "DATEV_WERKZEUGE", sortOrder: 72 },
  { key: "DATEV_UNTERNEHMEN_ONLINE", title: "Unternehmen online", shortDescription: "Arbeitshinweise zu Unternehmen online.", parentKey: "DATEV_WERKZEUGE", sortOrder: 73 },
  { key: "DATEV_REWE_PROGRAMME", title: "Rechnungswesenprogramme", shortDescription: "Arbeitshinweise zu Rechnungswesenprogrammen.", parentKey: "DATEV_WERKZEUGE", sortOrder: 74 },
  { key: "DATEV_INTERNE_ARBEITSHILFEN", title: "Interne Arbeitshilfen", shortDescription: "Kanzleieigene Arbeitshilfen.", parentKey: "DATEV_WERKZEUGE", sortOrder: 75 },
];

export const KNOWLEDGE_LEARNING_PATHS = [
  { key: "EINARBEITUNG_RECHNUNGSWESEN", title: "Einarbeitung Rechnungswesen", shortDescription: "Grundlagen für den sicheren Einstieg.", objective: "Die wichtigsten Kanzleistandards und Arbeitsschritte in sinnvoller Reihenfolge kennenlernen.", targetAudiences: "BEARBEITER", sortOrder: 10 },
  { key: "PRUEFUNG_QUALITAET", title: "Prüfung und Qualitätssicherung", shortDescription: "Prüfungsworkflow und Qualitätsgrundsätze.", objective: "Prüfungen nachvollziehbar und nach Kanzleistandard durchführen.", targetAudiences: "PRUEFER|KANZLEILEITUNG", sortOrder: 20 },
  { key: "REWE_LOHN_ABSTIMMUNG", title: "Rechnungswesen ↔ Lohn-Abstimmung", shortDescription: "Wissen zur monatlichen Schnittstelle.", objective: "Lohnsachverhalte vollständig und nachvollziehbar abstimmen.", targetAudiences: "BEARBEITER|LOHNSACHBEARBEITER|PRUEFER", sortOrder: 30 },
  { key: "JAHRESABSCHLUSS", title: "Jahresabschluss", shortDescription: "Vom vorbereiteten Bestand bis zur Freigabe.", objective: "Jahresabschlussarbeiten strukturiert vorbereiten und prüfen.", targetAudiences: "BEARBEITER|PRUEFER|KANZLEILEITUNG", sortOrder: 40 },
] as const;

export function splitKnowledgeValues(value: string) {
  return value.split("|").map((part) => part.trim()).filter(Boolean);
}

export function normalizeKnowledgeTag(value: string) {
  return value.trim().toLocaleLowerCase("de-DE").replace(/[^a-z0-9äöüß]+/g, "-").replace(/^-|-$/g, "");
}
