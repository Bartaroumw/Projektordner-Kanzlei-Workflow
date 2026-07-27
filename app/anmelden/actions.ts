"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authenticate, createSession, destroySession, SESSION_COOKIE, SESSION_SECONDS } from "@/lib/auth-service";

export type LoginState = { error?:string };

export async function loginAction(_state:LoginState, formData:FormData):Promise<LoginState> {
  const user = await authenticate(String(formData.get("username")??""), String(formData.get("password")??""));
  if (!user) return {error:"Benutzername oder Passwort ist nicht korrekt."};
  const session = await createSession(user.id);
  (await cookies()).set(SESSION_COOKIE, session.token, {
    httpOnly:true, sameSite:"lax", secure:process.env.NODE_ENV==="production",
    path:"/", maxAge:SESSION_SECONDS, expires:session.expiresAt, priority:"high",
  });
  if (user.mustChangePassword) redirect("/passwort-aendern?erforderlich=1");
  const target=String(formData.get("weiter")??"/");
  redirect(target.startsWith("/")&&!target.startsWith("//")?target:"/");
}

export async function logoutAction() {
  const store=await cookies();
  await destroySession(store.get(SESSION_COOKIE)?.value);
  store.delete(SESSION_COOKIE);
  redirect("/anmelden?abgemeldet=1");
}
