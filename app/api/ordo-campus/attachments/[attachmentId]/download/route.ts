import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageOrdoCampus,canViewAnnualChecklist,canViewClient } from "@/lib/permissions";
import { readCampusAttachmentFile } from "@/lib/ordo-campus-attachment-service";

export const dynamic = "force-dynamic";

export async function GET(request:NextRequest,{params}:{params:Promise<{attachmentId:string}>}){
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Bitte melden Sie sich erneut an."},{status:401});
  const attachmentId=Number((await params).attachmentId);
  if(!Number.isInteger(attachmentId))return unavailable();
  const attachment=await prisma.standardTaskKnowledgeAttachment.findUnique({where:{id:attachmentId},include:{standardTask:{include:{campusKnowledge:true}}}});
  if(!attachment?.standardTask.campusKnowledge)return unavailable();

  const maintenance=request.nextUrl.searchParams.get("pflege")==="1";
  if(maintenance){
    if(!canManageOrdoCampus(user))return NextResponse.json({error:"Sie besitzen keine Berechtigung für diesen Download."},{status:403});
  }else{
    if(attachment.status!=="Aktiv"||attachment.standardTask.campusKnowledge.status!=="Aktiv")return unavailable();
    const kind=request.nextUrl.searchParams.get("kind");
    const taskId=Number(request.nextUrl.searchParams.get("taskId"));
    const allowed=kind==="monat"
      ? await prisma.checklistTask.findUnique({where:{id:taskId},select:{standardTaskId:true,period:{select:{processorUserId:true,reviewerUserId:true,managementUserId:true}}}}).then(task=>Boolean(task&&task.standardTaskId===attachment.standardTaskId&&canViewClient(user,task.period)))
      : kind==="jahresabschluss"
        ? await prisma.annualChecklistTask.findUnique({where:{id:taskId},select:{standardTaskId:true,annualChecklist:{select:{processorUserId:true,reviewerUserId:true,managementUserId:true}}}}).then(task=>Boolean(task&&task.standardTaskId===attachment.standardTaskId&&canViewAnnualChecklist(user,task.annualChecklist)))
        : false;
    if(!allowed)return NextResponse.json({error:"Sie besitzen keine Berechtigung für diesen Download."},{status:403});
  }
  try{
    const bytes=await readCampusAttachmentFile(attachment.storageKey);
    const asciiName=attachment.originalFileName.replace(/[^\x20-\x7E]/g,"_").replaceAll('"',"_");
    return new NextResponse(bytes,{headers:{
      "Content-Type":attachment.mimeType,
      "Content-Disposition":`attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(attachment.originalFileName)}`,
      "Content-Length":String(bytes.byteLength),
      "X-Content-Type-Options":"nosniff",
      "Cache-Control":"private, no-store",
    }});
  }catch{return unavailable()}
}

function unavailable(){return NextResponse.json({error:"Der Anhang wurde nicht gefunden oder ist nicht mehr verfügbar."},{status:404})}
