export type LedgerCheckStatus = "present" | "missing" | "attention";

type LedgerDataset = { id: number; name: string; format: string; byteSize: number; createdAt?: unknown };
type LedgerConfiguration = { id: number; name: string; huggingFaceModelId: string; updatedAt?: unknown };
type LedgerProtocol = { id: number; version: number; createdAt?: unknown };
type LedgerRun = {
  id: number;
  datasetId: number;
  modelConfigurationId: number;
  protocolRevisionId?: number | null;
  runType: string;
  status: "queued" | "running" | "completed" | "failed";
  queuedAt?: unknown;
  startedAt?: unknown;
  completedAt?: unknown;
  huggingFaceJobId?: string | null;
  modelArtifactKey?: string | null;
  errorMessage?: string | null;
};
type LedgerMetric = { accuracy: string | null; efficiency: string | null; fakeRate: string | null; metricPayload?: string | null };
type LedgerFinding = { id: number; updatedAt?: unknown };
type LedgerReport = { id: number; format: string; createdAt?: unknown };

export type ReproducibilityLedgerInput = {
  experiment: { id: number; title: string; description?: string | null; createdAt?: unknown; updatedAt?: unknown };
  datasets: LedgerDataset[];
  configurations: LedgerConfiguration[];
  protocols: LedgerProtocol[];
  runs: LedgerRun[];
  metricsByRun: Record<number, LedgerMetric | undefined>;
  tracksByRun: Record<number, Array<unknown>>;
  finding?: LedgerFinding;
  reports: LedgerReport[];
};

function iso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" && value.trim() ? value : null;
}

function finiteMetric(value: string | null | undefined) {
  if (typeof value !== "string" || !value.trim() || !Number.isFinite(Number(value))) return null;
  return value;
}

function check(id: string, title: string, status: LedgerCheckStatus, detail: string) {
  return { id, title, status, detail };
}

export function buildReproducibilityLedger(input: ReproducibilityLedgerInput) {
  const { datasets, configurations, protocols, runs, metricsByRun, tracksByRun, finding, reports } = input;
  const completedRuns = runs.filter(run => run.status === "completed");
  const runsMissingDataset = runs.filter(run => !datasets.some(dataset => dataset.id === run.datasetId));
  const runsMissingConfiguration = runs.filter(run => !configurations.some(configuration => configuration.id === run.modelConfigurationId));
  const runsMissingProtocol = runs.filter(run => !run.protocolRevisionId || !protocols.some(protocol => protocol.id === run.protocolRevisionId));
  const completedWithoutMetrics = completedRuns.filter(run => !metricsByRun[run.id]);
  const completedWithoutTracks = completedRuns.filter(run => !(tracksByRun[run.id]?.length));
  const checks = [
    check("datasets", "Dataset provenance", datasets.length ? "present" : "missing", datasets.length ? `${datasets.length} uploaded dataset record${datasets.length === 1 ? "" : "s"} linked to this experiment.` : "No uploaded dataset record exists yet."),
    check("configurations", "Model configuration", configurations.length ? "present" : "missing", configurations.length ? `${configurations.length} model configuration record${configurations.length === 1 ? "" : "s"} available for revision tracking.` : "No model configuration record exists yet."),
    check("protocols", "Protocol provenance", protocols.length ? "present" : "missing", protocols.length ? `${protocols.length} researcher-authored protocol revision${protocols.length === 1 ? "" : "s"} recorded before execution review.` : "No researcher-authored protocol revision exists yet."),
    check("run-links", "Run lineage", !runs.length ? "missing" : runsMissingDataset.length || runsMissingConfiguration.length || runsMissingProtocol.length ? "attention" : "present", !runs.length ? "No run has been recorded yet." : runsMissingDataset.length || runsMissingConfiguration.length || runsMissingProtocol.length ? "One or more runs cannot be linked to a currently available dataset, configuration, or protocol revision." : `${runs.length} run${runs.length === 1 ? "" : "s"} retain dataset, configuration, and protocol links.`),
    check("metrics", "Returned metric evidence", !completedRuns.length ? "missing" : completedWithoutMetrics.length ? "attention" : "present", !completedRuns.length ? "No completed run has returned evidence yet." : completedWithoutMetrics.length ? `${completedWithoutMetrics.length} completed run${completedWithoutMetrics.length === 1 ? "" : "s"} ha${completedWithoutMetrics.length === 1 ? "s" : "ve"} no stored metric record.` : "Every completed run has a stored metric record. Values are never inferred by the ledger."),
    check("tracks", "Reconstructed track evidence", !completedRuns.length ? "missing" : completedWithoutTracks.length ? "attention" : "present", !completedRuns.length ? "No completed run is available for track-evidence review." : completedWithoutTracks.length ? `${completedWithoutTracks.length} completed run${completedWithoutTracks.length === 1 ? "" : "s"} ha${completedWithoutTracks.length === 1 ? "s" : "ve"} no stored coordinate record; this is not a physics-quality judgement.` : "Every completed run has stored coordinate evidence."),
    check("findings", "Interpretation record", finding ? "present" : "missing", finding ? "A saved findings record is linked to this experiment." : "No saved findings record exists yet."),
    check("reports", "Export history", reports.length ? "present" : "missing", reports.length ? `${reports.length} research export${reports.length === 1 ? "" : "s"} recorded for this experiment.` : "No Markdown or PDF report export has been recorded yet."),
  ] as const;
  const coverage = checks.filter(item => item.status === "present").length;
  const hasActualEvidence = Boolean(datasets.length || configurations.length || protocols.length || runs.length || finding || reports.length);
  const manifest = {
    schemaVersion: "tracklab-reproducibility-ledger/v2",
    generatedAt: new Date().toISOString(),
    experiment: { id: input.experiment.id, title: input.experiment.title, description: input.experiment.description ?? null, createdAt: iso(input.experiment.createdAt), updatedAt: iso(input.experiment.updatedAt) },
    evidence: {
      datasets: datasets.map(dataset => ({ id: dataset.id, name: dataset.name, format: dataset.format, byteSize: dataset.byteSize, createdAt: iso(dataset.createdAt) })),
      configurations: configurations.map(configuration => ({ id: configuration.id, name: configuration.name, modelReference: configuration.huggingFaceModelId, updatedAt: iso(configuration.updatedAt) })),
      protocols: protocols.map(protocol => ({ id: protocol.id, version: protocol.version, createdAt: iso(protocol.createdAt) })),
      runs: runs.map(run => {
        const metric = metricsByRun[run.id];
        return {
          id: run.id,
          datasetId: run.datasetId,
          modelConfigurationId: run.modelConfigurationId,
          protocolRevisionId: run.protocolRevisionId ?? null,
          runType: run.runType,
          status: run.status,
          queuedAt: iso(run.queuedAt),
          startedAt: iso(run.startedAt),
          completedAt: iso(run.completedAt),
          providerJobRecorded: Boolean(run.huggingFaceJobId),
          modelArtifactRecorded: Boolean(run.modelArtifactKey),
          metricRecord: metric ? { accuracy: finiteMetric(metric.accuracy), efficiency: finiteMetric(metric.efficiency), fakeRate: finiteMetric(metric.fakeRate) } : null,
          reconstructedPointCount: tracksByRun[run.id]?.length ?? 0,
          terminalErrorRecorded: Boolean(run.errorMessage),
        };
      }),
      finding: finding ? { id: finding.id, updatedAt: iso(finding.updatedAt) } : null,
      reports: reports.map(report => ({ id: report.id, format: report.format, createdAt: iso(report.createdAt) })),
    },
    missingEvidence: checks.filter(item => item.status !== "present").map(item => item.title),
  };

  return { checks, coverage, totalChecks: checks.length, hasActualEvidence, manifest };
}
