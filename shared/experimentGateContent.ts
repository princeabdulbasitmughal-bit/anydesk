export type ExperimentGateContent = {
  eyebrow: string;
  title: string;
  description: string;
  artifactLabel: string;
  artifactTitle: string;
  artifactDescription: string;
  markers: readonly string[];
};

const homeGate: ExperimentGateContent = {
  eyebrow: "Research record required",
  title: "Start a traceable reconstruction record",
  description: "Create one experiment to bind its source data, model revisions, execution history, evaluation evidence, reconstructed tracks, and research exports.",
  artifactLabel: "Record pathway",
  artifactTitle: "Nothing is inferred before it is recorded",
  artifactDescription: "The workspace stays intentionally empty until a researcher creates the experiment that will own every downstream artifact.",
  markers: ["Dataset manifest", "Model revision", "Run chronology", "Findings & export"],
};

export const experimentGateContent: Record<string, ExperimentGateContent> = {
  "/": homeGate,
  "/datasets": {
    eyebrow: "Dataset registration",
    title: "Register the evidence before training or inference",
    description: "Create an experiment first, then add one authorized CSV, JSON, or HDF5 dataset to its managed research record.",
    artifactLabel: "Data contract",
    artifactTitle: "Source inputs remain experiment-bound",
    artifactDescription: "Each uploaded file is retained as a managed reference so later runs can be traced back to the exact input record.",
    markers: ["CSV / JSON / HDF5", "25 MiB maximum", "Managed file reference"],
  },
  "/models": {
    eyebrow: "Configuration record",
    title: "Create the experiment that will own model provenance",
    description: "Versioned model identifiers, hyperparameters, model revisions, dataset revisions, seeds, and commands are stored against an experiment.",
    artifactLabel: "Reproducibility chain",
    artifactTitle: "A configuration is evidence, not a preset",
    artifactDescription: "TrackLab keeps the researcher-supplied configuration intact so a later run can be reviewed and repeated without inventing missing context.",
    markers: ["Model revision", "Dataset revision", "Random seed", "Exact command"],
  },
  "/runs": {
    eyebrow: "Execution record",
    title: "Open an experiment before scheduling a traceable run",
    description: "Training and inference are created only from datasets and versioned configurations that belong to a single research record.",
    artifactLabel: "Run lifecycle",
    artifactTitle: "Queued work remains evidence-linked",
    artifactDescription: "Every authorized run is kept in its experiment timeline with one of four recorded states: queued, running, completed, or failed.",
    markers: ["Approved dataset", "Versioned configuration", "Four-status lifecycle"],
  },
  "/results": {
    eyebrow: "Evaluation evidence",
    title: "Create an experiment before inspecting evaluation output",
    description: "Accuracy, efficiency, fake rate, and other result records appear only when they are returned by an authorized experiment run.",
    artifactLabel: "Metric boundary",
    artifactTitle: "No values are shown until a run reports them",
    artifactDescription: "The viewer deliberately avoids synthetic metrics, preserving a clear distinction between configured analysis and actual execution output.",
    markers: ["Run-specific metrics", "Returned output only", "No fabricated values"],
  },
  "/tracks": {
    eyebrow: "Reconstruction evidence",
    title: "Create an experiment before viewing reconstructed trajectories",
    description: "Two-dimensional and isometric projections are populated only from persisted coordinates returned by an authorized inference run.",
    artifactLabel: "Track provenance",
    artifactTitle: "Detector views wait for real coordinates",
    artifactDescription: "TrackLab does not draw illustrative particle tracks in place of output; every plotted point must originate in a stored run record.",
    markers: ["Inference output", "Stored coordinates", "2D and 3D projections"],
  },
  "/findings": {
    eyebrow: "Scientific record",
    title: "Open an experiment before documenting findings",
    description: "Observations, interpretations, limitations, and exported Markdown or PDF reports are kept together inside one traceable research record.",
    artifactLabel: "Reporting path",
    artifactTitle: "Interpretation stays connected to evidence",
    artifactDescription: "Research notes and exports remain linked to the experiment that provides their datasets, run history, and result context.",
    markers: ["Observations", "Limitations", "Markdown export", "PDF export"],
  },
  "/assistant": {
    eyebrow: "Grounded analysis",
    title: "Create an experiment before requesting data-aware support",
    description: "The assistant answers only against the selected experiment's stored records, rather than inventing missing metrics, results, or citations.",
    artifactLabel: "Context boundary",
    artifactTitle: "Grounding begins with an experiment record",
    artifactDescription: "Once an experiment exists, the assistant can safely interpret its retained datasets, configurations, runs, and findings.",
    markers: ["Stored context only", "No invented metrics", "Traceable prompts"],
  },
};

export function getExperimentGateContent(pathname: string): ExperimentGateContent {
  return experimentGateContent[pathname] ?? homeGate;
}
