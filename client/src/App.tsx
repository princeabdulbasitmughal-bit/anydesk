import { Toaster } from "@/components/ui/sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ResearchProvider } from "@/contexts/ResearchContext";
import Datasets from "@/pages/Datasets";
import Findings from "@/pages/Findings";
import Home from "@/pages/Home";
import Models from "@/pages/Models";
import NotFound from "@/pages/NotFound";
import Results from "@/pages/Results";
import Runs from "@/pages/Runs";
import Tracks from "@/pages/Tracks";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Loader2 } from "lucide-react";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";

const Assistant = lazy(() => import("@/pages/Assistant"));

function AssistantRouteFallback() {
  return <section aria-busy="true" aria-live="polite" className="grid min-h-72 place-items-center rounded-2xl border border-white/8 bg-slate-900/35"><div className="flex items-center gap-3 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin text-cyan-300" />Loading research assistant…</div></section>;
}

function ResearchPage({ children }: { children: React.ReactNode }) {
  return <ResearchProvider><DashboardLayout>{children}</DashboardLayout></ResearchProvider>;
}

function Router() {
  return <Switch>
    <Route path="/">{() => <ResearchPage><Home /></ResearchPage>}</Route>
    <Route path="/datasets">{() => <ResearchPage><Datasets /></ResearchPage>}</Route>
    <Route path="/models">{() => <ResearchPage><Models /></ResearchPage>}</Route>
    <Route path="/runs">{() => <ResearchPage><Runs /></ResearchPage>}</Route>
    <Route path="/results">{() => <ResearchPage><Results /></ResearchPage>}</Route>
    <Route path="/tracks">{() => <ResearchPage><Tracks /></ResearchPage>}</Route>
    <Route path="/findings">{() => <ResearchPage><Findings /></ResearchPage>}</Route>
    <Route path="/assistant">{() => <ResearchPage><Suspense fallback={<AssistantRouteFallback />}><Assistant /></Suspense></ResearchPage>}</Route>
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
