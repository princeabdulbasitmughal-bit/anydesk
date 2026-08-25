import { EmptyResearchState, ExperimentGate, PageHeading } from "@/components/ResearchShell";
import { useResearch } from "@/contexts/ResearchContext";
import { trpc } from "@/lib/trpc";
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { useEffect, useMemo, useState } from "react";

const palette = ["#67e8f9", "#5eead4", "#c4b5fd", "#fda4af", "#fcd34d", "#86efac"];

function asRecordedCoordinate(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export default function Tracks() {
  const { selectedExperimentId } = useResearch();
  const runs = trpc.research.runs.list.useQuery({ experimentId: selectedExperimentId ?? undefined });
  const [runId, setRunId] = useState<number | null>(null);
  useEffect(() => { if (runs.data?.length && !runId) setRunId(runs.data[0].id); }, [runs.data, runId]);
  const points = trpc.research.tracks.list.useQuery({ runId: runId ?? 1 }, { enabled: Boolean(runId) });
  const trackEvidence = useMemo(() => {
    const grouped = new Map<string, Array<{ x: number; y: number; z: number }>>();
    let excludedPointCount = 0;
    points.data?.forEach(point => {
      const x = asRecordedCoordinate(point.x);
      const y = asRecordedCoordinate(point.y);
      const z = asRecordedCoordinate(point.z);
      if (x === null || y === null || z === null) {
        excludedPointCount += 1;
        return;
      }
      const series = grouped.get(point.trackId) ?? [];
      series.push({ x, y, z });
      grouped.set(point.trackId, series);
    });
    return { groups: Array.from(grouped.entries()), excludedPointCount };
  }, [points.data]);
  const groups = trackEvidence.groups;
  const projected = useMemo(() => groups.map(([id, series]: [string, Array<{ x: number; y: number; z: number }>]) => [id, series.map((point: { x: number; y: number; z: number }) => ({ u: point.x - point.z * 0.45, v: point.y - point.z * 0.3, z: point.z }))] as const), [groups]);

  return <>
    <PageHeading eyebrow="Inference output" title="Track visualization" description="Explore reconstructed particle tracks in detector-plane coordinates and an isometric three-dimensional projection." />
    <ExperimentGate>
      {runs.data?.length ? <section className="rounded-2xl border border-white/8 bg-slate-900/40 p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Selected inference output</p><h2 className="mt-1 font-display text-xl font-semibold text-white">Reconstructed track points</h2></div><select aria-label="Select track run" value={runId ?? ""} onChange={event => setRunId(Number(event.target.value))} className="h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-300/70">{runs.data.map(run => <option className="bg-slate-900" key={run.id} value={run.id}>Run #{run.id} · {run.runType} · {run.status}</option>)}</select></div>
        {trackEvidence.excludedPointCount ? <p role="status" className="mt-4 text-xs leading-5 text-amber-100/80">{trackEvidence.excludedPointCount} reconstructed point{trackEvidence.excludedPointCount === 1 ? "" : "s"} with missing or invalid coordinates {trackEvidence.excludedPointCount === 1 ? "was" : "were"} excluded rather than plotted as synthetic origin data.</p> : null}
        {groups.length ? <div className="mt-7 grid gap-5 xl:grid-cols-2">{[{ title: "2D projection", data: groups, x: "x", y: "y", xLabel: "x", yLabel: "y" }, { title: "3D projection", data: projected, x: "u", y: "v", xLabel: "x − 0.45z", yLabel: "y − 0.30z" }].map((plot, plotIndex) => <article key={plot.title} className="rounded-xl border border-white/8 bg-slate-950/30 p-4"><div className="mb-3 flex justify-between"><h3 className="font-display text-base font-semibold text-slate-200">{plot.title}</h3><span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{plot.xLabel} / {plot.yLabel}</span></div><div className="h-80"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 12, right: 12, bottom: 12, left: 0 }}><XAxis type="number" dataKey={plot.x} name={plot.xLabel} tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis type="number" dataKey={plot.y} name={plot.yLabel} tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} /><ZAxis type="number" dataKey="z" range={[28, 28]} /><Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12 }} />{plot.data.map(([trackId, data], index) => <Scatter key={trackId} name={trackId} data={data} fill={palette[index % palette.length]} />)}</ScatterChart></ResponsiveContainer></div><div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">{plot.data.map(([trackId], index) => <span key={trackId} className="flex items-center gap-1.5 text-[10px] text-slate-400"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} />{trackId}</span>)}</div></article>)}</div> : <div className="mt-7"><EmptyResearchState title="No valid reconstructed points for this run" description="Track scatters become available only when inference output contains stored finite reconstructed particle coordinates. Missing or invalid coordinates are never coerced into plotted origin points." /></div>}
      </section> : <EmptyResearchState title="No runs available" description="Trigger an inference run to inspect reconstructed track output." />}
    </ExperimentGate>
  </>;
}
