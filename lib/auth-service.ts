import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import type { AuthUser, Role } from "@/lib/permissions";

export const SESSION_COOKIE = "ordo_session";
export const SESSION_SECONDS = 8 * 60 * 60;
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

function mapUser(user: { id:number; fullName:string; username:string; active:boolean; mustChangePassword:boolean; roles:{role:string}[]; profileImage?:{id:number}|null }): AuthUser {
  return { id:user.id, fullName:user.fullName, username:user.username, active:user.active,
    mustChangePassword:user.mustChangePassword, hasProfileImage:Boolean(user.profileImage), roles:user.roles.map((entry)=>entry.role as Role) };
}

export async function authenticate(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username: username.trim().toLocaleLowerCase("de-DE") }, include: { roles:true, profileImage:{select:{id:true}} } });
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) return null;
  await prisma.user.update({ where:{id:user.id}, data:{lastLoginAt:new Date()} });
  return mapUser(user);
}

export async function createSession(userId: number) {
  const user = await prisma.user.findUniqueOrThrow({ where:{id:userId} });
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  await prisma.session.create({ data:{tokenHash:tokenHash(token), userId, sessionVersion:user.sessionVersion, expiresAt} });
  return { token, expiresAt };
}

export async function getSessionUser(token: string | undefined | null) {
  if (!token) return null;
  const session = await prisma.session.findUnique({ where:{tokenHash:tokenHash(token)}, include:{user:{include:{roles:true,profileImage:{select:{id:true}}}}} });
  if (!session || session.expiresAt <= new Date() || !session.user.active || session.sessionVersion !== session.user.sessionVersion) {
    if (session) await prisma.session.delete({where:{id:session.id}}).catch(()=>undefined);
    return null;
  }
  return mapUser(session.user);
}

export async function destroySession(token: string | undefined | null) {
  if (token) await prisma.session.deleteMany({where:{tokenHash:tokenHash(token)}});
}

export async function invalidateOtherSessions(userId: number) {
  await prisma.user.update({where:{id:userId},data:{sessionVersion:{increment:1}}});
  await prisma.session.deleteMany({where:{userId}});
}
