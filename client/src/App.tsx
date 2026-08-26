import { Toaster } from "@/components/ui/sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ResearchProvider } from "@/contexts/ResearchContext";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Loader2 } from "lucide-react";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";

const Assistant = lazy(() => import("@/pages/Assistant"));
const Datasets = lazy(() => import("@/pages/Datasets"));
const Findings = lazy(() => import("@/pages/Findings"));
const Models = lazy(() => import("@/pages/Models"));
const Results = lazy(() => import("@/pages/Results"));
const Reproducibility = lazy(() => import("@/pages/Reproducibility"));
const Runs = lazy(() => import("@/pages/Runs"));
const Tracks = lazy(() => import("@/pages/Tracks"));

function AssistantRouteFallback() {
  return <section aria-busy="true" aria-live="polite" className="grid min-h-72 place-items-center rounded-2xl border border-white/8 bg-slate-900/35"><div className="flex items-center gap-3 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin text-cyan-300" />Loading research assistant…</div></section>;
}

function SecondaryRouteFallback() {
  return <section aria-busy="true" aria-live="polite" className="grid min-h-72 place-items-center rounded-2xl border border-white/8 bg-slate-900/35"><div className="flex items-center gap-3 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin text-cyan-300" />Loading research workspace…</div></section>;
}

function ResearchPage({ children }: { children: React.ReactNode }) {
  return <ResearchProvider><DashboardLayout>{children}</DashboardLayout></ResearchProvider>;
}

function Router() {
  return <Switch>
    <Route path="/">{() => <ResearchPage><Home /></ResearchPage>}</Route>
    <Route path="/datasets">{() => <ResearchPage><Suspense fallback={<SecondaryRouteFallback />}><Datasets /></Suspense></ResearchPage>}</Route>
    <Route path="/models">{() => <ResearchPage><Suspense fallback={<SecondaryRouteFallback />}><Models /></Suspense></ResearchPage>}</Route>
    <Route path="/runs">{() => <ResearchPage><Suspense fallback={<SecondaryRouteFallback />}><Runs /></Suspense></ResearchPage>}</Route>
    <Route path="/results">{() => <ResearchPage><Suspense fallback={<SecondaryRouteFallback />}><Results /></Suspense></ResearchPage>}</Route>
    <Route path="/reproducibility">{() => <ResearchPage><Suspense fallback={<SecondaryRouteFallback />}><Reproducibility /></Suspense></ResearchPage>}</Route>
    <Route path="/tracks">{() => <ResearchPage><Suspense fallback={<SecondaryRouteFallback />}><Tracks /></Suspense></ResearchPage>}</Route>
    <Route path="/findings">{() => <ResearchPage><Suspense fallback={<SecondaryRouteFallback />}><Findings /></Suspense></ResearchPage>}</Route>
    <Route path="/assistant">{() => <ResearchPage><Suspense fallback={<AssistantRouteFallback />}><Assistant /></Suspense></ResearchPage>}</Route>
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
