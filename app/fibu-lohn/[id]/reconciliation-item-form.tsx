"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { updatePayrollItemAction } from "@/app/fibu-lohn/actions";
import type { PayrollFormState } from "@/app/fibu-lohn/actions";

type ItemFormProps={
  itemId:number;
  topicKey:string;
  status:string;
  note:string|null;
  detailsJson:string|null;
  requiredFields:string[];
  requiredDocuments:string[];
  followUpAllowed:boolean;
  documentToFollow:boolean;
  followUpReason:string|null;
  expectedFollowUpAt:string;
  missingDocumentType:string|null;
  editable:boolean;
};

const topicFields:Record<string,Array<{name:string;label:string;type?:"text"|"date"|"number"|"textarea"|"select";options?:string[]}>>={
  ARBEITNEHMER_VORTEILE:[
    {name:"Art des Sachverhalts",label:"Art des Sachverhalts",type:"select",options:["Geschenk","Aufmerksamkeit","Gutschein","Sachbezug","freiwillige soziale Aufwendung","Betriebsveranstaltung","Mitarbeiterverpflegung","Sonstiges"]},
    {name:"Betroffene Arbeitnehmer oder Personengruppe",label:"Arbeitnehmer oder Personengruppe"},
    {name:"Datum oder Zeitraum",label:"Datum oder Zeitraum"},{name:"Betrag",label:"Betrag",type:"number"},
    {name:"Buchungskonto",label:"Buchungskonto (optional)"},{name:"Beschreibung",label:"Beschreibung",type:"textarea"},
    {name:"Abrechnungsmonat",label:"Lohnabrechnungsmonat"},
    {name:"Veranstaltungsdatum",label:"Veranstaltungsdatum (bei Betriebsveranstaltung)",type:"date"},
    {name:"Bezeichnung der Veranstaltung",label:"Veranstaltungsbezeichnung"},{name:"Teilnehmerliste vorhanden",label:"Teilnehmerliste vorhanden"},
    {name:"Anzahl Arbeitnehmer",label:"Anzahl Arbeitnehmer",type:"number"},{name:"Anzahl Begleitpersonen",label:"Anzahl Begleitpersonen",type:"number"},
    {name:"Gesamtkosten",label:"Gesamtkosten",type:"number"},{name:"Weitere Veranstaltung bekannt",label:"Weitere Veranstaltung im Kalenderjahr bekannt"},
  ],
  REISEKOSTEN:[
    {name:"Arbeitnehmer",label:"Arbeitnehmer"},{name:"Reisebeginn",label:"Reisebeginn",type:"date"},{name:"Reiseende",label:"Reiseende",type:"date"},
    {name:"Art der Erstattung",label:"Art der Erstattung"},{name:"Fahrtkosten",label:"Fahrtkosten",type:"number"},
    {name:"Verpflegungsmehraufwand",label:"Verpflegungsmehraufwand",type:"number"},{name:"Übernachtungskosten",label:"Übernachtungskosten",type:"number"},
    {name:"Sonstige Kosten",label:"Sonstige Kosten",type:"number"},{name:"Gesamtbetrag",label:"Gesamtbetrag",type:"number"},
    {name:"Zahlungsweg",label:"Auszahlung über",type:"select",options:["Bank","Kasse","Verrechnung","Sonstiges"]},
    {name:"Buchungskonto",label:"Buchungskonto (optional)"},{name:"Abrechnungsmonat",label:"Lohnabrechnungsmonat"},
    {name:"Beschreibung",label:"Besonderheiten",type:"textarea"},
  ],
  FAHRZEUGE:[
    {name:"Art der Änderung",label:"Vorgang",type:"select",options:["Keine Änderung","Neues Fahrzeug","Fahrzeug geändert","Nutzerwechsel","Fahrzeug beendet","Sonstiger Vorgang"]},
    {name:"Fahrzeugbezug",label:"Fahrzeugbezug"},{name:"Nutzer",label:"Nutzer"},{name:"Gültig-ab-Datum",label:"Gültig ab",type:"date"},
    {name:"Beschreibung",label:"Beschreibung",type:"textarea"},
  ],
  SCHEINSELBSTSTAENDIGKEIT:[
    {name:"Betroffene Person oder Unternehmen",label:"Betroffene Person oder Unternehmen"},{name:"Leistungsart",label:"Leistungsart"},
    {name:"Zeitraum",label:"Leistungszeitraum"},{name:"Rechnungsbetrag",label:"Rechnungsbetrag",type:"number"},
    {name:"Auffällige Merkmale",label:"Auffälligkeiten (mehrere Angaben mit Semikolon trennen)",type:"textarea"},
    {name:"Beschreibung",label:"Freitextbeschreibung",type:"textarea"},
  ],
  GESCHENKE_NICHTARBEITNEHMER:[
    {name:"Empfänger oder Empfängergruppe",label:"Empfänger oder Empfängergruppe"},{name:"Art des Geschenks",label:"Art des Geschenks"},
    {name:"Datum",label:"Datum",type:"date"},{name:"Wert",label:"Wert",type:"number"},{name:"Anlass",label:"Anlass"},
    {name:"Hinweis zur möglichen Pauschalversteuerung",label:"Mögliche Pauschalversteuerung",type:"select",options:["noch zu prüfen","vorgesehen","nicht vorgesehen"]},
    {name:"Buchungskonto",label:"Buchungskonto (optional)"},{name:"Beschreibung",label:"Beschreibung",type:"textarea"},
  ],
  KSK:[
    {name:"Auftragnehmer oder Rechnungsteller",label:"Auftragnehmer oder Rechnungsteller"},{name:"Leistungsart",label:"Leistungsart"},
    {name:"Rechnungsnummer",label:"Rechnungsnummer"},{name:"Rechnungsdatum",label:"Rechnungsdatum",type:"date"},
    {name:"Relevanter Zeitraum",label:"Leistungszeitraum"},{name:"Rechnungsbetrag",label:"Rechnungsbetrag",type:"number"},
    {name:"Beschreibung",label:"Beschreibung",type:"textarea"},{name:"Kennzeichnung Jahresmeldung",label:"Für spätere Jahresmeldung berücksichtigen"},
    {name:"Meldejahr",label:"Meldejahr",type:"number"},
  ],
};

export function ReconciliationItemForm(props:ItemFormProps){
  const [state,action,pending]=useActionState(updatePayrollItemAction.bind(null,props.itemId),{} satisfies PayrollFormState);
  const details=readDetails(props.detailsJson);
  const fields=mergeFields(topicFields[props.topicKey]??[],props.requiredFields);
  if(!props.editable)return null;
  return <form action={action} className="mt-4 space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
    {state.error&&<p role="alert" className="rounded border border-[var(--color-error)] bg-white p-3 text-sm text-[var(--color-error)]">{state.error}</p>}
    {state.success&&<p role="status" className="rounded border border-[var(--color-success)] bg-white p-3 text-sm text-[var(--color-success)]">{state.success}</p>}
    {props.topicKey==="SCHEINSELBSTAENDIGKEIT"&&<p className="rounded border border-[var(--color-warning)] bg-white p-3 text-sm"><strong>Hinweis:</strong> Ordo Caroli trifft keine rechtliche Einstufung. Der Sachverhalt wird lediglich zur weiteren fachlichen Prüfung übergeben.</p>}
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Themenentscheidung"><select className="input" name="status" defaultValue={props.status} required>
        <option>Noch nicht geprüft</option><option>Kein Sachverhalt</option><option>Übergabe in Vorbereitung</option><option>Vollständig an Lohn übergeben</option>
      </select></Field>
      <Field label="Interne Notiz"><input className="input" name="note" defaultValue={props.note??""}/></Field>
      {fields.map(field=><DetailField key={field.name} field={field} value={details[field.name]}/>)}
    </div>
    {props.requiredDocuments.length>0&&<p className="text-xs text-[var(--color-text-muted)]">Erforderliche Belegarten: {props.requiredDocuments.join(" · ")}</p>}
    {props.followUpAllowed&&<details className="rounded border border-[var(--color-border)] bg-white p-3" open={props.documentToFollow}>
      <summary className="cursor-pointer font-semibold">Unterlage wird nachgereicht</summary>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="documentToFollow" defaultChecked={props.documentToFollow}/> Nachreichung festhalten</label>
        <Field label="Fehlende Belegart"><input className="input" name="missingDocumentType" defaultValue={props.missingDocumentType??""}/></Field>
        <Field label="Erwartetes Datum"><input className="input" type="date" name="expectedFollowUpAt" defaultValue={props.expectedFollowUpAt}/></Field>
        <div className="md:col-span-3"><Field label="Begründung"><textarea className="input" name="followUpReason" defaultValue={props.followUpReason??""}/></Field></div>
      </div>
    </details>}
    <button className="button-primary" disabled={pending}>{pending?"Wird gespeichert …":"Thema speichern"}</button>
  </form>;
}

export function PayrollUploadForm({itemId,questionId}:{itemId:number;questionId?:number}){
  const router=useRouter();const [open,setOpen]=useState(false);const [pending,setPending]=useState(false);const [message,setMessage]=useState("");
  async function upload(formData:FormData){
    setPending(true);setMessage("");formData.set("itemId",String(itemId));if(questionId)formData.set("questionId",String(questionId));
    try{const response=await fetch("/api/fibu-lohn/belege",{method:"POST",body:formData});const body=await response.json();if(!response.ok)throw new Error(body.error);setMessage(body.message);setOpen(false);router.refresh()}
    catch(error){setMessage(error instanceof Error?error.message:"Der Beleg konnte nicht gespeichert werden.")}
    finally{setPending(false)}
  }
  return <div className="mt-3">
    <button type="button" className="button-secondary" onClick={()=>setOpen(value=>!value)}>{open?"Upload schließen":"Beleg bereitstellen"}</button>
    {message&&<p className="mt-2 text-sm font-semibold" role="status">{message}</p>}
    {open&&<form action={upload} className="mt-3 grid gap-3 rounded border border-[var(--color-border)] bg-white p-3 md:grid-cols-2">
      <Field label="Datei"><input className="input" name="file" type="file" accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg" required/></Field>
      <Field label="Belegart"><input className="input" name="documentType" required/></Field>
      <Field label="Anzeigename"><input className="input" name="displayName" required/></Field>
      <Field label="Beschreibung"><input className="input" name="description"/></Field>
      <div className="flex gap-2"><button className="button-primary" disabled={pending}>{pending?"Wird hochgeladen …":"Hochladen"}</button><button type="button" className="button-secondary" onClick={()=>setOpen(false)}>Abbrechen</button></div>
    </form>}
  </div>;
}

function readDetails(value:string|null){try{const parsed=JSON.parse(value??"{}");return parsed&&typeof parsed==="object"?parsed as Record<string,unknown>:{};}catch{return{}}}
function mergeFields(fields:Array<{name:string;label:string;type?:"text"|"date"|"number"|"textarea"|"select";options?:string[]}>,required:string[]){
  const result=[...fields];for(const name of required)if(!result.some(field=>field.name===name))result.push({name,label:name});return result;
}
function DetailField({field,value}:{field:{name:string;label:string;type?:"text"|"date"|"number"|"textarea"|"select";options?:string[]};value:unknown}){
  const string=typeof value==="string"||typeof value==="number"?String(value):"";
  return <Field label={field.label}>{field.type==="textarea"?<textarea className="input min-h-24" name={`detail.${field.name}`} defaultValue={string}/>:field.type==="select"?<select className="input" name={`detail.${field.name}`} defaultValue={string}><option value="">Bitte auswählen</option>{field.options?.map(option=><option key={option}>{option}</option>)}</select>:<input className="input" name={`detail.${field.name}`} type={field.type??"text"} step={field.type==="number"?"0.01":undefined} defaultValue={string}/>}</Field>
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="text-xs font-semibold"><span className="mb-1 block">{label}</span>{children}</label>}
