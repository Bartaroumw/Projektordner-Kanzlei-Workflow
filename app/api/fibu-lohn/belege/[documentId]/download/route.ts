import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { readPayrollDocument } from "@/lib/payroll-document-service";
import { PayrollReconciliationError } from "@/lib/payroll-reconciliation-service";

export const dynamic = "force-dynamic";

export async function GET(_request:Request,{params}:{params:Promise<{documentId:string}>}){
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Bitte melden Sie sich erneut an."},{status:401});
  const documentId=Number((await params).documentId);
  if(!Number.isInteger(documentId)||documentId<1)return unavailable();
  try{
    const {document,bytes}=await readPayrollDocument(documentId,user);
    const asciiName=document.originalFileName.replace(/[^\x20-\x7E]/g,"_").replaceAll('"',"_");
    return new NextResponse(bytes,{headers:{
      "Content-Type":document.mimeType,
      "Content-Disposition":`attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(document.originalFileName)}`,
      "Content-Length":String(bytes.byteLength),
      "X-Content-Type-Options":"nosniff",
      "Cache-Control":"private, no-store",
    }});
  }catch(error){
    if(error instanceof PayrollReconciliationError&&error.code==="NOT_ALLOWED"){
      return NextResponse.json({error:"Sie besitzen keine Berechtigung für diesen Beleg."},{status:403});
    }
    return unavailable();
  }
}

function unavailable(){
  return NextResponse.json({error:"Der Beleg wurde nicht gefunden oder ist nicht mehr verfügbar."},{status:404});
}
