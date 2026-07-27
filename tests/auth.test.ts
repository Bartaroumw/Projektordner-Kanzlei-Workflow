import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { authenticate, createSession, getSessionUser } from "@/lib/auth-service";
import { hashPassword, verifyPassword } from "@/lib/password";
import { canManageStandardTasks, canProcessPeriod, canReviewPeriod, type AuthUser } from "@/lib/permissions";
import { createUser, resetPassword, updateUser } from "@/lib/user-service";

const employee=(id:number):AuthUser=>({id,fullName:"Maria Muster",username:"maria",active:true,mustChangePassword:false,roles:["MITARBEITER"]});
const reviewer=(id:number):AuthUser=>({id,fullName:"Paul Prüfung",username:"paul",active:true,mustChangePassword:false,roles:["PRUEFER"]});

describe("lokale Authentifizierung und Berechtigungen",()=>{
  beforeEach(async()=>{await prisma.session.deleteMany();await prisma.userRole.deleteMany();await prisma.user.deleteMany();});
  it("hashes passwords and authenticates valid credentials",async()=>{
    const passwordHash=await hashPassword("Kuenstlich-2026!");
    expect(passwordHash).not.toContain("Kuenstlich-2026!");
    await prisma.user.create({data:{fullName:"Maria Muster",username:"maria",passwordHash,mustChangePassword:false,roles:{create:{role:"MITARBEITER"}}}});
    expect(await authenticate("maria","Kuenstlich-2026!")).toMatchObject({fullName:"Maria Muster"});
    expect(await authenticate("maria","falsch")).toBeNull();
  });
  it("rejects inactive users and invalidates their session",async()=>{
    const user=await createUser({fullName:"Inaktive Testperson",username:"inaktiv",password:"Kuenstlich-2026!",roles:["MITARBEITER"]});
    await prisma.user.update({where:{id:user.id},data:{mustChangePassword:false}});
    const {token}=await createSession(user.id);expect(await getSessionUser(token)).not.toBeNull();
    await updateUser(user.id,{fullName:user.fullName,active:false,roles:["MITARBEITER"]});
    expect(await authenticate("inaktiv","Kuenstlich-2026!")).toBeNull();
    expect(await getSessionUser(token)).toBeNull();
    expect(await prisma.user.findUnique({where:{id:user.id}})).not.toBeNull();
  });
  it("enforces assignment and four-eyes separation",()=>{
    const period={processorUserId:1,reviewerUserId:2,managementUserId:3};
    expect(canProcessPeriod(employee(1),period)).toBe(true);
    expect(canProcessPeriod(employee(4),period)).toBe(false);
    expect(canReviewPeriod(reviewer(2),period)).toBe(true);
    expect(canReviewPeriod(reviewer(1),period)).toBe(false);
    expect(canReviewPeriod(reviewer(4),period)).toBe(false);
  });
  it("does not grant professional approval to a pure administrator",()=>{
    const admin:AuthUser={id:9,fullName:"Anton Administration",username:"anton",active:true,mustChangePassword:false,roles:["ADMINISTRATOR"]};
    expect(canReviewPeriod(admin,{processorUserId:1,reviewerUserId:9,managementUserId:null})).toBe(false);
    expect(canManageStandardTasks(admin)).toBe(false);
  });
  it("forces password change after an administrative reset",async()=>{
    const user=await createUser({fullName:"Reset Test",username:"reset",password:"Kuenstlich-2026!",roles:["MITARBEITER"]});
    await resetPassword(user.id,"Neu-Kuenstlich-2026!");
    const stored=await prisma.user.findUniqueOrThrow({where:{id:user.id}});
    expect(stored.mustChangePassword).toBe(true);
    expect(await verifyPassword("Neu-Kuenstlich-2026!",stored.passwordHash)).toBe(true);
  });
});
