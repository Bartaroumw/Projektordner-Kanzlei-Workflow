import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
const KEY_LENGTH = 64;
function scrypt(password:string|Buffer,salt:Buffer,length:number,options:{N:number;r:number;p:number}){
  return new Promise<Buffer>((resolve,reject)=>nodeScrypt(password,salt,length,options,(error,key)=>error?reject(error):resolve(key)));
}

export function validatePassword(password: string) {
  if (password.length < 12) throw new Error("Das Passwort muss mindestens 12 Zeichen lang sein.");
  if (password.length > 200) throw new Error("Das Passwort ist zu lang.");
}

export async function hashPassword(password: string) {
  validatePassword(password);
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  try {
    const [algorithm, n, r, p, salt64, hash64] = stored.split("$");
    if (algorithm !== "scrypt" || !salt64 || !hash64) return false;
    const expected = Buffer.from(hash64, "base64");
    const actual = await scrypt(password, Buffer.from(salt64, "base64"), expected.length, {
      N: Number(n), r: Number(r), p: Number(p),
    });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
