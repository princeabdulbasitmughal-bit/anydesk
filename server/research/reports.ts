import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { findingsToPlainText } from "./contracts";

type ReportExperiment = { title: string; description: string | null };
type ReportFinding = { title: string; content: string } | undefined;
type ReportRun = { id: number; runType: string; status: string; queuedAt: Date };

export function makeResearchMarkdown(experiment: ReportExperiment, finding: ReportFinding, runs: ReportRun[]) {
  const findings = finding ? findingsToPlainText(finding.content) : "No findings have been recorded for this experiment.";
  const runRows = runs.length
    ? runs.map(run => `| ${run.id} | ${run.runType} | ${run.status} | ${run.queuedAt.toISOString()} |`).join("\n")
    : "| — | — | — | — |";
  return `# ${experiment.title}\n\n## Experiment summary\n\n${experiment.description || "No experiment summary has been recorded."}\n\n## Research findings\n\n${finding?.title || "Findings"}\n\n${findings}\n\n## Run history\n\n| Run | Type | Status | Queued at |\n| --- | --- | --- | --- |\n${runRows}\n`;
}

export async function makeResearchPdf(markdown: string) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const lines = markdown.split("\n");
  let page = pdf.addPage([612, 792]);
  let y = 744;
  for (const rawLine of lines) {
    if (y < 54) {
      page = pdf.addPage([612, 792]);
      y = 744;
    }
    const line = rawLine.replace(/^#+\s*/, "").slice(0, 110);
    const heading = rawLine.startsWith("#");
    page.drawText(line || " ", {
      x: 48,
      y,
      size: heading ? 14 : 9.5,
      font: heading ? bold : font,
      color: heading ? rgb(0.06, 0.13, 0.25) : rgb(0.13, 0.16, 0.21),
    });
    y -= heading ? 23 : 14;
  }
  return Buffer.from(await pdf.save());
}
