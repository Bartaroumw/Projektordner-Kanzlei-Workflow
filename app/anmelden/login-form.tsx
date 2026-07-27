"use client";
import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({next}:{next:string}) {
  const [state,action,pending]=useActionState<LoginState,FormData>(loginAction,{});
  return <form action={action} className="mt-6 space-y-4">
    <input type="hidden" name="weiter" value={next}/>
    {state.error&&<div role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{state.error}</div>}
    <label className="block text-sm font-semibold">Benutzername<input className="input mt-1" name="username" autoComplete="username" required autoFocus/></label>
    <label className="block text-sm font-semibold">Passwort<input className="input mt-1" name="password" type="password" autoComplete="current-password" required/></label>
    <button className="button-primary w-full" disabled={pending}>{pending?"Anmeldung wird geprüft …":"Anmelden"}</button>
  </form>;
}
