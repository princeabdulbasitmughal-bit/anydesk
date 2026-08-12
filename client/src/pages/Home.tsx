import { EmptyResearchState, ExperimentGate, MetricCard, PageHeading } from "@/components/ResearchShell";
import { Badge } from "@/components/ui/badge";
import { useResearch } from "@/contexts/ResearchContext";
import { trpc } from "@/lib/trpc";
import { Activity, ArrowUpRight, Atom, Database, FlaskConical, Gauge } from "lucide-react";

function StatusBadge({ status }: { status: "queued" | "running" | "completed" | "failed" }) {
  const styles = { queued: "border-slate-500/30 bg-slate-500/10 text-slate-300", running: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200", completed: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200", failed: "border-rose-400/30 bg-rose-400/10 text-rose-200" };
  return <Badge className={`border px-2 py-0.5 text-[10px] font-bold lowercase tracking-wide ${styles[status]}`}>{status}</Badge>;
}

export default function Home() {
  const { selectedExperiment, selectedExperimentId } = useResearch();
  const runs = trpc.research.runs.list.useQuery({ experimentId: selectedExperimentId ?? undefined });
  const latestRun = runs.data?.[0];
  const metrics = trpc.research.results.metrics.useQuery({ runId: latestRun?.id ?? 1 }, { enabled: Boolean(latestRun) });
  const metric = metrics.data;
  const recentRuns = runs.data?.slice(0, 6) ?? [];
  const formatMetric = (value: string | null | undefined) => value ? `${(Number(value) * 100).toFixed(2)}%` : "—";

  return (
    <>
      <PageHeading eyebrow="Particle Physics Research" title="Experiment command center" description="A focused workspace for particle-track reconstruction experiments, bringing research data, model settings, runs, and scientific interpretation into one protected environment." />
      <ExperimentGate>
        <section className="relative overflow-hidden rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_72%_10%,rgba(20,184,166,0.20),transparent_28%),linear-gradient(135deg,#111b2a_0%,#0d1420_60%,#111d2d_100%)] p-7 sm:p-9">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full border border-cyan-200/10" /><div className="absolute right-12 top-11 h-24 w-24 rounded-full border border-cyan-200/15" />
          <div className="relative max-w-2xl"><div className="flex items-center gap-2 text-xs font-semibold text-cyan-200"><Atom className="h-4 w-4" />ACTIVE EXPERIMENT</div><h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em] text-white">{selectedExperiment?.title}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">{selectedExperiment?.description || "No experiment summary has been recorded yet. Add datasets and a model configuration to begin a reproducible run."}</p></div>
        </section>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total runs" value={String(runs.data?.length ?? 0)} note="Within current experiment" /><MetricCard label="Accuracy" value={formatMetric(metric?.accuracy)} note="Latest returned metric" /><MetricCard label="Efficiency" value={formatMetric(metric?.efficiency)} note="Latest returned metric" /><MetricCard label="Fake rate" value={formatMetric(metric?.fakeRate)} note="Latest returned metric" /></div>
        <section className="mt-8 grid gap-5 xl:grid-cols-[1.5fr_0.8fr]">
          <article className="rounded-2xl border border-white/8 bg-slate-900/40 p-6"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Run history</p><h2 className="mt-1 font-display text-xl font-semibold text-white">Recent experiment runs</h2></div><Activity className="h-5 w-5 text-cyan-300" /></div>{recentRuns.length ? <div className="mt-6 divide-y divide-white/7">{recentRuns.map(run => <div key={run.id} className="flex items-center justify-between gap-4 py-3.5"><div><p className="text-sm font-medium text-slate-200">Run #{run.id} <span className="ml-2 text-xs lowercase text-slate-500">{run.runType}</span></p><p className="mt-1 text-xs text-slate-500">Queued {new Date(run.queuedAt).toLocaleString()}</p></div><StatusBadge status={run.status} /></div>)}</div> : <div className="mt-6"><EmptyResearchState title="No runs recorded" description="Create a model configuration and attach a supported dataset before triggering training or inference." /></div>}</article>
          <article className="rounded-2xl border border-white/8 bg-slate-900/40 p-6"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Research flow</p><h2 className="mt-1 font-display text-xl font-semibold text-white">Current readiness</h2><div className="mt-6 space-y-4">{[{ icon: Database, text: "Datasets", value: "CSV, JSON, HDF5" }, { icon: Gauge, text: "Model configurations", value: "Hugging Face ready" }, { icon: FlaskConical, text: "Findings & reports", value: "Markdown or PDF" }].map(item => <div key={item.text} className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5"><item.icon className="h-4 w-4 text-cyan-300" /></div><div><p className="text-sm font-medium text-slate-200">{item.text}</p><p className="text-xs text-slate-500">{item.value}</p></div><ArrowUpRight className="ml-auto h-4 w-4 text-slate-600" /></div>)}</div></article>
        </section>
      </ExperimentGate>
    </>
  );
}
