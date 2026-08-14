import { EmptyResearchState, ExperimentGate, PageHeading } from "@/components/ResearchShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useResearch } from "@/contexts/ResearchContext";
import { trpc } from "@/lib/trpc";
import { Braces, Cpu, ExternalLink, Loader2, Save } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

const VERIFIED_MODEL_REFERENCE = "jpata/particleflow";

export default function Models() {
  const { selectedExperimentId } = useResearch();
  const configs = trpc.research.modelConfigurations.list.useQuery({ experimentId: selectedExperimentId ?? 1 }, { enabled: Boolean(selectedExperimentId) });
  const create = trpc.research.modelConfigurations.create.useMutation({
    onSuccess: () => { configs.refetch(); setName(""); setModelId(""); setHyperparameters("{}"); toast.success("Model configuration saved"); },
    onError: error => toast.error(error.message),
  });
  const [name, setName] = useState("");
  const [modelId, setModelId] = useState("");
  const [hyperparameters, setHyperparameters] = useState("{}");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (selectedExperimentId) create.mutate({ experimentId: selectedExperimentId, name, huggingFaceModelId: modelId, hyperparameters });
  };

  return <>
    <PageHeading eyebrow="Model registry" title="Particle-tracking configurations" description="Record the selected Hugging Face model and its exact hyperparameters, creating a reproducible configuration for each experimental run." />
    <ExperimentGate>
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.4fr]">
        <form onSubmit={submit} className="rounded-2xl border border-white/8 bg-slate-900/40 p-6">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/10"><Cpu className="h-5 w-5 text-cyan-200" /></div><div><h2 className="font-display text-xl font-semibold text-white">Save configuration</h2><p className="mt-1 text-xs text-slate-500">Hugging Face model reference required</p></div></div>
          <div className="mt-6 space-y-4">
            <div><Label htmlFor="configuration-name">Configuration name</Label><Input id="configuration-name" value={name} onChange={event => setName(event.target.value)} placeholder="Detector baseline" required className="mt-1.5 border-white/10 bg-slate-950/50 text-white" /></div>
            <div><Label htmlFor="model-id">Hugging Face model ID</Label><Input id="model-id" value={modelId} onChange={event => setModelId(event.target.value)} placeholder={`e.g. ${VERIFIED_MODEL_REFERENCE}`} required className="mt-1.5 border-white/10 bg-slate-950/50 text-white" /></div>
            <div><Label htmlFor="hyperparameters">Hyperparameters and reproducibility metadata (JSON; optional _huggingFaceJob)</Label><Textarea id="hyperparameters" value={hyperparameters} onChange={event => setHyperparameters(event.target.value)} className="mt-1.5 min-h-36 font-mono text-xs border-white/10 bg-slate-950/50 text-white" required /><p className="mt-2 text-xs leading-5 text-slate-500">Record <code className="text-cyan-200">modelRevision</code>, <code className="text-cyan-200">dataRevision</code>, <code className="text-cyan-200">randomSeed</code>, and the exact <code className="text-cyan-200">_huggingFaceJob.command</code> before a real run.</p></div>
          </div>
          <a href="https://huggingface.co/jpata/particleflow" target="_blank" rel="noreferrer" className="mt-4 flex gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.035] p-3 text-xs leading-5 text-slate-400 transition hover:border-cyan-300/35"><ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" /><span><strong className="font-semibold text-cyan-100">Verified public reference:</strong> <span className="font-mono">{VERIFIED_MODEL_REFERENCE}</span> documents full HEP event reconstruction. It is a reference only; select it only if its data contract matches your experiment.</span></a>
          <p className="mt-3 text-xs leading-5 text-slate-500">When you provide the single access token, add a <code className="text-cyan-200">_huggingFaceJob</code> object with image and command to start a real hosted job; otherwise runs stay queued.</p>
          <Button disabled={create.isPending} className="mt-5 w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">{create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save configuration</Button>
        </form>
        <section className="rounded-2xl border border-white/8 bg-slate-900/40 p-6"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Saved configurations</p><h2 className="mt-1 font-display text-xl font-semibold text-white">Model parameter records</h2>{configs.data?.length ? <div className="mt-5 space-y-3">{configs.data.map(config => <article key={config.id} className="rounded-xl border border-white/8 bg-slate-950/30 p-4"><div className="flex items-start gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5"><Braces className="h-4 w-4 text-cyan-300" /></div><div className="min-w-0"><h3 className="text-sm font-semibold text-slate-200">{config.name}</h3><p className="mt-1 break-all font-mono text-xs text-cyan-300">{config.huggingFaceModelId}</p><pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-black/20 p-3 text-[11px] leading-5 text-slate-400">{config.hyperparameters}</pre></div></div></article>)}</div> : <div className="mt-6"><EmptyResearchState title="No model configurations" description="Save the model ID and hyperparameters that should be used for the next particle tracking run." /></div>}</section>
      </div>
    </ExperimentGate>
  </>;
}
