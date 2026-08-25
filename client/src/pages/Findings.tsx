import { EmptyResearchState, ExperimentGate, PageHeading } from "@/components/ResearchShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useResearch } from "@/contexts/ResearchContext";
import { trpc } from "@/lib/trpc";
import { Bold, Download, FileText, Italic, List, ListOrdered, Loader2, Save, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type FindingsSnapshot = { title: string; content: string };

export default function Findings() {
  const { selectedExperimentId } = useResearch();
  const finding = trpc.research.findings.get.useQuery({ experimentId: selectedExperimentId ?? 1 }, { enabled: Boolean(selectedExperimentId) });
  const reports = trpc.research.reports.list.useQuery({ experimentId: selectedExperimentId ?? 1 }, { enabled: Boolean(selectedExperimentId) });
  const [title, setTitle] = useState("Research findings");
  const [isDirty, setIsDirty] = useState(false);
  const editor = useRef<HTMLDivElement>(null);
  const latestTitle = useRef(title);
  const savedSnapshot = useRef<FindingsSnapshot>({ title, content: "" });
  const pendingSaveSnapshot = useRef<FindingsSnapshot | null>(null);

  const readCurrentSnapshot = (): FindingsSnapshot => ({ title: latestTitle.current, content: editor.current?.innerHTML || "" });
  const snapshotsMatch = (left: FindingsSnapshot, right: FindingsSnapshot) => left.title === right.title && left.content === right.content;
  const refreshDirtyState = () => setIsDirty(!snapshotsMatch(readCurrentSnapshot(), savedSnapshot.current));

  useEffect(() => {
    if (!finding.data || isDirty) return;
    const snapshot = { title: finding.data.title, content: finding.data.content };
    latestTitle.current = snapshot.title;
    savedSnapshot.current = snapshot;
    setTitle(snapshot.title);
    if (editor.current) editor.current.innerHTML = snapshot.content;
    setIsDirty(false);
  }, [finding.data, isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const preventAccidentalExit = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventAccidentalExit);
    return () => window.removeEventListener("beforeunload", preventAccidentalExit);
  }, [isDirty]);

  const save = trpc.research.findings.save.useMutation({
    onSuccess: () => {
      const saved = pendingSaveSnapshot.current;
      if (saved && snapshotsMatch(saved, readCurrentSnapshot())) {
        savedSnapshot.current = saved;
        setIsDirty(false);
      }
      pendingSaveSnapshot.current = null;
      finding.refetch();
      toast.success("Findings saved");
    },
    onError: error => toast.error(error.message),
  });
  const exportReport = trpc.research.reports.export.useMutation({
    onSuccess: async output => {
      await reports.refetch();
      window.open(output.url, "_blank", "noopener,noreferrer");
      toast.success(`${output.format.toUpperCase()} report exported`);
    },
    onError: error => toast.error(error.message),
  });

  const updateTitle = (nextTitle: string) => {
    latestTitle.current = nextTitle;
    setTitle(nextTitle);
    setIsDirty(!snapshotsMatch({ title: nextTitle, content: editor.current?.innerHTML || "" }, savedSnapshot.current));
  };
  const doSave = () => {
    if (!selectedExperimentId) return;
    const snapshot = readCurrentSnapshot();
    pendingSaveSnapshot.current = snapshot;
    save.mutate({ experimentId: selectedExperimentId, ...snapshot });
  };
  const format = (command: string) => {
    editor.current?.focus();
    document.execCommand(command, false);
    window.requestAnimationFrame(refreshDirtyState);
  };

  return <>
    <PageHeading eyebrow="Scientific record" title="Research findings" description="Capture interpretable notes and analysis decisions in a rich-text research record, then export a structured Markdown or PDF report." />
    <ExperimentGate>
      <div className="grid gap-5 xl:grid-cols-[1.5fr_0.7fr]">
        <section className="rounded-2xl border border-white/8 bg-slate-900/40 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-2"><Input value={title} onChange={event => updateTitle(event.target.value)} aria-label="Findings title" className="max-w-md border-white/10 bg-slate-950/50 text-lg font-semibold text-white" /><div aria-live="polite"><Badge className={`border px-2 py-0.5 text-[10px] font-bold ${isDirty ? "border-amber-300/30 bg-amber-300/10 text-amber-100" : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"}`}>{isDirty ? <TriangleAlert className="mr-1 h-3 w-3" /> : <ShieldCheck className="mr-1 h-3 w-3" />}{isDirty ? "Unsaved changes" : "Saved state"}</Badge></div></div>
            <Button onClick={doSave} disabled={save.isPending} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save findings</Button>
          </div>
          {isDirty ? <p className="mt-3 text-xs leading-5 text-amber-100/80">Your edited findings are stored only when you save. This browser will warn before closing while changes remain unsaved.</p> : null}
          <div className="mt-5 flex flex-wrap gap-1 border-y border-white/7 py-2"><Button type="button" variant="ghost" size="icon" aria-label="Bold" onClick={() => format("bold")} className="h-8 w-8 text-slate-300 hover:bg-white/5 hover:text-white"><Bold className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" aria-label="Italic" onClick={() => format("italic")} className="h-8 w-8 text-slate-300 hover:bg-white/5 hover:text-white"><Italic className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" aria-label="Bulleted list" onClick={() => format("insertUnorderedList")} className="h-8 w-8 text-slate-300 hover:bg-white/5 hover:text-white"><List className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" aria-label="Numbered list" onClick={() => format("insertOrderedList")} className="h-8 w-8 text-slate-300 hover:bg-white/5 hover:text-white"><ListOrdered className="h-4 w-4" /></Button></div>
          <div ref={editor} contentEditable suppressContentEditableWarning onInput={refreshDirtyState} data-placeholder="Record observations, interpretation, limitations, and next steps…" className="rich-editor mt-5 min-h-[420px] rounded-xl border border-white/8 bg-slate-950/35 p-5 text-sm leading-7 text-slate-200 outline-none transition focus:border-cyan-300/50" />
        </section>
        <aside className="rounded-2xl border border-white/8 bg-slate-900/40 p-6"><FileText className="h-5 w-5 text-cyan-300" /><h2 className="mt-4 font-display text-xl font-semibold text-white">Report exports</h2><p className="mt-2 text-sm leading-6 text-slate-400">Exports include the experiment summary, findings, and recorded run history.</p><div className="mt-5 grid gap-2"><Button disabled={exportReport.isPending} onClick={() => selectedExperimentId && exportReport.mutate({ experimentId: selectedExperimentId, format: "markdown" })} variant="outline" className="justify-between border-white/10 text-slate-200 hover:bg-white/5 hover:text-white">Markdown <Download className="h-4 w-4" /></Button><Button disabled={exportReport.isPending} onClick={() => selectedExperimentId && exportReport.mutate({ experimentId: selectedExperimentId, format: "pdf" })} variant="outline" className="justify-between border-white/10 text-slate-200 hover:bg-white/5 hover:text-white">PDF <Download className="h-4 w-4" /></Button></div><div className="mt-7 border-t border-white/7 pt-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Stored exports</p>{reports.data?.length ? <div className="mt-3 space-y-2">{reports.data.map(report => <a key={report.id} href={report.fileUrl} className="flex items-center justify-between rounded-lg bg-white/[0.035] px-3 py-2 text-xs text-slate-300 transition hover:bg-white/[0.07]"><span>{report.format.toUpperCase()}</span><Download className="h-3.5 w-3.5 text-cyan-300" /></a>)}</div> : <p className="mt-3 text-xs leading-5 text-slate-500">No report exports have been created.</p>}</div></aside>
      </div>
    </ExperimentGate>
  </>;
}
