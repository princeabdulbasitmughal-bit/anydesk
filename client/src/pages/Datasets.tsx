import { EmptyResearchState, ExperimentGate, PageHeading } from "@/components/ResearchShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useResearch } from "@/contexts/ResearchContext";
import { trpc } from "@/lib/trpc";
import { formatDatasetSize, getDatasetFormatFromFilename, preflightDatasetFile } from "@shared/researchInputRules";
import { FileJson2, FileSpreadsheet, Files, HardDriveUpload, Loader2, ShieldCheck } from "lucide-react";
import { ChangeEvent, useState } from "react";
import { toast } from "sonner";

const formats = { csv: { icon: FileSpreadsheet, label: "CSV" }, json: { icon: FileJson2, label: "JSON" }, hdf5: { icon: Files, label: "HDF5" } };

export default function Datasets() {
  const { selectedExperimentId } = useResearch();
  const datasets = trpc.research.datasets.list.useQuery({ experimentId: selectedExperimentId ?? 1 }, { enabled: Boolean(selectedExperimentId) });
  const [file, setFile] = useState<File | null>(null);
  const upload = trpc.research.datasets.upload.useMutation({ onSuccess: () => { datasets.refetch(); setFile(null); toast.success("Dataset stored securely"); }, onError: error => toast.error(error.message) });
  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const candidate = event.target.files?.[0] ?? null;
    if (!candidate) { setFile(null); return; }
    const check = preflightDatasetFile(candidate.name, candidate.size);
    if (!check.ok) { setFile(null); event.target.value = ""; toast.error(check.error); return; }
    setFile(candidate);
  };
  const handleUpload = async () => {
    if (!file || !selectedExperimentId) return;
    const check = preflightDatasetFile(file.name, file.size);
    if (!check.ok) return toast.error(check.error);
    const reader = new FileReader();
    reader.onload = () => upload.mutate({ experimentId: selectedExperimentId, fileName: file.name, format: check.format, base64: String(reader.result) });
    reader.onerror = () => toast.error("Dataset could not be read.");
    reader.readAsDataURL(file);
  };
  const selectedFormat = file ? getDatasetFormatFromFilename(file.name) : null;
  return <><PageHeading eyebrow="Research data" title="Dataset library" description="Upload, inspect, and retrieve the source data that grounds every reconstruction and evaluation run." /><ExperimentGate><div className="grid gap-5 xl:grid-cols-[0.86fr_1.4fr]"><section className="rounded-2xl border border-dashed border-cyan-300/25 bg-cyan-300/[0.035] p-6"><HardDriveUpload className="h-7 w-7 text-cyan-300" /><h2 className="mt-5 font-display text-xl font-semibold text-white">Add a tracking dataset</h2><p className="mt-2 text-sm leading-6 text-slate-400">Accepted formats are strictly CSV, JSON, and HDF5. Files are saved to managed research storage.</p><div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full border border-cyan-200/10 bg-cyan-300/[0.06] px-2.5 py-1 text-[10px] font-medium tracking-[0.08em] text-cyan-100">CSV / JSON / HDF5</span><span className="rounded-full border border-cyan-200/10 bg-cyan-300/[0.06] px-2.5 py-1 text-[10px] font-medium tracking-[0.08em] text-cyan-100">25 MiB maximum</span></div><label className="mt-6 flex cursor-pointer items-center justify-center rounded-xl border border-white/12 bg-slate-950/40 px-4 py-7 text-center transition hover:border-cyan-300/50 focus-within:border-cyan-300/60"><span className="text-sm text-slate-300">{file ? file.name : "Select a dataset file"}</span><input type="file" accept=".csv,.json,.h5,.hdf5" onChange={selectFile} className="sr-only" /></label>{file && selectedFormat ? <div role="status" className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.045] px-3 py-2 text-xs text-emerald-100"><span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Client preflight passed</span><span className="font-mono text-emerald-200">{formats[selectedFormat].label} · {formatDatasetSize(file.size)}</span></div> : <p className="mt-3 text-xs leading-5 text-slate-500">The browser preflight checks file extension and size before encoding. The server remains the authoritative validator for file bytes and content.</p>}<Button onClick={handleUpload} disabled={!file || upload.isPending} className="mt-3 w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">{upload.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HardDriveUpload className="mr-2 h-4 w-4" />}Store dataset</Button></section><section className="rounded-2xl border border-white/8 bg-slate-900/40 p-6"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Stored files</p><h2 className="mt-1 font-display text-xl font-semibold text-white">Available datasets</h2></div><Badge variant="outline" className="border-white/10 text-slate-400">{datasets.data?.length ?? 0}</Badge></div>{datasets.data?.length ? <div className="mt-5 space-y-3">{datasets.data.map(dataset => { const spec = formats[dataset.format]; const Icon = spec.icon; const preview = JSON.parse(dataset.preview) as { summary: string; preview: string }; return <article key={dataset.id} className="rounded-xl border border-white/8 bg-slate-950/30 p-4"><div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10"><Icon className="h-4 w-4 text-cyan-200" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold text-slate-200">{dataset.name}</h3><Badge className="border border-white/10 bg-white/5 text-[10px] text-slate-300">{spec.label}</Badge></div><p className="mt-1 text-xs text-slate-500">{preview.summary}</p></div><a href={dataset.fileUrl} className="text-xs font-medium text-cyan-300 hover:text-cyan-200">Open</a></div><pre className="mt-3 max-h-28 overflow-auto rounded-lg bg-black/20 p-3 text-[10px] leading-5 text-slate-500">{preview.preview}</pre></article>; })}</div> : <div className="mt-6"><EmptyResearchState title="No datasets stored" description="Upload a particle tracking dataset to create the input basis for training or inference." /></div>}</section></div></ExperimentGate></>;
}
