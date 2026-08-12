import { EmptyResearchState, ExperimentGate, PageHeading } from "@/components/ResearchShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useResearch } from "@/contexts/ResearchContext";
import { trpc } from "@/lib/trpc";
import { FileJson2, FileSpreadsheet, Files, HardDriveUpload, Loader2 } from "lucide-react";
import { ChangeEvent, useState } from "react";
import { toast } from "sonner";

const formats = { csv: { icon: FileSpreadsheet, label: "CSV" }, json: { icon: FileJson2, label: "JSON" }, hdf5: { icon: Files, label: "HDF5" } };

export default function Datasets() {
  const { selectedExperimentId } = useResearch();
  const datasets = trpc.research.datasets.list.useQuery({ experimentId: selectedExperimentId ?? 1 }, { enabled: Boolean(selectedExperimentId) });
  const [file, setFile] = useState<File | null>(null);
  const upload = trpc.research.datasets.upload.useMutation({ onSuccess: () => { datasets.refetch(); setFile(null); toast.success("Dataset stored securely"); }, onError: error => toast.error(error.message) });
  const selectFile = (event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] ?? null);
  const handleUpload = async () => {
    if (!file || !selectedExperimentId) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    const format = extension === "csv" ? "csv" : extension === "json" ? "json" : extension === "h5" || extension === "hdf5" ? "hdf5" : null;
    if (!format) return toast.error("Only CSV, JSON, and HDF5 datasets are accepted.");
    const reader = new FileReader();
    reader.onload = () => upload.mutate({ experimentId: selectedExperimentId, fileName: file.name, format, base64: String(reader.result) });
    reader.onerror = () => toast.error("Dataset could not be read.");
    reader.readAsDataURL(file);
  };
  return <><PageHeading eyebrow="Research data" title="Dataset library" description="Upload, inspect, and retrieve the source data that grounds every reconstruction and evaluation run." /><ExperimentGate><div className="grid gap-5 xl:grid-cols-[0.86fr_1.4fr]"><section className="rounded-2xl border border-dashed border-cyan-300/25 bg-cyan-300/[0.035] p-6"><HardDriveUpload className="h-7 w-7 text-cyan-300" /><h2 className="mt-5 font-display text-xl font-semibold text-white">Add a tracking dataset</h2><p className="mt-2 text-sm leading-6 text-slate-400">Accepted formats are strictly CSV, JSON, and HDF5. Files are saved to managed research storage.</p><label className="mt-6 flex cursor-pointer items-center justify-center rounded-xl border border-white/12 bg-slate-950/40 px-4 py-7 text-center transition hover:border-cyan-300/50"><span className="text-sm text-slate-300">{file ? file.name : "Select a dataset file"}</span><input type="file" accept=".csv,.json,.h5,.hdf5" onChange={selectFile} className="sr-only" /></label><Button onClick={handleUpload} disabled={!file || upload.isPending} className="mt-3 w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">{upload.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HardDriveUpload className="mr-2 h-4 w-4" />}Store dataset</Button></section><section className="rounded-2xl border border-white/8 bg-slate-900/40 p-6"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Stored files</p><h2 className="mt-1 font-display text-xl font-semibold text-white">Available datasets</h2></div><Badge variant="outline" className="border-white/10 text-slate-400">{datasets.data?.length ?? 0}</Badge></div>{datasets.data?.length ? <div className="mt-5 space-y-3">{datasets.data.map(dataset => { const spec = formats[dataset.format]; const Icon = spec.icon; const preview = JSON.parse(dataset.preview) as { summary: string; preview: string }; return <article key={dataset.id} className="rounded-xl border border-white/8 bg-slate-950/30 p-4"><div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10"><Icon className="h-4 w-4 text-cyan-200" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold text-slate-200">{dataset.name}</h3><Badge className="border border-white/10 bg-white/5 text-[10px] text-slate-300">{spec.label}</Badge></div><p className="mt-1 text-xs text-slate-500">{preview.summary}</p></div><a href={dataset.fileUrl} className="text-xs font-medium text-cyan-300 hover:text-cyan-200">Open</a></div><pre className="mt-3 max-h-28 overflow-auto rounded-lg bg-black/20 p-3 text-[10px] leading-5 text-slate-500">{preview.preview}</pre></article>; })}</div> : <div className="mt-6"><EmptyResearchState title="No datasets stored" description="Upload a particle tracking dataset to create the input basis for training or inference." /></div>}</section></div></ExperimentGate></>;
}
