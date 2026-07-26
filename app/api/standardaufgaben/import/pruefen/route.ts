import { analyzeTaskWorkbook, storeImportPreview } from "@/lib/task-import";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Bitte wählen Sie eine Excel-Datei aus." }, { status: 400 });
    }
    if (!file.name.toLocaleLowerCase("de-DE").endsWith(".xlsx")) {
      return Response.json({ error: "Zulässig sind ausschließlich .xlsx-Dateien." }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: "Die Excel-Datei darf höchstens 5 MB groß sein." }, { status: 400 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const preview = await analyzeTaskWorkbook(bytes, file.name);
    const previewId = preview.errors.length ? null : await storeImportPreview(bytes, preview);
    return Response.json({ previewId, preview });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Die Datei konnte nicht geprüft werden. Bitte kontrollieren Sie das Excel-Format." },
      { status: 400 },
    );
  }
}
