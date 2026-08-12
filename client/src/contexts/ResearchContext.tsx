import { trpc } from "@/lib/trpc";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Experiment = { id: number; title: string; description: string | null };
type ResearchContextValue = {
  experiments: Experiment[];
  selectedExperiment: Experiment | null;
  selectedExperimentId: number | null;
  setSelectedExperimentId: (id: number) => void;
  isLoading: boolean;
  refreshExperiments: () => Promise<unknown>;
};

const ResearchContext = createContext<ResearchContextValue | undefined>(undefined);
const STORAGE_KEY = "particle-research-selected-experiment";

export function ResearchProvider({ children }: { children: React.ReactNode }) {
  const query = trpc.research.experiments.list.useQuery();
  const [selectedExperimentId, setSelectedExperimentId] = useState<number | null>(null);

  useEffect(() => {
    if (!query.data?.length) return;
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    const available = query.data.some(item => item.id === stored) ? stored : query.data[0].id;
    setSelectedExperimentId(current => current ?? available);
  }, [query.data]);

  const chooseExperiment = (id: number) => {
    localStorage.setItem(STORAGE_KEY, String(id));
    setSelectedExperimentId(id);
  };

  const value = useMemo(() => ({
    experiments: query.data ?? [],
    selectedExperiment: query.data?.find(item => item.id === selectedExperimentId) ?? null,
    selectedExperimentId,
    setSelectedExperimentId: chooseExperiment,
    isLoading: query.isLoading,
    refreshExperiments: query.refetch,
  }), [query.data, selectedExperimentId, query.isLoading, query.refetch]);

  return <ResearchContext.Provider value={value}>{children}</ResearchContext.Provider>;
}

export function useResearch() {
  const context = useContext(ResearchContext);
  if (!context) throw new Error("useResearch must be used inside ResearchProvider");
  return context;
}
