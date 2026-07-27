import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth-service";
import { hasRole, type Role } from "@/lib/permissions";

export async function currentUser() {
  return getSessionUser((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/anmelden");
  if (user.mustChangePassword) redirect("/passwort-aendern?erforderlich=1");
  return user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!hasRole(user, ...roles)) throw new Error("Sie sind für diese Aktion nicht berechtigt.");
  return user;
}
