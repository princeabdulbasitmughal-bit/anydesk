import { EmptyResearchState, ExperimentGate, PageHeading } from "@/components/ResearchShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useResearch } from "@/contexts/ResearchContext";
import { trpc } from "@/lib/trpc";
import { ArrowUp, BrainCircuit, Loader2, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

type AssistantAnswer = { experimentId: number; text: string };

export default function Assistant() {
  const { selectedExperiment, selectedExperimentId } = useResearch();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null);
  useEffect(() => { setAnswer(null); }, [selectedExperimentId]);
  const ask = trpc.research.assistant.ask.useMutation({
    onSuccess: (result, variables) => setAnswer({ experimentId: variables.experimentId, text: result.answer }),
    onError: error => toast.error(error.message),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const sanitizedQuestion = question.trim();
    if (selectedExperimentId && sanitizedQuestion) ask.mutate({ experimentId: selectedExperimentId, question: sanitizedQuestion });
  };
  const visibleAnswer = answer?.experimentId === selectedExperimentId ? answer.text : "";

  return <>
    <PageHeading eyebrow="AI analysis support" title="Research assistant" description="Ask grounded questions about stored experiment records, request cautious hyperparameter ideas, summarize findings, or draft research-paper sections." />
    <ExperimentGate>
      <section className="mx-auto max-w-4xl rounded-3xl border border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(103,232,249,0.10),transparent_28%),rgba(15,23,42,0.55)] p-6 sm:p-8"><div className="flex gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/10"><BrainCircuit className="h-5 w-5 text-cyan-200" /></div><div><p className="font-display text-lg font-semibold text-white">Context-aware support</p><p className="mt-1 text-sm leading-6 text-slate-400">The assistant receives only records attached to <span className="text-slate-200">{selectedExperiment?.title}</span>. It does not invent missing metrics, results, or citations.</p></div></div><form onSubmit={submit} className="mt-7"><Textarea value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask about results, potential hyperparameter changes, an interpretation of findings, or a paper section draft…" className="min-h-32 border-white/10 bg-slate-950/50 p-4 text-sm text-white placeholder:text-slate-600" required /><div className="mt-3 flex items-center justify-between gap-3"><span className="flex items-center gap-1.5 text-xs text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-cyan-300" />Uses stored experiment context</span><Button disabled={ask.isPending || !question.trim()} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{ask.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowUp className="mr-2 h-4 w-4" />}Ask assistant</Button></div></form>{visibleAnswer ? <div className="mt-7 rounded-2xl border border-white/8 bg-slate-950/35 p-5"><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Assistant response</p><div className="prose prose-invert prose-sm max-w-none prose-p:leading-7 prose-headings:font-display"><Streamdown>{visibleAnswer}</Streamdown></div></div> : <div className="mt-7"><EmptyResearchState title="No assistant response for this experiment yet" description="Your first question will be answered against the current experiment's stored data and findings. Responses from another experiment are never reused here." /></div>}</section>
    </ExperimentGate>
  </>;
}
