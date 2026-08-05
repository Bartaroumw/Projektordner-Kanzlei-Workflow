"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { UserAvatar } from "@/app/components/user-avatar";
import { ROLES } from "@/lib/permissions";
import { PROFILE_IMAGE_ACCEPT, PROFILE_IMAGE_MAX_BYTES } from "@/lib/profile-image-rules";
import { ROLE_LABELS } from "@/lib/user-role-display";

type EditableUser = {
  id: number;
  fullName: string;
  username: string;
  email: string | null;
  shortLabel: string | null;
  active: boolean;
  roles: { role: string }[];
  profileImage?: { id: number } | null;
};

export function UserForm({ action, user }: { action: (data: FormData) => void | Promise<void>; user?: EditableUser }) {
  const assigned = new Set(user?.roles.map((role) => role.role));
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [removeImage, setRemoveImage] = useState(false);
  const [imageError, setImageError] = useState<string>();
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function selectImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(undefined);
    setImageError(undefined);
    if (!file) return;
    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      event.target.value = "";
      setImageError("Das Profilbild darf maximal 5 MB groß sein.");
      return;
    }
    setRemoveImage(false);
    setPreviewUrl(URL.createObjectURL(file));
  }

  const showExisting = Boolean(user?.profileImage) && !removeImage && !previewUrl;
  return <form action={action} className="mt-6 grid max-w-3xl gap-4 rounded-lg border bg-white p-6 md:grid-cols-2">
    <label className="text-sm font-semibold">Vollständiger Name<input className="input mt-1" name="fullName" defaultValue={user?.fullName} required/></label>
    <label className="text-sm font-semibold">Benutzername<input className="input mt-1" name="username" defaultValue={user?.username} disabled={Boolean(user)} required={!user}/></label>
    <label className="text-sm font-semibold">Dienstliche E-Mail (optional)<input className="input mt-1" type="email" name="email" defaultValue={user?.email ?? ""}/></label>
    <label className="text-sm font-semibold">Kurzbezeichnung (optional)<input className="input mt-1" name="shortLabel" defaultValue={user?.shortLabel ?? ""}/></label>
    {!user && <><label className="text-sm font-semibold">Temporäres Passwort<input className="input mt-1" name="password" type="password" minLength={12} required/></label><div/></>}
    <fieldset className="md:col-span-2"><legend className="text-sm font-semibold">Rollen und Berechtigungen</legend><div className="mt-2 flex flex-wrap gap-4">{ROLES.map((role) => <label className="flex items-center gap-2 text-sm" key={role}><input type="checkbox" name="roles" value={role} defaultChecked={assigned.has(role)}/>{ROLE_LABELS[role]}</label>)}</div></fieldset>
    <fieldset className="md:col-span-2 rounded-lg border border-[var(--color-border)] p-4">
      <legend className="px-1 text-sm font-semibold">Profilbild (optional)</legend>
      <div className="flex flex-wrap items-center gap-4">
        {previewUrl
          ? <span className="relative h-20 w-20 overflow-hidden rounded-full"><Image src={previewUrl} alt="Vorschau des ausgewählten Profilbilds" fill unoptimized className="object-cover"/></span>
          : <UserAvatar userId={user?.id ?? 0} fullName={user?.fullName || "Neuer Benutzer"} hasImage={showExisting} size="lg"/>}
        <div className="min-w-64 flex-1">
          <input className="input" type="file" name="profileImage" accept={PROFILE_IMAGE_ACCEPT} onChange={selectImage}/>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">JPG, JPEG, PNG oder WebP bis 5 MB. Die Datei wird serverseitig vollständig geprüft.</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">Verwenden Sie ausschließlich ein für die interne Benutzeranzeige freigegebenes Profilbild.</p>
          {imageError && <p className="mt-2 text-sm font-semibold text-[var(--color-error)]">{imageError}</p>}
          {user?.profileImage && <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" name="removeProfileImage" checked={removeImage} onChange={(event) => { setRemoveImage(event.target.checked); if (event.target.checked) setPreviewUrl(undefined); }}/>Vorhandenes Profilbild entfernen</label>}
        </div>
      </div>
    </fieldset>
    {user && <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={user.active}/> Benutzer ist aktiv</label>}
    <div className="md:col-span-2"><button className="button-primary">Speichern</button></div>
  </form>;
}
