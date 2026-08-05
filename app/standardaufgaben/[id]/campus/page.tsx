import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canManageOrdoCampus } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
export default async function LegacyCampusManagementPage({params}:{params:Promise<{id:string}>}){const user=await requireUser();const id=Number((await params).id);if(!Number.isInteger(id))notFound();if(!canManageOrdoCampus(user))redirect(`/standardaufgaben/${id}`);const link=await prisma.knowledgeContentTaskLink.findFirst({where:{standardTaskId:id},orderBy:[{mainContent:"desc"},{sortOrder:"asc"}]});redirect(link?`/verwaltung/wissensmanagement/wissen/${link.knowledgeContentId}`:`/verwaltung/wissensmanagement/wissen/neu?standardTaskId=${id}`)}
