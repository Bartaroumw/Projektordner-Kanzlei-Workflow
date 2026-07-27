import {currentUser} from "@/lib/auth";import {redirect} from "next/navigation";import {PasswordForm} from "./password-form";
export default async function PasswordPage(){if(!await currentUser())redirect("/anmelden");return <><h1 className="text-3xl font-semibold">Passwort ändern</h1><p className="mt-2 text-sm">Das neue Passwort muss mindestens 12 Zeichen lang sein.</p><PasswordForm/></>}
