"use client";

import { useFormStatus } from "react-dom";

export function UploadSubmitButton() {
  const { pending } = useFormStatus();
  return <button className="button-primary self-end" disabled={pending}>
    {pending ? "Datei wird gespeichert …" : "Datei hochladen"}
  </button>;
}
