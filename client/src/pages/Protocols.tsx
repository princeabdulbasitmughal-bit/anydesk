import { ExperimentGate, PageHeading } from "@/components/ResearchShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useResearch } from "@/contexts/ResearchContext";
import { trpc } from "@/lib/trpc";
import { ClipboardCheck, FileClock, History, Loader2, Save, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ProtocolDraft = { objective: string; detectorContext: string; evaluationPlan: string; acceptanceCriteria: string };
const blankDraft: ProtocolDraft = { objective: "", detectorContext: "", evaluationPlan: "", acceptanceCriteria: "" };
const fields: Array<{ key: keyof ProtocolDraft; label: string; hint: string; placeholder: string }> = [
  { key: "objective", label: "Research objective", hint: "State the question or reconstruction objective to be tested—not an expected outcome.", placeholder: "What reconstruction behaviour, detector study, or analysis question will this experiment address?" },
  { key: "detectorContext", label: "Detector context", hint: "Record the detector geometry, source conditions, or reconstruction context supplied by the researcher.", placeholder: "Detector setup, geometry revision, source conditions, or other factual context…" },
  { key: "evaluationPlan", label: "Evaluation plan", hint: "Describe the real evaluation method, splits, and evidence to collect.", placeholder: "Data partitioning, evaluation procedure, and required returned evidence…" },
  { key: "acceptanceCriteria", label: "Acceptance criteria", hint: "Record pre-specified completion or review criteria. Do not enter invented metrics.", placeholder: "Criteria a researcher will use to review genuine results and limitations…" },
];

export default function Protocols() {
  const { selectedExperimentId } = useResearch();
  const latest = trpc.research.protocols.latest.useQuery({ experimentId: selectedExperimentId ?? 1 }, { enabled: Boolean(selectedExperimentId) });
  const history = trpc.research.protocols.list.useQuery({ experimentId: selectedExperimentId ?? 1 }, { enabled: Boolean(selectedExperimentId) });
  const [draft, setDraft] = useState<ProtocolDraft>(blankDraft);
  const [hydratedVersion, setHydratedVersion] = useState<number | null>(null);
  const utils = trpc.useUtils();

  useEffect(() => {
    setDraft(blankDraft);
    setHydratedVersion(null);
  }, [selectedExperimentId]);
  useEffect(() => {
    if (!latest.data || latest.data.experimentId !== selectedExperimentId || hydratedVersion === latest.data.version) return;
    setDraft({ objective: latest.data.objective, detectorContext: latest.data.detectorContext, evaluationPlan: latest.data.evaluationPlan, acceptanceCriteria: latest.data.acceptanceCriteria });
    setHydratedVersion(latest.data.version);
  }, [hydratedVersion, latest.data, selectedExperimentId]);

  const isReady = useMemo(() => fields.every(field => draft[field.key].trim().length >= 8), [draft]);
  const save = trpc.research.protocols.saveRevision.useMutation({
    onSuccess: async result => {
      await Promise.all([utils.research.protocols.latest.invalidate(), utils.research.protocols.list.invalidate(), utils.research.reproducibility.ledger.invalidate()]);
      setHydratedVersion(result.version);
      toast.success(`Protocol revision v${result.version} recorded`);
    },
    onError: error => toast.error(error.message),
  });

  return <><PageHeading eyebrow="Pre-execution integrity" title="Experiment Protocol" description="Record the real research objective, detector context, evaluation plan, and review criteria before execution. Every save creates a new version; this workflow never supplies claims or expected scientific outcomes.">
    <Badge className="border border-cyan-200/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">{latest.data ? `Current: v${latest.data.version}` : "No protocol recorded"}</Badge>
  </PageHeading>
    <ExperimentGate>{latest.isLoading ? <div aria-busy="true" className="grid min-h-72 place-items-center rounded-2xl border border-white/8 bg-slate-900/40 text-sm text-slate-400"><Loader2 className="mr-2 h-4 w-4 animate-spin text-cyan-300" />Loading recorded protocol…</div> : <div className="grid gap-6 xl:grid-cols-[1.45fr_0.75fr]"><form onSubmit={event => { event.preventDefault(); if (selectedExperimentId && isReady) save.mutate({ experimentId: selectedExperimentId, ...draft }); }} className="rounded-2xl border border-white/8 bg-slate-900/40 p-5 sm:p-6"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-300/10"><ClipboardCheck className="h-5 w-5 text-cyan-200" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Versioned researcher input</p><h2 className="mt-1 font-display text-xl font-semibold text-white">Protocol revision</h2><p className="mt-1 text-sm leading-6 text-slate-400">Saving preserves these supplied statements as the next protocol version. Existing revisions remain in the history below.</p></div></div><div className="mt-6 space-y-5">{fields.map(field => <div key={field.key}><Label htmlFor={`protocol-${field.key}`} className="text-sm font-medium text-slate-200">{field.label}</Label><p className="mt-1 text-xs leading-5 text-slate-500">{field.hint}</p><Textarea id={`protocol-${field.key}`} value={draft[field.key]} minLength={8} required onChange={event => setDraft(current => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} className="mt-2 min-h-28 border-white/10 bg-slate-950/60 text-slate-100 placeholder:text-slate-600 focus-visible:ring-cyan-300/80" /></div>)}</div><div className="mt-6 flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-slate-500">Protocol completeness is about documented intent, not scientific quality or a prediction of results.</p><Button type="submit" disabled={!isReady || save.isPending} className="shrink-0 bg-cyan-300 text-slate-950 hover:bg-cyan-200 disabled:bg-slate-700 disabled:text-slate-300">{save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save new revision</Button></div></form><aside className="space-y-5"><section className="rounded-2xl border border-white/8 bg-slate-900/40 p-5"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-300/10"><ShieldCheck className="h-5 w-5 text-emerald-200" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Research integrity</p><h2 className="mt-1 font-display text-xl font-semibold text-white">What a protocol preserves</h2></div></div><ul className="mt-5 space-y-3 text-sm leading-6 text-slate-400"><li>Researcher-supplied intent before remote execution.</li><li>Version history instead of silent replacement.</li><li>Clear separation between planned review and returned evidence.</li><li>No default target metric, detector claim, or model outcome.</li></ul></section><section className="rounded-2xl border border-white/8 bg-slate-900/40 p-5"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-300/10"><History className="h-5 w-5 text-amber-200" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Revision history</p><h2 className="mt-1 font-display text-xl font-semibold text-white">Recorded versions</h2></div></div>{history.data?.length ? <ol className="mt-5 space-y-3">{history.data.map(revision => <li key={revision.id} className="rounded-xl border border-white/8 bg-slate-950/35 p-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-100">Version {revision.version}</span><FileClock className="h-4 w-4 text-slate-500" /></div><p className="mt-1 text-xs text-slate-500">Recorded {new Date(revision.createdAt).toLocaleString()}</p></li>)}</ol> : <p className="mt-5 text-sm leading-6 text-slate-400">No protocol revision has been recorded. The first save will become version 1.</p>}</section></aside></div>}</ExperimentGate></>;
}
