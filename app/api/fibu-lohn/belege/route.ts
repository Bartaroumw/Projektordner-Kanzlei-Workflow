import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { uploadPayrollDocument } from "@/lib/payroll-document-service";
import { PayrollReconciliationError } from "@/lib/payroll-reconciliation-service";

export const dynamic="force-dynamic";

export async function POST(request:Request){
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Bitte melden Sie sich erneut an."},{status:401});
  try{
    const form=await request.formData();
    const file=form.get("file");
    const itemId=Number(form.get("itemId"));
    if(!(file instanceof File)||!Number.isInteger(itemId))return NextResponse.json({error:"Bitte wählen Sie eine zulässige Datei aus."},{status:400});
    const document=await uploadPayrollDocument(itemId,{
      displayName:String(form.get("displayName")??file.name),
      documentType:String(form.get("documentType")??"Beleg"),
      description:String(form.get("description")??""),
      originalFileName:file.name,
      mimeType:file.type,
      bytes:new Uint8Array(await file.arrayBuffer()),
      questionId:Number(form.get("questionId"))||undefined,
      positionId:Number(form.get("positionId"))||undefined,
    },user);
    return NextResponse.json({id:document.id,message:"Der Beleg wurde geschützt bereitgestellt."},{status:201});
  }catch(error){
    if(error instanceof PayrollReconciliationError){
      const status=error.code==="NOT_ALLOWED"?403:error.code==="NOT_FOUND"?404:400;
      return NextResponse.json({error:error.message},{status});
    }
    console.error("FiBu-Lohn-Belegupload fehlgeschlagen",error);
    return NextResponse.json({error:"Der Beleg konnte nicht gespeichert werden."},{status:500});
  }
}
