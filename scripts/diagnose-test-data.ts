import { prisma } from "../lib/prisma.ts";
import { seedDiagnostics } from "../lib/seed-consistency.ts";
console.log(JSON.stringify(await seedDiagnostics(prisma),null,2));
await prisma.$disconnect();
