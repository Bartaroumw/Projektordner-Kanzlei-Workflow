import { readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "../lib/prisma.ts";

if(process.env.DATABASE_URL!=="file:./fibu-lohn-acceptance.db")throw new Error("SCHUTZABBRUCH: Mutation nur für den FiBu-Lohn-Abnahmebestand.");
const storageRoot=resolve(process.env.FIBU_LOHN_STORAGE_DIR??"");
if(!storageRoot.replaceAll("\\","/").endsWith("/tmp/fibu-lohn-acceptance-storage"))throw new Error("SCHUTZABBRUCH: Falscher Abnahmespeicher.");
await prisma.client.update({where:{clientNumber:"92005"},data:{name:"Künstlich veränderter Wiederherstellungstest"}});
const file=(await readdir(storageRoot,{recursive:true,withFileTypes:true})).find(entry=>entry.isFile());
if(!file)throw new Error("Für den Wiederherstellungstest wurde kein künstlicher Beleg gefunden.");
await writeFile(resolve(storageRoot,file.name),new TextEncoder().encode("Künstlich veränderter Dateiinhalt"));
await prisma.$disconnect();
