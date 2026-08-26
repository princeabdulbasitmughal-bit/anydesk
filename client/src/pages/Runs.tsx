import { EmptyResearchState, ExperimentGate, PageHeading } from "@/components/ResearchShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useResearch } from "@/contexts/ResearchContext";
import { trpc } from "@/lib/trpc";
import { getRunPrerequisites } from "@shared/researchInputRules";
import { CheckCircle2, CircleAlert, CirclePlay, Clock3, Loader2, PackageOpen, ShieldCheck, Workflow } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const statusClass = {
  queued: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  running: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  completed: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  failed: "border-rose-400/30 bg-rose-400/10 text-rose-200",
};

export default function Runs() {
  const { selectedExperimentId } = useResearch();
  const datasets = trpc.research.datasets.list.useQuery({ experimentId: selectedExperimentId ?? 1 }, { enabled: Boolean(selectedExperimentId) });
  const configs = trpc.research.modelConfigurations.list.useQuery({ experimentId: selectedExperimentId ?? 1 }, { enabled: Boolean(selectedExperimentId) });
  const protocols = trpc.research.protocols.list.useQuery({ experimentId: selectedExperimentId ?? 1 }, { enabled: Boolean(selectedExperimentId) });
  const runs = trpc.research.runs.list.useQuery({ experimentId: selectedExperimentId ?? undefined });
  const [datasetId, setDatasetId] = useState("");
  const [configurationId, setConfigurationId] = useState("");
  const [protocolRevisionId, setProtocolRevisionId] = useState("");
  const [runType, setRunType] = useState<"training" | "inference">("training");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const selectedExperimentRef = useRef(selectedExperimentId);
  useEffect(() => { selectedExperimentRef.current = selectedExperimentId; setDatasetId(""); setConfigurationId(""); setProtocolRevisionId(""); setReviewOpen(false); setAcknowledged(false); }, [selectedExperimentId]);

  const trigger = trpc.research.runs.trigger.useMutation({
    onSuccess: (_result, variables) => {
      if (variables.experimentId !== selectedExperimentRef.current) return;
      setReviewOpen(false);
      setAcknowledged(false);
      runs.refetch();
      toast.success("Run added to the queue");
    },
    onError: error => toast.error(error.message),
  });
  const prerequisites = [...getRunPrerequisites(Boolean(datasets.data?.length), Boolean(configs.data?.length)), { id: "protocol", label: "Protocol revision", ready: Boolean(protocols.data?.length), description: "Record a researcher-authored protocol before queueing a run." }];
  const canStart = prerequisites.every(prerequisite => prerequisite.ready);
  const selectedDataset = datasets.data?.find(item => item.id === Number(datasetId));
  const selectedConfiguration = configs.data?.find(item => item.id === Number(configurationId));
  const selectedProtocol = protocols.data?.find(item => item.id === Number(protocolRevisionId));
  const canReview = canStart && Boolean(selectedExperimentId && selectedDataset && selectedConfiguration && selectedProtocol);

  const openReview = (event: FormEvent) => {
    event.preventDefault();
    if (!canReview) return;
    setAcknowledged(false);
    setReviewOpen(true);
  };
  const confirmRun = () => {
    if (!selectedExperimentId || !selectedDataset || !selectedConfiguration || !selectedProtocol || !acknowledged) return;
    trigger.mutate({ experimentId: selectedExperimentId, datasetId: selectedDataset.id, modelConfigurationId: selectedConfiguration.id, protocolRevisionId: selectedProtocol.id, runType });
  };
  const closeReview = (open: boolean) => {
    setReviewOpen(open);
    if (!open) setAcknowledged(false);
  };

  return <>
    <PageHeading eyebrow="Experiment operations" title="Run manager" description="Trigger a training or inference job from an approved dataset and a versioned model configuration. Every run remains traceable in its experiment record." />
    <ExperimentGate>
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.4fr]">
        <form onSubmit={openReview} className="rounded-2xl border border-cyan-300/15 bg-gradient-to-b from-cyan-300/[0.06] to-slate-900/40 p-6">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/10"><CirclePlay className="h-5 w-5 text-cyan-200" /></div><div><h2 className="font-display text-xl font-semibold text-white">Trigger a new run</h2><p className="mt-1 text-xs text-slate-500">Training and inference only</p></div></div>
          <div className="mt-5 rounded-xl border border-white/8 bg-slate-950/30 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Run readiness</p><div className="mt-3 space-y-2">{prerequisites.map(prerequisite => <div key={prerequisite.id} className={`flex items-start gap-2 text-xs ${prerequisite.ready ? "text-emerald-100" : "text-slate-400"}`}>{prerequisite.ready ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" /> : <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />}<span><strong className="font-medium">{prerequisite.label}</strong><span className="text-slate-500"> · {prerequisite.ready ? "ready" : prerequisite.description}</span></span></div>)}</div></div>
          <div className="mt-6 space-y-4">
            <div><Label htmlFor="run-dataset">Dataset</Label><select id="run-dataset" value={datasetId} onChange={event => setDatasetId(event.target.value)} required className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-cyan-300/60"><option value="" className="bg-slate-900">Select dataset</option>{datasets.data?.map(item => <option key={item.id} className="bg-slate-900" value={item.id}>{item.name}</option>)}</select></div>
            <div><Label htmlFor="run-config">Model configuration</Label><select id="run-config" value={configurationId} onChange={event => setConfigurationId(event.target.value)} required className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-cyan-300/60"><option value="" className="bg-slate-900">Select configuration</option>{configs.data?.map(item => <option key={item.id} className="bg-slate-900" value={item.id}>{item.name}</option>)}</select></div>
            <div><Label htmlFor="run-protocol">Protocol revision</Label><select id="run-protocol" value={protocolRevisionId} onChange={event => setProtocolRevisionId(event.target.value)} required className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-cyan-300/60"><option value="" className="bg-slate-900">Select a saved protocol revision</option>{protocols.data?.map(item => <option key={item.id} className="bg-slate-900" value={item.id}>Version {item.version} · recorded {new Date(item.createdAt).toLocaleDateString()}</option>)}</select><p className="mt-1.5 text-xs leading-5 text-slate-500">This records the exact researcher-authored plan linked to the future run; no revision is chosen automatically.</p></div>
            <div><Label htmlFor="run-type">Run type</Label><select id="run-type" value={runType} onChange={event => setRunType(event.target.value as "training" | "inference")} className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-cyan-300/60"><option className="bg-slate-900" value="training">training</option><option className="bg-slate-900" value="inference">inference</option></select></div>
          </div>
          <Button disabled={!canReview || trigger.isPending} className="mt-6 w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">{trigger.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Review &amp; queue run</Button>
          {!canStart ? <p className="mt-3 text-xs leading-5 text-slate-500">Resolve each prerequisite above before triggering a run.</p> : null}
          {canStart && !canReview ? <p className="mt-3 text-xs leading-5 text-slate-500">Select a dataset, versioned configuration, and saved protocol revision to review the run.</p> : null}
        </form>
        <section className="rounded-2xl border border-white/8 bg-slate-900/40 p-6">
          <div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-cyan-300" /><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Run history</p><h2 className="mt-1 font-display text-xl font-semibold text-white">Execution timeline</h2></div></div>
          {runs.data?.length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[640px] text-left"><thead className="text-[10px] uppercase tracking-[0.16em] text-slate-500"><tr><th className="pb-3 font-semibold">Run</th><th className="pb-3 font-semibold">Protocol</th><th className="pb-3 font-semibold">Type</th><th className="pb-3 font-semibold">Status</th><th className="pb-3 font-semibold">Queued at</th><th className="pb-3 font-semibold"></th></tr></thead><tbody className="divide-y divide-white/7">{runs.data.map(run => <tr key={run.id}><td className="py-4 text-sm font-medium text-slate-200">#{run.id}</td><td className="py-4 text-xs text-slate-400">{run.protocolRevisionId ? `Revision #${run.protocolRevisionId}` : "Not linked (legacy)"}</td><td className="py-4 text-sm lowercase text-slate-400">{run.runType}</td><td className="py-4"><Badge className={`border px-2 py-0.5 text-[10px] font-bold lowercase ${statusClass[run.status]}`}>{run.status}</Badge></td><td className="py-4 text-xs text-slate-500">{new Date(run.queuedAt).toLocaleString()}</td><td className="py-4 text-right">{run.modelArtifactUrl ? <a className="inline-flex items-center gap-1 text-xs text-cyan-300" href={run.modelArtifactUrl}><PackageOpen className="h-3.5 w-3.5" />Artifact</a> : null}</td></tr>)}</tbody></table></div> : <div className="mt-6"><EmptyResearchState title="No experiment runs" description="Once a researcher triggers training or inference, its exact status will be recorded here." /></div>}
        </section>
      </div>
    </ExperimentGate>
    <Dialog open={reviewOpen} onOpenChange={closeReview}>
      <DialogContent className="border-cyan-300/20 bg-slate-950 text-slate-100 sm:max-w-xl">
        <DialogHeader><div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/10"><ShieldCheck className="h-5 w-5 text-cyan-200" /></div><DialogTitle className="font-display text-xl text-white">Run launch review</DialogTitle><DialogDescription className="leading-6 text-slate-400">Confirm the research inputs before TrackLab records this submission and, where authorized, submits the configured remote job.</DialogDescription></DialogHeader>
        <dl className="grid gap-3 rounded-xl border border-white/10 bg-slate-900/60 p-4 text-sm sm:grid-cols-2"><div><dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Dataset</dt><dd className="mt-1 break-words font-medium text-slate-100">{selectedDataset?.name}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Configuration</dt><dd className="mt-1 break-words font-medium text-slate-100">{selectedConfiguration?.name}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Protocol revision</dt><dd className="mt-1 font-medium text-slate-100">Version {selectedProtocol?.version}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Run type</dt><dd className="mt-1 font-medium capitalize text-slate-100">{runType}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Initial status</dt><dd className="mt-1 font-medium text-slate-100">queued</dd></div></dl>
        <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm leading-6 text-amber-50"><strong className="font-semibold">Execution boundary.</strong> Without an owner-authorized Hugging Face token and a model-specific job contract, this run remains queued. With both configured, the submission can request remote compute; results, metrics, and tracks are recorded only from an actual returned payload.</div>
        <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-900/40 p-4"><Checkbox id="run-launch-acknowledgement" checked={acknowledged} onCheckedChange={value => setAcknowledged(value === true)} className="mt-0.5 border-slate-500 data-[state=checked]:bg-cyan-300 data-[state=checked]:text-slate-950" /><Label htmlFor="run-launch-acknowledgement" className="cursor-pointer text-sm leading-6 text-slate-200">I confirm that this submission uses the selected dataset, versioned configuration, and researcher-authored protocol revision. I understand that authorized remote execution may consume provider resources.</Label></div>
        <DialogFooter><DialogClose asChild><Button type="button" variant="outline" className="border-white/15 text-slate-200 hover:bg-white/5">Back to edit</Button></DialogClose><Button type="button" onClick={confirmRun} disabled={!acknowledged || trigger.isPending} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{trigger.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Workflow className="mr-2 h-4 w-4" />}Queue verified run</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
