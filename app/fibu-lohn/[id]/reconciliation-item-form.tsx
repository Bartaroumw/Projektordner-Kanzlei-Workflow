"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { updatePayrollItemAction } from "@/app/fibu-lohn/actions";
import { duplicatePayrollPositionAction, removePayrollPositionAction, savePayrollPositionAction } from "@/app/fibu-lohn/actions";
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
  positions:Array<{
    id:number;positionType:string;title:string;caseCount:number;totalAmountCents:number|null;period:string|null;summary:string|null;
    peopleJson:string|null;detailsJson:string|null;requiredListType:string|null;requiredListDocumentName:string|null;status:string;
  }>;
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
  if(!props.editable)return null;
  return <><form action={action} className="mt-4 space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
    {state.error&&<p role="alert" className="rounded border border-[var(--color-error)] bg-white p-3 text-sm text-[var(--color-error)]">{state.error}</p>}
    {state.success&&<p role="status" className="rounded border border-[var(--color-success)] bg-white p-3 text-sm text-[var(--color-success)]">{state.success}</p>}
    {props.topicKey==="SCHEINSELBSTAENDIGKEIT"&&<p className="rounded border border-[var(--color-warning)] bg-white p-3 text-sm"><strong>Hinweis:</strong> Ordo Caroli trifft keine rechtliche Einstufung. Der Sachverhalt wird lediglich zur weiteren fachlichen Prüfung übergeben.</p>}
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Themenentscheidung"><select className="input" name="decision" defaultValue={decisionForStatus(props.status)} required>
        <option>Noch nicht geprüft</option><option>Kein relevanter Sachverhalt</option><option>Sachverhalt vorhanden</option>
      </select></Field>
      <Field label="Interne Notiz"><input className="input" name="note" defaultValue={props.note??""}/></Field>
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
  </form>{props.status!=="Kein Sachverhalt"&&<PositionSection {...props}/>}</>;
}

function PositionSection(props:ItemFormProps){
  const collectionAllowed=["ARBEITNEHMER_VORTEILE","REISEKOSTEN","GESCHENKE_NICHTARBEITNEHMER","KSK"].includes(props.topicKey);
  const fields=mergeFields(topicFields[props.topicKey]??[],props.requiredFields);
  return <section className="border-t border-[var(--color-border)] pt-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-semibold">Sachverhaltspositionen · {props.positions.length}</h4><p className="text-xs text-[var(--color-text-muted)]">Mehrere Personen oder Vorgänge werden getrennt oder als fachlich zulässige Sammlung erfasst.</p></div></div>
    <div className="mt-3 space-y-3">{props.positions.map(position=><article id={`position-${position.id}`} className="rounded border border-[var(--color-border)] bg-white p-3" key={position.id}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{position.title}</p><p className="text-xs text-[var(--color-text-muted)]">{position.positionType} · {position.caseCount} Fall/Fälle · {position.status}{position.period?` · ${position.period}`:""}</p>{position.summary&&<p className="mt-2 text-sm">{position.summary}</p>}</div><span className="rounded-full bg-[var(--color-primary-light)] px-2 py-1 text-xs font-semibold">{position.status}</span></div>
      <div className="mt-3 flex flex-wrap gap-2"><details className="w-full rounded border border-[var(--color-border)] p-3"><summary className="cursor-pointer font-semibold">Position bearbeiten</summary><PositionForm itemId={props.itemId} position={position} topicKey={props.topicKey} fields={fields} collectionAllowed={collectionAllowed}/></details><form action={duplicatePayrollPositionAction.bind(null,position.id,props.itemId)}><button className="button-secondary">Duplizieren</button></form><form action={removePayrollPositionAction.bind(null,position.id,props.itemId)}><button className="button-secondary">{position.status==="Entwurf"?"Entwurf löschen":"Archivieren"}</button></form></div>
      <PayrollUploadForm itemId={props.itemId} positionId={position.id}/>
    </article>)}</div>
    <details className="mt-3 rounded border border-[var(--color-primary)] bg-white p-3"><summary className="cursor-pointer font-semibold text-[var(--color-primary-dark)]">Position hinzufügen</summary><PositionForm itemId={props.itemId} position={null} topicKey={props.topicKey} fields={fields} collectionAllowed={collectionAllowed}/></details>
  </section>;
}

function PositionForm({itemId,position,topicKey,fields,collectionAllowed}:{itemId:number;position:ItemFormProps["positions"][number]|null;topicKey:string;fields:Array<{name:string;label:string;type?:"text"|"date"|"number"|"textarea"|"select";options?:string[]}>;collectionAllowed:boolean}){
  const details=readDetails(position?.detailsJson??null);
  const people=readStringList(position?.peopleJson??null).join("\n");
  const requiresList=topicKey==="GESCHENKE_NICHTARBEITNEHMER"?"Empfängerliste":topicKey==="KSK"?"Rechnungsliste":"";
  return <form action={savePayrollPositionAction.bind(null,itemId,position?.id??null)} className="mt-3 grid gap-3 md:grid-cols-2">
    <Field label="Positionsart"><select className="input" name="positionType" defaultValue={position?.positionType??"Einzelposition"}><option>Einzelposition</option>{collectionAllowed&&<option>Sammelposition</option>}</select></Field>
    <Field label="Bezeichnung"><input className="input" name="title" defaultValue={position?.title??""} required/></Field>
    <Field label="Anzahl Fälle"><input className="input" name="caseCount" type="number" min="1" defaultValue={position?.caseCount??1}/></Field>
    <Field label="Gesamtbetrag (optional)"><input className="input" name="totalAmount" inputMode="decimal" defaultValue={position?.totalAmountCents!=null?(position.totalAmountCents/100).toFixed(2).replace(".",","):""}/></Field>
    <Field label="Zeitraum"><input className="input" name="period" defaultValue={position?.period??""}/></Field>
    <Field label="Personen / Empfänger, eine Zeile je Eintrag"><textarea className="input min-h-24" name="people" defaultValue={people}/></Field>
    <div className="md:col-span-2"><Field label="Kurzbeschreibung"><textarea className="input min-h-20" name="summary" defaultValue={position?.summary??""}/></Field></div>
    {fields.map(field=><DetailField key={field.name} field={field} value={details[field.name]}/>)}
    {requiresList&&<><input type="hidden" name="requiredListType" value={requiresList}/><Field label={`${requiresList}: Anzeigename der bereitgestellten PDF-/XLSX-Datei`}><input className="input" name="requiredListDocumentName" defaultValue={position?.requiredListDocumentName??""}/></Field></>}
    <div className="md:col-span-2 flex gap-2"><button className="button-primary">{position?"Position speichern":"Position anlegen"}</button></div>
  </form>;
}

export function PayrollUploadForm({itemId,questionId,positionId}:{itemId:number;questionId?:number;positionId?:number}){
  const router=useRouter();const [open,setOpen]=useState(false);const [pending,setPending]=useState(false);const [message,setMessage]=useState("");
  async function upload(formData:FormData){
    setPending(true);setMessage("");formData.set("itemId",String(itemId));if(questionId)formData.set("questionId",String(questionId));if(positionId)formData.set("positionId",String(positionId));
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
function readStringList(value:string|null){try{const parsed=JSON.parse(value??"[]");return Array.isArray(parsed)?parsed.filter((entry):entry is string=>typeof entry==="string"):[];}catch{return[]}}
function decisionForStatus(status:string){return status==="Kein Sachverhalt"?"Kein relevanter Sachverhalt":status==="Noch nicht geprüft"?"Noch nicht geprüft":"Sachverhalt vorhanden"}
function mergeFields(fields:Array<{name:string;label:string;type?:"text"|"date"|"number"|"textarea"|"select";options?:string[]}>,required:string[]){
  const result=[...fields];for(const name of required)if(!result.some(field=>field.name===name))result.push({name,label:name});return result;
}
function DetailField({field,value}:{field:{name:string;label:string;type?:"text"|"date"|"number"|"textarea"|"select";options?:string[]};value:unknown}){
  const string=typeof value==="string"||typeof value==="number"?String(value):"";
  return <Field label={field.label}>{field.type==="textarea"?<textarea className="input min-h-24" name={`detail.${field.name}`} defaultValue={string}/>:field.type==="select"?<select className="input" name={`detail.${field.name}`} defaultValue={string}><option value="">Bitte auswählen</option>{field.options?.map(option=><option key={option}>{option}</option>)}</select>:<input className="input" name={`detail.${field.name}`} type={field.type??"text"} step={field.type==="number"?"0.01":undefined} defaultValue={string}/>}</Field>
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="text-xs font-semibold"><span className="mb-1 block">{label}</span>{children}</label>}
