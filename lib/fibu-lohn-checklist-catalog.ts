export const FIBU_LOHN_CHECKLIST_CATEGORY = {
  name: "FiBu-Lohn-Abstimmung",
  description: "Künstliche Beispielkategorie FiBu-Lohn-Abstimmung.",
  sortOrder: 80,
  active: true,
} as const;

export const FIBU_LOHN_CHECKLIST_TASK = {
  taskId: "MON-FIBU-LOHN-001",
  active: true,
  checklistType: "Monat",
  title: "Monatliche FiBu-Lohn-Abstimmung",
  workInstruction:
    "Alle aktiven Abstimmungsthemen bewusst prüfen und vorhandene lohnrelevante Informationen vollständig an den zuständigen Lohnsachbearbeiter übergeben.",
  reviewInstruction:
    "Vollständigkeit der Themenentscheidungen, Pflichtangaben, Belege und Lohnzuständigkeit kontrollieren. Die Verarbeitung durch Lohn ist nicht Gegenstand der Rechnungswesenprüfung.",
  mandatory: true,
  rhythm: "Monatlich",
  executionMonths: "1;2;3;4;5;6;7;8;9;10;11;12",
  taskArea: "Laufende Bearbeitung",
  legalFormGroups: "Alle",
  profitDeterminationMethods: "Alle",
  cashCondition: "Alle",
  payrollCondition: "Ja",
  fixedAssetsCondition: "Alle",
  receivablesPayablesCondition: "Alle",
  loansCondition: "Alle",
  vatCondition: "Alle",
  permanentExtensionCondition: "Alle",
  knowledgeKey: "FIBU_LOHN_ABSTIMMUNG",
  sortOrder: 15,
  professionalVersion: "FIBU-LOHN-1.0",
  internalNote: "Ausschließlich künstliche Standardaufgabe für die FiBu-Lohn-Abstimmung.",
} as const;

export const FIBU_LOHN_CHECKLIST_KNOWLEDGE = {
  status: "Aktiv",
  shortDescription: "Monatliche strukturierte Übergabe lohnrelevanter Sachverhalte aus dem Rechnungswesen.",
  objective:
    "Vollständige und nachvollziehbare Information der Lohnabteilung, ohne einen Lohnabrechnungsworkflow abzubilden.",
  processingGuidance:
    "Alle sechs aktiven Themen bewusst prüfen. Vorhandene Sachverhalte strukturiert erfassen und erforderliche Belege geschützt bereitstellen.",
  firmStandard:
    "Die Informationspflicht des Rechnungswesens ist erfüllt, sobald alle Themen entschieden und vorhandene Sachverhalte vollständig an Lohn übergeben wurden.",
  reviewerGuidance:
    "Themensnapshots, Pflichtangaben, Belege und die Zuordnung des Lohnsachbearbeiters prüfen. Der spätere Lohnstatus blockiert die Monatscheckliste nicht.",
  typicalErrors:
    "Thema nicht bewusst geprüft\nPflichtangabe oder Beleg fehlt\nfalscher Lohnabrechnungsmonat gewählt",
  internalHints:
    "Künstlicher Campus-Inhalt. Kontenhinweise sind konfigurierbar und keine fest verdrahtete Programmlogik.",
} as const;
