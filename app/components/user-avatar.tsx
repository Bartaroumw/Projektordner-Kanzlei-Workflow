"use client";

import Image from "next/image";
import { useState } from "react";

const SIZES = {
  sm: { pixels: 32, className: "h-8 w-8 text-xs" },
  md: { pixels: 44, className: "h-11 w-11 text-sm" },
  lg: { pixels: 80, className: "h-20 w-20 text-xl" },
} as const;

export function UserAvatar({ userId, fullName, hasImage, size = "md" }: {
  userId: number;
  fullName: string;
  hasImage?: boolean;
  size?: keyof typeof SIZES;
}) {
  const [failedUserId, setFailedUserId] = useState<number>();
  const imageAvailable = Boolean(hasImage) && failedUserId !== userId;
  const initials = fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("de-DE") || "?";
  const definition = SIZES[size];
  return <span className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 font-bold ${definition.className}`}>
    {imageAvailable
      ? <Image
          src={`/api/profile-images/${userId}`}
          alt={`Profilbild von ${fullName}`}
          width={definition.pixels}
          height={definition.pixels}
          unoptimized
          className="h-full w-full object-cover"
          onError={() => setFailedUserId(userId)}
        />
      : <span aria-label={`Kein Profilbild für ${fullName}`}>{initials}</span>}
  </span>;
}
