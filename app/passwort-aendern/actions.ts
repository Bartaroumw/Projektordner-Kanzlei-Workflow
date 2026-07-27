"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, destroySession, SESSION_COOKIE, SESSION_SECONDS } from "@/lib/auth-service";

export type PasswordState={error?:string};
export async function changeOwnPasswordAction(_state:PasswordState,formData:FormData):Promise<PasswordState>{
  const user=await currentUser(); if(!user)return {error:"Ihre Sitzung ist abgelaufen."};
  const current=String(formData.get("currentPassword")??""), next=String(formData.get("newPassword")??""), confirmation=String(formData.get("confirmation")??"");
  if(next!==confirmation)return {error:"Die neuen Passwörter stimmen nicht überein."};
  const stored=await prisma.user.findUniqueOrThrow({where:{id:user.id}});
  if(!(await verifyPassword(current,stored.passwordHash)))return {error:"Das aktuelle Passwort ist nicht korrekt."};
  let passwordHash:string; try{passwordHash=await hashPassword(next);}catch(error){return{error:error instanceof Error?error.message:"Das Passwort ist ungültig."};}
  const store=await cookies(); await destroySession(store.get(SESSION_COOKIE)?.value);
  const updated=await prisma.user.update({where:{id:user.id},data:{passwordHash,passwordChangedAt:new Date(),mustChangePassword:false,sessionVersion:{increment:1}}});
  await prisma.session.deleteMany({where:{userId:user.id}});
  const session=await createSession(updated.id);
  store.set(SESSION_COOKIE,session.token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:SESSION_SECONDS});
  redirect("/?erfolg=passwort");
}
