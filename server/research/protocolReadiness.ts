export type ProtocolReadinessInput = {
  objective?: string | null;
  detectorContext?: string | null;
  evaluationPlan?: string | null;
  acceptanceCriteria?: string | null;
};

const sections: Array<{ id: keyof ProtocolReadinessInput; label: string }> = [
  { id: "objective", label: "Research objective" },
  { id: "detectorContext", label: "Detector context" },
  { id: "evaluationPlan", label: "Evaluation plan" },
  { id: "acceptanceCriteria", label: "Acceptance criteria" },
];

export function buildProtocolReadiness(input?: ProtocolReadinessInput) {
  return sections.map(section => {
    const present = typeof input?.[section.id] === "string" && input[section.id]!.trim().length > 0;
    return { ...section, status: present ? "documented" as const : "missing" as const, detail: present ? "Researcher-authored section recorded." : "No researcher-authored section recorded." };
  });
}
