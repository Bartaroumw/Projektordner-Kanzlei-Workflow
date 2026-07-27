"use client";
import {useActionState} from "react";
import {changeOwnPasswordAction,type PasswordState} from "./actions";
export function PasswordForm(){const[state,action,pending]=useActionState<PasswordState,FormData>(changeOwnPasswordAction,{});
return <form action={action} className="mt-5 max-w-lg space-y-4">{state.error&&<div role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{state.error}</div>}
<label className="block text-sm font-semibold">Aktuelles Passwort<input className="input mt-1" type="password" name="currentPassword" required/></label>
<label className="block text-sm font-semibold">Neues Passwort<input className="input mt-1" type="password" name="newPassword" minLength={12} required/></label>
<label className="block text-sm font-semibold">Neues Passwort wiederholen<input className="input mt-1" type="password" name="confirmation" minLength={12} required/></label>
<button className="button-primary" disabled={pending}>Passwort ändern</button></form>}
