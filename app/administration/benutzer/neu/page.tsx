import {requireRole}from "@/lib/auth";import {UserForm}from "../user-form";import {createUserAction}from "../actions";
export default async function NewUser(){await requireRole("ADMINISTRATOR");return <><h1 className="text-3xl font-semibold">Benutzer anlegen</h1><p className="mt-2 text-sm">Das temporäre Passwort muss beim ersten Login geändert werden.</p><UserForm action={createUserAction}/></>}
