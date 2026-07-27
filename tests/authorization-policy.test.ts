import { describe, expect, it } from "vitest";
import { clientSchema } from "@/lib/validation";
import {
  canManageClients, canManageCustomTasks, canManageStandardTasks, canProcessPeriod, canReviewPeriod,
  canUseAdministrationException, canViewClient, type AuthUser,
} from "@/lib/permissions";

const user=(id:number,roles:AuthUser["roles"]):AuthUser=>({id,fullName:`Testperson ${id}`,username:`test${id}`,active:true,mustChangePassword:false,roles});
const assignment={processorUserId:1,reviewerUserId:2,managementUserId:3};

describe("serverseitige Rollenrichtlinie",()=>{
  it("Mitarbeiter bearbeitet nur die eigene Zuordnung",()=>{expect(canProcessPeriod(user(1,["MITARBEITER"]),assignment)).toBe(true);expect(canProcessPeriod(user(4,["MITARBEITER"]),assignment)).toBe(false);});
  it("Bearbeiter kann die eigene Checkliste nicht prüfen",()=>expect(canReviewPeriod(user(1,["PRUEFER"]),assignment)).toBe(false));
  it("zugeordneter Prüfer darf prüfen",()=>expect(canReviewPeriod(user(2,["PRUEFER"]),assignment)).toBe(true));
  it("nicht zugeordneter Prüfer wird abgelehnt",()=>expect(canReviewPeriod(user(4,["PRUEFER"]),assignment)).toBe(false));
  it("Kanzleileitung sieht alle Mandate",()=>expect(canViewClient(user(8,["KANZLEILEITUNG"]),assignment)).toBe(true));
  it("Kanzleileitung darf nur als unabhängige Person prüfen",()=>{expect(canReviewPeriod(user(3,["KANZLEILEITUNG"]),assignment)).toBe(true);expect(canReviewPeriod(user(1,["KANZLEILEITUNG"]),assignment)).toBe(false);});
  it("reiner Administrator darf keine administrative Fachausnahme",()=>expect(canUseAdministrationException(user(4,["ADMINISTRATOR"]))).toBe(false));
  it("Kanzleileitung darf begründete Fachausnahmen anstoßen",()=>expect(canUseAdministrationException(user(3,["KANZLEILEITUNG"]))).toBe(true));
  it("reiner Administrator darf Standardaufgaben nicht fachlich freigeben",()=>expect(canManageStandardTasks(user(4,["ADMINISTRATOR"]))).toBe(false));
  it("ausdrückliche Fachberechtigung schützt Standardaufgaben",()=>expect(canManageStandardTasks(user(5,["STANDARDAUFGABEN_VERWALTEN"]))).toBe(true));
  it("Mitarbeiter und Prüfer dürfen Mandanten verwalten",()=>{expect(canManageClients(user(1,["MITARBEITER"]))).toBe(true);expect(canManageClients(user(2,["PRUEFER"]))).toBe(true);});
  it("reiner technischer Administrator darf keine Mandanten verwalten",()=>expect(canManageClients(user(4,["ADMINISTRATOR"]))).toBe(false));
  it("Prüfer verwaltet mandantenspezifische Aufgaben, Mitarbeiter nicht",()=>{expect(canManageCustomTasks(user(2,["PRUEFER"]))).toBe(true);expect(canManageCustomTasks(user(1,["MITARBEITER"]))).toBe(false);});
  it("Prüfer darf ohne Zusatzrecht keine Standardaufgaben verwalten",()=>expect(canManageStandardTasks(user(2,["PRUEFER"]))).toBe(false));
  it("identische Bearbeiter- und Prüfer-ID wird in Stammdaten verhindert",()=>{
    const result=clientSchema.safeParse({clientNumber:"T-1",name:"Test",processor:null,reviewer:null,managementName:null,processorUserId:1,reviewerUserId:1,managementUserId:3,vatFilingPeriod:"Monatlich",active:true,internalNote:null});
    expect(result.success).toBe(false);
  });
});
