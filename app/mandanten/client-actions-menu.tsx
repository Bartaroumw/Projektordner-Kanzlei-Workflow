"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type ClientMenuAction={label:string;href:string};

export function ClientActionsMenu({clientNumber,actions}:{clientNumber:string;actions:ClientMenuAction[]}){
  const [open,setOpen]=useState(false);
  const container=useRef<HTMLDivElement>(null);
  const firstLink=useRef<HTMLAnchorElement>(null);
  useEffect(()=>{
    if(!open)return;
    firstLink.current?.focus();
    const close=(event:MouseEvent)=>{if(!container.current?.contains(event.target as Node))setOpen(false)};
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){setOpen(false);container.current?.querySelector("button")?.focus()}};
    document.addEventListener("mousedown",close);
    document.addEventListener("keydown",escape);
    return()=>{document.removeEventListener("mousedown",close);document.removeEventListener("keydown",escape)};
  },[open]);
  return <div ref={container} className="relative" onClick={event=>event.stopPropagation()} onKeyDown={event=>event.stopPropagation()}>
    <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded border border-[var(--color-border)] bg-white text-xl font-bold text-[var(--color-primary-dark)] hover:bg-[var(--color-primary-light)]" aria-label={`Aktionen für Mandant ${clientNumber} öffnen`} aria-haspopup="menu" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>⋮</button>
    {open&&<div role="menu" className="absolute right-0 z-30 mt-1 w-72 rounded-md border border-[var(--color-border)] bg-white p-1 shadow-lg">
      {actions.map((action,index)=><Link ref={index===0?firstLink:undefined} role="menuitem" className="block rounded px-3 py-2 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-primary-light)] focus:bg-[var(--color-primary-light)]" href={action.href} key={action.label} onClick={()=>setOpen(false)}>{action.label}</Link>)}
    </div>}
  </div>;
}
