import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useResearch } from "@/contexts/ResearchContext";
import { trpc } from "@/lib/trpc";
import { getExperimentGateContent } from "@shared/experimentGateContent";
import { Plus, Search, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export function PageHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-5 border-b border-white/8 pb-7 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300">{eyebrow}</p>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
      </div>
      {children ? <div className="flex shrink-0 flex-wrap items-center gap-3">{children}</div> : null}
    </header>
  );
}

export function EmptyResearchState({ title, description, eyebrow, artifactLabel, artifactTitle, artifactDescription, markers }: { title: string; description: string; eyebrow?: string; artifactLabel?: string; artifactTitle?: string; artifactDescription?: string; markers?: readonly string[] }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-cyan-200/20 bg-[radial-gradient(circle_at_82%_18%,rgba(34,211,238,0.12),transparent_24%),linear-gradient(135deg,rgba(15,23,42,0.72),rgba(8,15,27,0.9))] px-6 py-9 text-left sm:px-8 sm:py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(103,232,249,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.07)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div aria-hidden="true" className="pointer-events-none absolute right-6 top-5 hidden h-40 w-52 items-center justify-center sm:flex">
        <span className="absolute h-36 w-36 rounded-full border border-cyan-200/15" />
        <span className="absolute h-24 w-24 rounded-full border border-cyan-200/25" />
        <span className="absolute h-px w-48 rotate-[-23deg] bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />
        <span className="absolute left-[66%] top-[27%] h-2.5 w-2.5 rounded-full bg-cyan-200 shadow-[0_0_20px_rgba(103,232,249,0.9)]" />
        <span className="absolute left-[41%] top-[62%] h-1.5 w-1.5 rounded-full bg-teal-200 shadow-[0_0_16px_rgba(94,234,212,0.9)]" />
      </div>
      <div className="relative max-w-2xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-300/10 text-cyan-100"><Search className="h-5 w-5" /></div>
        {eyebrow ? <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-200">{eyebrow}</p> : null}
        <h2 className="mt-2 font-display text-xl font-semibold tracking-[-0.02em] text-white">{title}</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">{description}</p>
        {artifactTitle && artifactDescription ? <div className="mt-6 rounded-xl border border-white/8 bg-slate-950/35 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{artifactLabel ?? "Research boundary"}</p><p className="mt-2 text-sm font-medium text-slate-100">{artifactTitle}</p><p className="mt-1 text-xs leading-5 text-slate-400">{artifactDescription}</p></div> : null}
        {markers?.length ? <div className="mt-5 flex flex-wrap gap-2">{markers.map(marker => <span key={marker} className="rounded-full border border-cyan-200/10 bg-cyan-300/[0.055] px-2.5 py-1 text-[10px] font-medium tracking-[0.08em] text-cyan-100">{marker}</span>)}</div> : null}
      </div>
    </div>
  );
}

export function ExperimentGate({ children }: { children: React.ReactNode }) {
  const { selectedExperiment, isLoading } = useResearch();
  const [location] = useLocation();
  if (isLoading) return <div className="h-52 animate-pulse rounded-2xl bg-slate-800/50" />;
  if (!selectedExperiment) return <EmptyResearchState {...getExperimentGateContent(location)} />;
  return <>{children}</>;
}

export function ExperimentSelector() {
  const { experiments, selectedExperimentId, setSelectedExperimentId, refreshExperiments } = useResearch();
  const createExperiment = trpc.research.experiments.create.useMutation({
    onSuccess: async () => {
      await refreshExperiments();
      setOpen(false);
      setTitle("");
      setDescription("");
      toast.success("Experiment created");
    },
    onError: error => toast.error(error.message),
  });
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    createExperiment.mutate({ title, description });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label="Current experiment" value={selectedExperimentId ?? "none"} onChange={event => setSelectedExperimentId(Number(event.target.value))} className="h-9 max-w-56 rounded-lg border border-white/10 bg-slate-900 px-3 text-xs font-medium text-slate-200 outline-none transition focus:border-cyan-400/70">
        {experiments.length ? experiments.map(experiment => <option className="bg-slate-900" key={experiment.id} value={experiment.id}>{experiment.title}</option>) : <option className="bg-slate-900" value="none">No experiment</option>}
      </select>
      <Button type="button" size="sm" onClick={() => setOpen(value => !value)} className="h-9 bg-cyan-300 px-3 text-slate-950 hover:bg-cyan-200"><Plus className="mr-1.5 h-3.5 w-3.5" />New experiment</Button>
      {open ? (
        <form onSubmit={submit} className="absolute right-5 top-16 z-50 w-[min(92vw,420px)] rounded-2xl border border-white/10 bg-[#111a28] p-5 shadow-2xl shadow-black/40">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white"><Sparkles className="h-4 w-4 text-cyan-300" />New research experiment</div>
          <div className="space-y-3"><div><Label htmlFor="experiment-title">Title</Label><Input id="experiment-title" value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Silicon detector reconstruction" required className="mt-1.5 border-white/10 bg-slate-950/70 text-white" /></div><div><Label htmlFor="experiment-description">Description</Label><Textarea id="experiment-description" value={description} onChange={event => setDescription(event.target.value)} placeholder="Scope, detector conditions, or analysis target" className="mt-1.5 min-h-24 border-white/10 bg-slate-950/70 text-white" /></div></div>
          <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-slate-300 hover:bg-white/5 hover:text-white">Cancel</Button><Button disabled={createExperiment.isPending} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">Create experiment</Button></div>
        </form>
      ) : null}
    </div>
  );
}

export function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <article className="rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.06] to-white/[0.025] p-5 shadow-[0_16px_48px_rgba(0,0,0,0.12)]"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p><p className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-white">{value}</p><p className="mt-2 text-xs text-slate-400">{note}</p></article>;
}
