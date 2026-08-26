import { ExperimentGate, PageHeading } from "@/components/ResearchShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useResearch } from "@/contexts/ResearchContext";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, CircleAlert, Download, FileJson2, Fingerprint, Link2, Loader2, ShieldCheck, Workflow } from "lucide-react";
import { toast } from "sonner";

type LedgerStatus = "present" | "missing" | "attention";

const statusStyle: Record<LedgerStatus, string> = {
  present: "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-100",
  missing: "border-slate-400/20 bg-slate-400/[0.06] text-slate-200",
  attention: "border-amber-300/20 bg-amber-300/[0.07] text-amber-100",
};

function downloadManifest(fileName: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function Reproducibility() {
  const { selectedExperimentId } = useResearch();
  const ledger = trpc.research.reproducibility.ledger.useQuery({ experimentId: selectedExperimentId ?? 1 }, { enabled: Boolean(selectedExperimentId) });
  const manifest = trpc.research.reproducibility.manifest.useMutation({
    onSuccess: result => {
      downloadManifest(result.fileName, result.content);
      toast.success("Reproducibility manifest downloaded");
    },
    onError: error => toast.error(error.message),
  });
  const data = ledger.data;

  return <><PageHeading eyebrow="Research integrity" title="Reproducibility Ledger" description="An evidence-only ledger of dataset provenance, configuration lineage, run outcomes, interpretation, and exports. It reports only stored records and never substitutes missing scientific evidence.">
    <Button onClick={() => selectedExperimentId && manifest.mutate({ experimentId: selectedExperimentId })} disabled={!data?.hasActualEvidence || manifest.isPending} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200 disabled:bg-slate-700 disabled:text-slate-300">
      {manifest.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Export JSON manifest
    </Button>
  </PageHeading>
    <ExperimentGate>{ledger.isLoading ? <div aria-busy="true" className="grid min-h-80 place-items-center rounded-2xl border border-white/8 bg-slate-900/40 text-sm text-slate-400"><Loader2 className="mr-2 h-4 w-4 animate-spin text-cyan-300" />Reading stored research evidence…</div> : data ? <div className="space-y-6"><section className="relative overflow-hidden rounded-3xl border border-cyan-200/15 bg-[radial-gradient(circle_at_84%_8%,rgba(34,211,238,0.16),transparent_28%),linear-gradient(135deg,#111b2a_0%,#0c1624_74%,#0b1420_100%)] p-6 sm:p-8"><div aria-hidden="true" className="absolute -right-12 -top-12 h-48 w-48 rounded-full border border-cyan-200/10" /><div className="relative grid gap-6 lg:grid-cols-[1fr_auto]"><div><div className="flex items-center gap-2 text-xs font-semibold text-cyan-200"><ShieldCheck className="h-4 w-4" />EVIDENCE BOUNDARY</div><h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em] text-white">{data.coverage} of {data.totalChecks} provenance checks recorded</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Coverage measures record linkage only—not detector performance, model quality, or scientific validity. Missing evidence stays visible as missing.</p></div><div className="flex items-end"><Badge className="border border-cyan-200/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">{data.hasActualEvidence ? "Actual records available" : "Awaiting real records"}</Badge></div></div></section>
      <section aria-labelledby="ledger-checks-title" className="rounded-2xl border border-white/8 bg-slate-900/40 p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Evidence map</p><h2 id="ledger-checks-title" className="mt-1 font-display text-xl font-semibold text-white">Lineage and completeness checks</h2></div><Workflow className="h-5 w-5 text-cyan-300" /></div><div className="mt-6 grid gap-3 lg:grid-cols-2">{data.checks.map(item => <article key={item.id} className={`rounded-xl border p-4 ${statusStyle[item.status]}`}><div className="flex items-start gap-3"><div className="mt-0.5">{item.status === "present" ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}</div><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{item.title}</h3><span className="rounded-full border border-current/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]">{item.status}</span></div><p className="mt-2 text-xs leading-5 opacity-80">{item.detail}</p></div></div></article>)}</div></section>
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]"><article className="rounded-2xl border border-white/8 bg-slate-900/40 p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/10"><Link2 className="h-5 w-5 text-cyan-200" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Export contract</p><h2 className="mt-1 font-display text-xl font-semibold text-white">Portable, scope-limited evidence manifest</h2></div></div><p className="mt-5 text-sm leading-6 text-slate-400">The JSON manifest contains only stored experiment identifiers, timestamps, linkage, returned canonical metric fields when present, and track-point counts. It omits credentials, raw dataset bytes, stored file URLs, and any inferred values.</p><div className="mt-5 flex items-center gap-2 text-xs text-slate-500"><FileJson2 className="h-4 w-4 text-cyan-300" />Schema: <code className="rounded bg-slate-950/60 px-2 py-1 text-cyan-100">tracklab-reproducibility-ledger/v1</code></div></article><article className="rounded-2xl border border-white/8 bg-slate-900/40 p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-300/10"><Fingerprint className="h-5 w-5 text-amber-200" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Integrity rule</p><h2 className="mt-1 font-display text-xl font-semibold text-white">Absence is surfaced, not filled</h2></div></div><p className="mt-5 text-sm leading-6 text-slate-400">This ledger never assumes a successful run, metric, reconstructed coordinate, report, or interpretation. Add genuine research records to improve coverage.</p></article></section>
    </div> : null}</ExperimentGate></>;
}
