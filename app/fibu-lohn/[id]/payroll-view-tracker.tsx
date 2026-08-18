"use client";

import { useEffect,useRef } from "react";
import { recordPayrollViewAction } from "@/app/fibu-lohn/actions";

export function PayrollViewTracker({reconciliationId}:{reconciliationId:number}){
  const sent=useRef(false);
  useEffect(()=>{if(sent.current)return;sent.current=true;void recordPayrollViewAction(reconciliationId)},[reconciliationId]);
  return null;
}
