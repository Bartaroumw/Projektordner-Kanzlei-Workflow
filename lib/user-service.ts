import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { ROLES, type Role } from "@/lib/permissions";

export class UserError extends Error {}
function rolesOf(values:string[]):Role[]{
  const unique=[...new Set(values)];
  if(unique.some(role=>!ROLES.includes(role as Role)))throw new UserError("Mindestens eine gültige Rolle ist erforderlich.");
  if(!unique.length)throw new UserError("Mindestens eine Rolle ist erforderlich.");
  return unique as Role[];
}
export async function createUser(input:{fullName:string;username:string;email?:string;shortLabel?:string;password:string;roles:string[]}){
  const fullName=input.fullName.trim(),username=input.username.trim().toLocaleLowerCase("de-DE");
  if(!fullName||!username)throw new UserError("Name und Benutzername sind erforderlich.");
  const passwordHash=await hashPassword(input.password);const roles=rolesOf(input.roles);
  return prisma.user.create({data:{fullName,username,email:input.email?.trim()||null,shortLabel:input.shortLabel?.trim()||null,passwordHash,mustChangePassword:true,roles:{create:roles.map(role=>({role}))}}});
}
export async function updateUser(id:number,input:{fullName:string;email?:string;shortLabel?:string;active:boolean;roles:string[]}){
  const roles=rolesOf(input.roles);if(!input.fullName.trim())throw new UserError("Der vollständige Name ist erforderlich.");
  return prisma.$transaction(async tx=>{
    await tx.userRole.deleteMany({where:{userId:id}});
    const user=await tx.user.update({where:{id},data:{fullName:input.fullName.trim(),email:input.email?.trim()||null,shortLabel:input.shortLabel?.trim()||null,active:input.active,sessionVersion:{increment:input.active?0:1},roles:{create:roles.map(role=>({role}))}}});
    if(!input.active)await tx.session.deleteMany({where:{userId:id}});
    return user;
  });
}
export async function resetPassword(id:number,password:string){
  const passwordHash=await hashPassword(password);
  await prisma.$transaction([prisma.user.update({where:{id},data:{passwordHash,mustChangePassword:true,passwordChangedAt:new Date(),sessionVersion:{increment:1}}}),prisma.session.deleteMany({where:{userId:id}})]);
}
