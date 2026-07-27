import {describe,expect,it} from "vitest";
import {validateSeedReport} from "@/lib/seed-consistency";

const valid={activeUsers:5,clients:4,clientsWithoutProcessor:0,clientsWithoutReviewer:0,clientsWithoutManagement:0,periods:6,activePeriods:3,periodsWithoutUserReferences:0,orphanedUserReferences:0,clientsWithMultipleActivePeriods:0,activePeriodsWithoutTasks:0,inactiveAssignments:0};
describe("Seed-Konsistenzprüfung",()=>{
  it("akzeptiert den konsistenten künstlichen Ausgangszustand",()=>expect(validateSeedReport(valid)).toEqual(valid));
  it("erkennt fehlenden Bearbeiter",()=>expect(()=>validateSeedReport({...valid,clientsWithoutProcessor:1})).toThrow("Mandant ohne Bearbeiter"));
  it("erkennt mehrere aktive Checklisten",()=>expect(()=>validateSeedReport({...valid,clientsWithMultipleActivePeriods:1})).toThrow("mehr als eine aktive Checkliste"));
  it("erkennt aktive Checkliste ohne Aufgaben",()=>expect(()=>validateSeedReport({...valid,activePeriodsWithoutTasks:1})).toThrow("aktive Checkliste ohne Aufgaben"));
});
