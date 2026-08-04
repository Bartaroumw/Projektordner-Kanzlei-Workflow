export const FIBU_LOHN_START_TOPICS = [
  {
    key: "ARBEITNEHMER_VORTEILE",
    title: "Arbeitnehmerbezogene Geschenke, Aufmerksamkeiten, Sachbezüge und Betriebsveranstaltungen",
    shortDescription: "Geschenke, Gutscheine, Sachbezüge, Betriebsveranstaltungen und sonstige lohnrelevante Vorteile.",
    reviewQuestion: "Gab es arbeitnehmerbezogene Vorteile oder Betriebsveranstaltungen, die an Lohn zu übergeben sind?",
    requiredStandardFields: ["Art des Sachverhalts", "Betroffene Arbeitnehmer oder Personengruppe", "Datum oder Zeitraum", "Beschreibung", "Abrechnungsmonat"],
    requiredDocumentTypes: ["Beleg oder Teilnehmerliste"],
    vehicleRelated: false,
    followUpAllowed: false,
    collectionAllowed: true,
  },
  {
    key: "REISEKOSTEN",
    title: "Steuerfreie Reisekostenerstattungen",
    shortDescription: "Fahrtkosten, Verpflegungsmehraufwendungen, Übernachtungskosten und weitere Reisekostenerstattungen.",
    reviewQuestion: "Wurden Reisekosten an Arbeitnehmer oder angestellte Gesellschafter-Geschäftsführer erstattet?",
    requiredStandardFields: ["Arbeitnehmer", "Reisezeitraum", "Art der Erstattung", "Zahlungsweg", "Abrechnungsmonat", "Beschreibung"],
    requiredDocumentTypes: ["Reisekostenabrechnung", "Zahlungs- oder Buchungsbeleg"],
    vehicleRelated: false,
    followUpAllowed: false,
    collectionAllowed: true,
  },
  {
    key: "FAHRZEUGE",
    title: "Firmenfahrzeuge, Pkw, E-Bike und Fahrrad",
    shortDescription: "Neue, geänderte oder beendete Fahrzeugüberlassungen und Änderungen der Versteuerungsmethode.",
    reviewQuestion: "Gab es Änderungen im dauerhaften Fahrzeugbestand mit möglicher Lohnrelevanz?",
    requiredStandardFields: ["Art der Änderung", "Fahrzeugbezug", "Nutzer", "Gültig-ab-Datum", "Beschreibung"],
    requiredDocumentTypes: ["Fahrzeugbeleg oder Vertrag"],
    vehicleRelated: true,
    followUpAllowed: false,
    collectionAllowed: false,
  },
  {
    key: "SCHEINSELBSTSTAENDIGKEIT",
    title: "Scheinselbstständigkeit und mögliche abhängige Beschäftigung",
    shortDescription: "Auffällige Fremdleistungen werden ohne automatische rechtliche Bewertung an Lohn übergeben.",
    reviewQuestion: "Gab es Auffälligkeiten bei Fremdleistungen, die auf eine mögliche abhängige Beschäftigung hindeuten?",
    requiredStandardFields: ["Betroffene Person oder Unternehmen", "Leistungsart", "Zeitraum", "Auffällige Merkmale", "Beschreibung"],
    requiredDocumentTypes: ["Rechnung oder relevanter Beleg"],
    vehicleRelated: false,
    followUpAllowed: false,
    collectionAllowed: false,
  },
  {
    key: "GESCHENKE_NICHTARBEITNEHMER",
    title: "Geschenke an Nichtarbeitnehmer",
    shortDescription: "Geschenke an Geschäftspartner und mögliche Pauschalversteuerung.",
    reviewQuestion: "Gab es Geschenke an Nichtarbeitnehmer, die lohnsteuerlich weiterbearbeitet werden müssen?",
    requiredStandardFields: ["Empfänger oder Empfängergruppe", "Art des Geschenks", "Datum", "Beschreibung", "Hinweis zur möglichen Pauschalversteuerung"],
    requiredDocumentTypes: ["Empfänger- oder Geschenkeliste", "Buchungsbeleg"],
    vehicleRelated: false,
    followUpAllowed: false,
    collectionAllowed: true,
  },
  {
    key: "KSK",
    title: "Künstlersozialkasse",
    shortDescription: "Laufende Sammlung relevanter künstlerischer oder publizistischer Leistungen.",
    reviewQuestion: "Gab es KSK-relevante Eingangsrechnungen oder Leistungen?",
    requiredStandardFields: ["Auftragnehmer oder Rechnungsteller", "Leistungsart", "Rechnungsdatum", "Rechnungsbetrag", "Relevanter Zeitraum", "Beschreibung", "Kennzeichnung Jahresmeldung"],
    requiredDocumentTypes: ["Rechnung oder Beleg"],
    vehicleRelated: false,
    followUpAllowed: true,
    collectionAllowed: true,
  },
] as const;

export const FIBU_LOHN_TOPIC_STATUS = "Aktiv";
export const FIBU_LOHN_TOPIC_VALID_FROM = "2026-01-01T00:00:00.000Z";
export const FIBU_LOHN_TOPIC_TYPE = "Monatliche QM-Abstimmung";
export const FIBU_LOHN_CAMPUS_KNOWLEDGE_KEY = "FIBU_LOHN_ABSTIMMUNG";

export function fibuLohnTopicNotes(followUpAllowed: boolean) {
  return followUpAllowed
    ? "Eine dokumentierte Nachreichung ist fachlich zulässig."
    : "Erforderliche Belege müssen vor der vollständigen Übergabe vorliegen.";
}

export const FIBU_LOHN_COLLECTION_TOPIC_KEYS = FIBU_LOHN_START_TOPICS
  .filter((topic) => topic.collectionAllowed)
  .map((topic) => topic.key);
