import { EmptyResearchState, ExperimentGate, PageHeading } from "@/components/ResearchShell";
import { useResearch } from "@/contexts/ResearchContext";
import { trpc } from "@/lib/trpc";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEffect, useMemo, useState } from "react";

const metricLabels = {
  accuracy: "accuracy",
  efficiency: "efficiency",
  fakeRate: "fake rate",
} as const;

type MetricKey = keyof typeof metricLabels;

function asRecordedMetric(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 && numericValue <= 1 ? numericValue : null;
}

export default function Results() {
  const { selectedExperimentId } = useResearch();
  const runs = trpc.research.runs.list.useQuery({ experimentId: selectedExperimentId ?? undefined });
  const [runId, setRunId] = useState<number | null>(null);
  useEffect(() => { if (runs.data?.length && !runId) setRunId(runs.data[0].id); }, [runs.data, runId]);
  const metrics = trpc.research.results.metrics.useQuery({ runId: runId ?? 1 }, { enabled: Boolean(runId) });
  const chartData = useMemo(() => {
    const metricRecord = metrics.data;
    if (!metricRecord) return [];
    return (Object.keys(metricLabels) as MetricKey[]).flatMap(key => {
      const value = asRecordedMetric(metricRecord[key]);
      return value === null ? [] : [{ name: metricLabels[key], value }];
    });
  }, [metrics.data]);

  return <>
    <PageHeading eyebrow="Evaluation" title="Results viewer" description="Inspect evaluation metrics and structured output records on a per-run basis. Values appear only when returned by the configured execution job." />
    <ExperimentGate>
      {runs.data?.length ? <section className="rounded-2xl border border-white/8 bg-slate-900/40 p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Selected run</p><h2 className="mt-1 font-display text-xl font-semibold text-white">Evaluation metrics</h2></div><select aria-label="Select run" value={runId ?? ""} onChange={event => setRunId(Number(event.target.value))} className="h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-300/70">{runs.data.map(run => <option className="bg-slate-900" value={run.id} key={run.id}>Run #{run.id} · {run.runType} · {run.status}</option>)}</select></div>
        {metrics.data && chartData.length ? <div className="mt-7 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><div className="h-72 rounded-xl bg-slate-950/30 p-3"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}><CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} /><XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis domain={[0, 1]} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12 }} formatter={(value: number) => `${(value * 100).toFixed(2)}%`} /><Bar dataKey="value" radius={[8, 8, 2, 2]}>{chartData.map((item, index) => <Cell key={item.name} fill={["#67e8f9", "#5eead4", "#fda4af"][index]} />)}</Bar></BarChart></ResponsiveContainer></div><div className="overflow-x-auto rounded-xl border border-white/8"><table className="w-full text-left"><caption className="sr-only">Actual evaluation values returned for the selected run</caption><thead className="bg-white/[0.025] text-[10px] uppercase tracking-[0.16em] text-slate-500"><tr><th className="p-4">Metric</th><th className="p-4 text-right">Value</th></tr></thead><tbody className="divide-y divide-white/7">{chartData.map(row => <tr key={row.name}><td className="p-4 text-sm text-slate-300">{row.name}</td><td className="p-4 text-right font-mono text-sm text-cyan-200">{(row.value * 100).toFixed(3)}%</td></tr>)}</tbody></table></div></div> : <div className="mt-7"><EmptyResearchState title="No numeric metrics returned for this run" description="TrackLab does not substitute missing accuracy, efficiency, or fake-rate values with zero. Once the selected run returns actual numeric evaluation evidence, it will appear here." /></div>}
      </section> : <EmptyResearchState title="No runs available" description="Trigger a training or inference run before opening the results viewer." />}
    </ExperimentGate>
  </>;
}
