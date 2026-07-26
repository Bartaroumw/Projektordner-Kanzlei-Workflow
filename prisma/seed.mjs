import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const clients = [
  {
    clientNumber: "10001",
    name: "Musterpraxis Beispiel",
    processor: "MA",
    reviewer: "PR",
    team: "Rechnungswesen 1",
    cadence: "monatlich",
    profile: {
      calendarYear: 2026,
      legalFormGroup: "Einzelunternehmen",
      profitDeterminationMethod: "Einnahmenüberschussrechnung",
    },
  },
  {
    clientNumber: "10002",
    name: "Beispiel Verwaltungs GmbH",
    processor: "MB",
    reviewer: "PS",
    team: "Rechnungswesen 2",
    cadence: "monatlich",
    profile: {
      calendarYear: 2026,
      legalFormGroup: "Kapitalgesellschaft",
      profitDeterminationMethod: "Bilanzierung",
    },
  },
  {
    clientNumber: "10003",
    name: "Mustermann Besitz GbR",
    processor: "MA",
    reviewer: "PS",
    team: "Rechnungswesen 1",
    cadence: "vierteljährlich",
    profile: {
      calendarYear: 2026,
      legalFormGroup: "Personengesellschaft",
      profitDeterminationMethod: "Bilanzierung",
    },
  },
];

for (const entry of clients) {
  const { profile, ...clientData } = entry;
  await prisma.client.upsert({
    where: { clientNumber: clientData.clientNumber },
    update: {
      ...clientData,
      active: true,
    },
    create: {
      ...clientData,
      active: true,
      annualProfiles: { create: profile },
    },
  });
}

await prisma.$disconnect();
console.log("Künstliche Testdaten wurden erfolgreich angelegt.");
