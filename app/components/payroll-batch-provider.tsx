"use client";

import { useRouter } from "next/navigation";
import { createContext,useCallback,useContext,useEffect,useMemo,useRef,useState } from "react";
import {
  samePayrollDraft,validatePayrollPositionDraft,validatePayrollTopicDraft,
  type PayrollBatchChange,type PayrollBatchSaveResult,type PayrollPositionDraft,type PayrollTopicDraft,
} from "@/lib/payroll-batch";

type TopicEntry={kind:"topic";itemId:number;title:string;baseline:PayrollTopicDraft;current:PayrollTopicDraft;updatedAt:string;error?:string;conflict?:boolean};
type PositionEntry={kind:"position";itemId:number;title:string;baseline:PayrollPositionDraft;current:PayrollPositionDraft;updatedAt?:string;error?:string;conflict?:boolean};
type Entry=TopicEntry|PositionEntry;
type Context={
  registerTopic:(itemId:number,title:string,draft:PayrollTopicDraft,updatedAt:string)=>void;updateTopic:(itemId:number,draft:PayrollTopicDraft)=>void;topic:(itemId:number)=>TopicEntry|undefined;
  registerPosition:(key:string,title:string,draft:PayrollPositionDraft,updatedAt?:string)=>void;updatePosition:(key:string,draft:PayrollPositionDraft)=>void;position:(key:string)=>PositionEntry|undefined;
  addPosition:(itemId:number,draft:PayrollPositionDraft)=>string;removeNewPosition:(key:string)=>void;positionKeys:(itemId:number)=>string[];discard:(key:string)=>void;saving:boolean;
};
const PayrollContext=createContext<Context|null>(null);

export function PayrollBatchProvider({children,saveAction,enabled}:{children:React.ReactNode;saveAction:(change:PayrollBatchChange)=>Promise<PayrollBatchSaveResult>;enabled:boolean}){
  const router=useRouter();const counter=useRef(0);const [entries,setEntries]=useState<Record<string,Entry>>({});const [saving,setSaving]=useState(false);const [message,setMessage]=useState("");const [errorCursor,setErrorCursor]=useState(0);
  const registerTopic=useCallback((itemId:number,title:string,draft:PayrollTopicDraft,updatedAt:string)=>setEntries(current=>{const key=`topic:${itemId}`,old=current[key];if(old&&!samePayrollDraft(old.current,old.baseline))return current;if(old&&old.updatedAt===updatedAt&&samePayrollDraft(old.baseline,draft))return current;return{...current,[key]:{kind:"topic",itemId,title,baseline:draft,current:draft,updatedAt}}}),[]);
  const updateTopic=useCallback((itemId:number,draft:PayrollTopicDraft)=>setEntries(current=>{const key=`topic:${itemId}`,entry=current[key];return entry?.kind==="topic"?{...current,[key]:{...entry,current:draft,error:undefined,conflict:false}}:current}),[]);
  const registerPosition=useCallback((key:string,title:string,draft:PayrollPositionDraft,updatedAt?:string)=>setEntries(current=>{const old=current[key];if(old&&!samePayrollDraft(old.current,old.baseline))return current;if(old&&old.updatedAt===updatedAt&&samePayrollDraft(old.baseline,draft))return current;return{...current,[key]:{kind:"position",itemId:draft.itemId,title,baseline:draft,current:draft,updatedAt}}}),[]);
  const updatePosition=useCallback((key:string,draft:PayrollPositionDraft)=>setEntries(current=>{const entry=current[key];return entry?.kind==="position"?{...current,[key]:{...entry,current:draft,error:undefined,conflict:false}}:current}),[]);
  const addPosition=useCallback((itemId:number,draft:PayrollPositionDraft)=>{const key=`new:${itemId}:${++counter.current}`;setEntries(current=>({...current,[key]:{kind:"position",itemId,title:"Neue Position",baseline:{...draft,title:""},current:draft}}));return key},[]);
  const removeNewPosition=useCallback((key:string)=>setEntries(current=>Object.fromEntries(Object.entries(current).filter(([entryKey])=>entryKey!==key))),[]);
  const discard=useCallback((key:string)=>setEntries(current=>{
    const entry=current[key];
    if(!entry)return current;
    const reset:Entry=entry.kind==="topic"
      ?{...entry,current:entry.baseline,error:undefined,conflict:false}
      :{...entry,current:entry.baseline,error:undefined,conflict:false};
    return {...current,[key]:reset};
  }),[]);
  const dirty=useMemo(()=>Object.entries(entries).filter(([,entry])=>!samePayrollDraft(entry.current,entry.baseline)),[entries]);
  const errors=useMemo(()=>Object.entries(entries).filter(([,entry])=>entry.error),[entries]);

  useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(!dirty.length)return;event.preventDefault();event.returnValue=""};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn)},[dirty.length]);
  const saveAll=useCallback(async()=>{
    if(saving||!dirty.length)return;setSaving(true);setMessage("");const local=new Map<string,string>();const payload:PayrollBatchChange={topics:[],positions:[]};
    for(const [key,entry] of dirty){const error=entry.kind==="topic"?validatePayrollTopicDraft(entry.current):validatePayrollPositionDraft(entry.current);if(error)local.set(key,error);else if(entry.kind==="topic")payload.topics.push({itemId:entry.itemId,expectedUpdatedAt:entry.updatedAt,...entry.current});else payload.positions.push({key,expectedUpdatedAt:entry.updatedAt,...entry.current})}
    let response:PayrollBatchSaveResult={results:[]};try{if(payload.topics.length||payload.positions.length)response=await saveAction(payload)}catch{response={results:[...payload.positions.map(change=>({key:change.key,ok:false as const,code:"TECHNICAL" as const,message:"Die Position konnte technisch nicht gespeichert werden."})),...payload.topics.map(change=>({key:`topic:${change.itemId}`,ok:false as const,code:"TECHNICAL" as const,message:"Das Thema konnte technisch nicht gespeichert werden."}))]}}
    const results=new Map(response.results.map(result=>[result.key,result]));
    const saved=dirty.filter(([key,entry])=>{
      const result=results.get(key);
      return !local.has(key)&&Boolean(result?.ok&&(entry.kind==="topic"?result.savedTopic:result.savedPosition));
    }).length;
    setEntries(current=>{
      const next={...current};
      for(const [key] of dirty){
        const entry=next[key],result=results.get(key),error=local.get(key);
        if(error){
          next[key]=entry.kind==="topic"?{...entry,error}:{...entry,error};
          continue;
        }
        if(result?.ok&&entry.kind==="topic"&&result.savedTopic){
          const {updatedAt,...baseline}=result.savedTopic;
          next[key]={...entry,baseline,current:baseline,updatedAt,error:undefined,conflict:false};
        }else if(result?.ok&&entry.kind==="position"&&result.savedPosition){
          const {updatedAt,...baseline}=result.savedPosition;
          const nextKey=`position:${baseline.positionId}`;
          next[nextKey]={...entry,itemId:baseline.itemId,title:baseline.title,baseline,current:baseline,updatedAt,error:undefined,conflict:false};
          if(nextKey!==key)delete next[key];
        }else{
          const failure=result?.message??"Die Eingabe konnte nicht gespeichert werden.";
          next[key]=entry.kind==="topic"?{...entry,error:failure,conflict:result?.code==="CONFLICT"}:{...entry,error:failure,conflict:result?.code==="CONFLICT"};
        }
      }
      return next;
    });
    const failed=dirty.length-saved;setMessage(failed?`${saved} gespeichert · ${failed} benötigen Aufmerksamkeit.`:`${saved} Änderung${saved===1?"":"en"} gespeichert.`);setSaving(false);if(saved)router.refresh();
  },[dirty,router,saveAction,saving]);
  useEffect(()=>{const shortcut=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLocaleLowerCase("de-DE")==="s"&&dirty.length){event.preventDefault();void saveAll()}};window.addEventListener("keydown",shortcut);return()=>window.removeEventListener("keydown",shortcut)},[dirty.length,saveAll]);
  const nextError=()=>{if(!errors.length)return;const index=errorCursor%errors.length,key=errors[index][0],entry=errors[index][1];const target=document.getElementById(entry.kind==="topic"?`thema-${entry.itemId}`:key.replace("position:","position-").replace(/:/g,"-"));target?.scrollIntoView({behavior:"smooth",block:"center"});target?.querySelector<HTMLElement>("[aria-invalid='true'], input, select, textarea")?.focus({preventScroll:true});setErrorCursor((index+1)%errors.length)};
  const value=useMemo<Context>(()=>({registerTopic,updateTopic,topic:itemId=>entries[`topic:${itemId}`]?.kind==="topic"?entries[`topic:${itemId}`] as TopicEntry:undefined,registerPosition,updatePosition,position:key=>entries[key]?.kind==="position"?entries[key] as PositionEntry:undefined,addPosition,removeNewPosition,positionKeys:itemId=>Object.entries(entries).filter(([,entry])=>entry.kind==="position"&&entry.itemId===itemId).map(([key])=>key),discard,saving}),[addPosition,discard,entries,registerPosition,registerTopic,removeNewPosition,saving,updatePosition,updateTopic]);
  const discardAll=()=>setEntries(current=>Object.fromEntries(Object.entries(current).map(([key,entry])=>{
    const reset:Entry=entry.kind==="topic"
      ?{...entry,current:entry.baseline,error:undefined,conflict:false}
      :{...entry,current:entry.baseline,error:undefined,conflict:false};
    return [key,reset];
  })));
  return <PayrollContext.Provider value={value}>
    {enabled&&<aside aria-label="Rechnungswesen-Lohn-Änderungen speichern" className="sticky top-0 z-40 my-4 rounded-lg border border-[var(--color-primary)] bg-white/95 px-3 py-2 shadow-md backdrop-blur"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm"><strong>Sammelspeicherung</strong><span className="text-[var(--color-text-muted)]"> · {dirty.filter(([,entry])=>entry.kind==="topic").length} Themen geändert · {dirty.filter(([,entry])=>entry.kind==="position").length} Positionen ungespeichert · {errors.length} Fehler</span></p><div className="flex flex-wrap gap-2">{errors.length>0&&<button type="button" className="button-secondary !min-h-8 !px-3 !py-1 text-xs" onClick={nextError}>Zur nächsten fehlerhaften Eingabe · Fehler {(errorCursor%errors.length)+1} von {errors.length}</button>}<button type="button" className="button-secondary !min-h-8 !px-3 !py-1 text-xs" disabled={!dirty.length||saving} onClick={discardAll}>Alle Änderungen verwerfen</button><button type="button" className="button-primary !min-h-8 !px-3 !py-1 text-xs" disabled={!dirty.length||saving} onClick={()=>void saveAll()}>{saving?"Speichert …":dirty.length?`Alle Änderungen speichern (${dirty.length})`:"Alles gespeichert"}</button></div></div>{message&&<p className="mt-1 text-xs text-[var(--color-text-muted)]" role="status">{message}</p>}</aside>}
    <div onSubmitCapture={event=>{if(!dirty.length)return;const form=event.target as HTMLFormElement;if(form.dataset.payrollDraft==="true")return;event.preventDefault();setMessage("Vor dieser fachlichen Aktion müssen die offenen Themen- und Positionsänderungen gespeichert oder verworfen werden.")}}>{children}</div>
  </PayrollContext.Provider>;
}

export function usePayrollBatch(){const context=useContext(PayrollContext);if(!context)throw new Error("ReconciliationItemForm benötigt PayrollBatchProvider.");return context}
